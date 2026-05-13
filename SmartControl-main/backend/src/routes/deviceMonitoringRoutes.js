const parseJsonField = (value) => {
  if (!value) return {};
  if (typeof value === 'object') return value;

  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const getPayload = (log = {}) => {
  const raw = parseJsonField(log.payload);
  return raw.payload || raw.full_payload || raw;
};

const getPresenceState = (log = {}) => {
  const type = String(log.type || '').toLowerCase();
  const payload = getPayload(log);
  const statusText = String(
    payload.status ||
    payload.connection_status ||
    payload.availability ||
    payload.online_status ||
    '',
  ).toLowerCase();

  if (
    statusText === 'offline' ||
    statusText === 'unavailable' ||
    payload.online === false ||
    payload.connected === false ||
    payload.connection === false ||
    payload.state === 'offline'
  ) {
    return 'offline';
  }

  if (
    type.includes('heartbeat') ||
    type.includes('telemetry') ||
    type.includes('status') ||
    statusText === 'online' ||
    statusText === 'available' ||
    payload.online === true ||
    payload.connected === true
  ) {
    return 'online';
  }

  return null;
};

const isDeviceOnline = (device, timeoutMs) => {
  const lastHeartbeat = device?.last_heartbeat ? new Date(device.last_heartbeat).getTime() : 0;
  if (!lastHeartbeat) return false;
  return Date.now() - lastHeartbeat < timeoutMs;
};

const formatDayKey = (date) => date.toISOString().slice(0, 10);

const buildEmptyTimeline = ({ now, days = 7 }) => {
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  start.setUTCHours(0, 0, 0, 0);

  return Array.from({ length: days }, (_, dayIndex) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + dayIndex);

    return {
      date: formatDayKey(day),
      label: day.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }),
      hours: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        state: 'unknown',
        events: 0,
      })),
    };
  });
};

const markOfflineFromStaleHeartbeat = ({ timeline, device, timeoutMs, now }) => {
  const lastHeartbeat = device?.last_heartbeat ? new Date(device.last_heartbeat).getTime() : 0;
  if (!lastHeartbeat || now.getTime() - lastHeartbeat < timeoutMs) return;

  const offlineStart = lastHeartbeat + timeoutMs;

  timeline.forEach((day) => {
    day.hours.forEach((bucket) => {
      const bucketStart = new Date(`${day.date}T${String(bucket.hour).padStart(2, '0')}:00:00.000Z`).getTime();
      const bucketEnd = bucketStart + 60 * 60 * 1000;

      if (bucketEnd >= offlineStart && bucketStart <= now.getTime() && bucket.state !== 'online') {
        bucket.state = 'offline';
      }
    });
  });
};

const buildOutages = ({ logs, device, timeoutMs, now }) => {
  const outages = [];
  let openOutage = null;

  logs.forEach((log) => {
    const state = getPresenceState(log);
    if (!state) return;

    const at = log.created_at;
    if (state === 'offline' && !openOutage) {
      openOutage = {
        started_at: at,
        ended_at: null,
      };
    }

    if (state === 'online' && openOutage) {
      openOutage.ended_at = at;
      outages.push(openOutage);
      openOutage = null;
    }
  });

  if (openOutage) outages.push(openOutage);

  const lastHeartbeat = device?.last_heartbeat ? new Date(device.last_heartbeat).getTime() : 0;
  if (!isDeviceOnline(device, timeoutMs) && lastHeartbeat) {
    const staleStart = new Date(lastHeartbeat + timeoutMs).toISOString();
    const lastOpen = outages[outages.length - 1];
    if (!lastOpen || lastOpen.ended_at) {
      outages.push({
        started_at: staleStart,
        ended_at: null,
      });
    }
  }

  return outages
    .map((outage) => {
      const start = new Date(outage.started_at).getTime();
      const end = outage.ended_at ? new Date(outage.ended_at).getTime() : now.getTime();
      return {
        ...outage,
        duration_minutes: Math.max(0, Math.round((end - start) / 60000)),
      };
    })
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
};

export const buildDeviceMonitoring = ({ device, logs = [], timeoutMs }) => {
  const now = new Date();
  const timeline = buildEmptyTimeline({ now, days: 7 });
  const timelineMap = new Map(timeline.map((day) => [day.date, day]));

  logs.forEach((log) => {
    const at = new Date(log.created_at);
    if (Number.isNaN(at.getTime())) return;

    const day = timelineMap.get(formatDayKey(at));
    if (!day) return;

    const bucket = day.hours[at.getUTCHours()];
    const state = getPresenceState(log);
    bucket.events += 1;

    if (state === 'offline') {
      bucket.state = 'offline';
    } else if (state === 'online' && bucket.state !== 'offline') {
      bucket.state = 'online';
    }
  });

  if (isDeviceOnline(device, timeoutMs)) {
    const currentDay = timelineMap.get(formatDayKey(now));
    if (currentDay) currentDay.hours[now.getUTCHours()].state = 'online';
  } else {
    markOfflineFromStaleHeartbeat({ timeline, device, timeoutMs, now });
  }

  const knownBuckets = timeline.flatMap((day) => day.hours).filter((bucket) => bucket.state !== 'unknown');
  const onlineBuckets = knownBuckets.filter((bucket) => bucket.state === 'online').length;
  const offlineBuckets = knownBuckets.filter((bucket) => bucket.state === 'offline').length;
  const uptimePercent = knownBuckets.length > 0 ? Math.round((onlineBuckets / knownBuckets.length) * 1000) / 10 : 0;
  const outages = buildOutages({ logs, device, timeoutMs, now });

  return {
    summary: {
      online: isDeviceOnline(device, timeoutMs),
      last_communication: device.last_heartbeat || device.updated_at || null,
      uptime_percent: uptimePercent,
      offline_minutes: offlineBuckets * 60,
      downtime_incidents: outages.length,
      longest_outage_minutes: outages.reduce((max, outage) => Math.max(max, outage.duration_minutes), 0),
      heartbeat_timeout_ms: timeoutMs,
    },
    timeline,
    outages: outages.slice(0, 12),
    generated_at: now.toISOString(),
  };
};

export const registerDeviceMonitoringRoutes = (app, {
  supabase,
  resolveAuthorizedDevice,
  deviceHeartbeatTimeoutMs,
}) => {
  app.get('/api/devices/:id/monitoring', async (req, res) => {
    const resolved = await resolveAuthorizedDevice(req, res, { dbId: req.params.id, deviceId: req.params.id });
    if (!resolved) return;

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const { data, error } = await supabase
      .from('logs')
      .select('id,type,payload,created_at')
      .eq('device_id', resolved.device.id)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: true })
      .limit(1000);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.json(buildDeviceMonitoring({
      device: resolved.device,
      logs: data || [],
      timeoutMs: deviceHeartbeatTimeoutMs,
    }));
  });
};
