import { getAvailabilityState } from '../protocols/smartcontrolProtocol.js';

const PRESENCE_EVENT_TYPES = new Set(['status', 'telemetry', 'heartbeat', 'ack', 'availability']);
const STATE_REPLACEMENT_EVENT_TYPES = new Set(['status', 'telemetry', 'heartbeat']);

export const resolvePresence = ({ eventType, payload = {} }) => {
  const availabilityState = getAvailabilityState(eventType, payload);
  const isPresenceEvent = PRESENCE_EVENT_TYPES.has(eventType) || availabilityState !== null;

  if (!isPresenceEvent) {
    return {
      isPresenceEvent: false,
      online: null,
      source: eventType,
      offlineReason: null,
      refreshHeartbeat: false,
    };
  }

  const online = availabilityState === false ? false : true;

  return {
    isPresenceEvent: true,
    online,
    source: eventType,
    offlineReason: online ? null : payload.reason || payload.offline_reason || 'mqtt_lwt',
    refreshHeartbeat: online,
  };
};

export const buildPresenceUpdate = ({
  eventType,
  payload = {},
  previousLastState = {},
  previousTelemetry = {},
  now,
}) => {
  const presence = resolvePresence({ eventType, payload });

  if (!presence.isPresenceEvent) {
    return {
      presence,
      update: {},
    };
  }

  const basePresence = {
    online: presence.online,
    connection_status: presence.online ? 'online' : 'offline',
    last_seen: now,
    last_seen_at: now,
    presence_source: presence.source,
    offline_reason: presence.offlineReason,
  };

  if (presence.online) {
    basePresence.last_online_at = now;
    basePresence.last_heartbeat_at = now;
  } else {
    basePresence.last_offline_at = now;
  }

  const replacesDeviceState = STATE_REPLACEMENT_EVENT_TYPES.has(eventType);
  const nextLastState = replacesDeviceState
    ? {
        ...payload,
        ...basePresence,
      }
    : {
        ...previousLastState,
        ...basePresence,
        last_ack: eventType === 'ack' ? payload : previousLastState.last_ack,
        last_availability: eventType === 'availability' ? payload : previousLastState.last_availability,
      };

  const nextTelemetry = replacesDeviceState
    ? {
        ...payload,
        ...basePresence,
      }
    : {
        ...previousTelemetry,
        ...basePresence,
        last_ack: eventType === 'ack' ? payload : previousTelemetry.last_ack,
        last_availability: eventType === 'availability' ? payload : previousTelemetry.last_availability,
      };

  const update = {
    connection_status: presence.online ? 'online' : 'offline',
    online: presence.online,
    last_state: nextLastState,
    telemetry: nextTelemetry,
  };

  if (presence.refreshHeartbeat) {
    update.last_heartbeat = now;
  }

  return {
    presence,
    update,
  };
};

export const isHeartbeatStale = (lastHeartbeat, timeoutMs, nowMs = Date.now()) => {
  if (!lastHeartbeat) return false;
  const heartbeatMs = new Date(lastHeartbeat).getTime();
  if (!Number.isFinite(heartbeatMs)) return false;
  return heartbeatMs < nowMs - timeoutMs;
};
