import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, RefreshCw, ServerCrash, Signal, Wifi, WifiOff, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { backendUrl } from '@/lib/backend';
import { subscribeBackendEvents } from '@/lib/realtimeEvents';

const rangeOptions = [
  { value: '24h', label: '24h', hours: 24 },
  { value: '72h', label: '72h', hours: 72 },
  { value: '7d', label: '7 dias', hours: 168 },
];

const eventLabels = {
  presence_online: 'Online',
  presence_offline: 'Offline',
  online: 'Online',
  offline: 'Offline',
  reconnect: 'Reconexao',
  timeout: 'Timeout',
};

const eventTone = {
  online: 'monitoring-dot-online',
  presence_online: 'monitoring-dot-online',
  reconnect: 'monitoring-dot-reconnect',
  offline: 'monitoring-dot-offline',
  presence_offline: 'monitoring-dot-offline',
  timeout: 'monitoring-dot-offline',
};

const formatDateTime = (value) => {
  if (!value) return 'Sem comunicacao';
  return new Date(value).toLocaleString('pt-BR');
};

const formatMinutes = (minutes = 0) => {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
};

const parseEventTime = (event = {}) => new Date(event.created_at || event.started_at || 0).getTime();

const getEventKind = (event = {}) => {
  const type = String(event.type || event.event_type || '').toLowerCase();
  if (type.includes('reconnect')) return 'reconnect';
  if (type.includes('timeout')) return 'timeout';
  if (type.includes('offline')) return 'presence_offline';
  if (type.includes('online') || type.includes('heartbeat')) return 'presence_online';
  return type || 'event';
};

const getEventLabel = (event = {}) => {
  const kind = getEventKind(event);
  return eventLabels[kind] || kind.replace(/_/g, ' ');
};

const MonitoringMetric = ({ icon: Icon, label, value, tone = '' }) => (
  <div className="monitoring-metric">
    <div className="min-w-0">
      <p className="monitoring-label">{label}</p>
      <p className="monitoring-value">{value}</p>
    </div>
    <Icon className={`h-5 w-5 flex-none ${tone}`} />
  </div>
);

const AvailabilityRail = ({ timeline = [], range }) => {
  const buckets = useMemo(() => {
    const allBuckets = timeline.flatMap((day) =>
      (day.hours || []).map((bucket) => ({
        ...bucket,
        at: new Date(`${day.date}T${String(bucket.hour).padStart(2, '0')}:00:00.000Z`).getTime(),
      })),
    );
    const cutoff = Date.now() - range.hours * 60 * 60 * 1000;
    return allBuckets.filter((bucket) => bucket.at >= cutoff).slice(-range.hours);
  }, [timeline, range.hours]);

  if (buckets.length === 0) {
    return (
      <div className="monitoring-empty">
        Aguardando heartbeat real para iniciar o historico.
      </div>
    );
  }

  return (
    <div className="monitoring-rail" aria-label="Linha do tempo de disponibilidade">
      {buckets.map((bucket, index) => (
        <span
          key={`${bucket.at}-${index}`}
          title={`${new Date(bucket.at).toLocaleString('pt-BR')} - ${bucket.state}`}
          className={`monitoring-bar monitoring-bar-${bucket.state || 'unknown'}`}
        />
      ))}
    </div>
  );
};

const DeviceMonitoringPanel = ({ device }) => {
  const { session } = useAuth();
  const [monitoring, setMonitoring] = useState(null);
  const [rangeKey, setRangeKey] = useState('24h');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [lastRefreshAt, setLastRefreshAt] = useState('');

  const selectedRange = rangeOptions.find((item) => item.value === rangeKey) || rangeOptions[0];

  const loadMonitoring = async ({ silent = false } = {}) => {
    if (!backendUrl || !device?.id) return;
    if (silent) setRefreshing(true);

    try {
      const response = await fetch(`${backendUrl}/api/devices/${device.id}/monitoring`, {
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(payload.error || 'Nao foi possivel carregar o monitoramento.');

      setMonitoring(payload);
      setLastRefreshAt(new Date().toISOString());
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Nao foi possivel carregar o monitoramento.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMonitoring();

    const polling = window.setInterval(() => loadMonitoring({ silent: true }), 60000);
    const unsubscribe = subscribeBackendEvents({
      onDeviceState: (event) => {
        if (event.device_id === device?.id) window.setTimeout(() => loadMonitoring({ silent: true }), 120);
      },
      onCommandAck: (event) => {
        if (event.device_id === device?.id) window.setTimeout(() => loadMonitoring({ silent: true }), 120);
      },
    });

    return () => {
      window.clearInterval(polling);
      unsubscribe();
    };
  }, [device?.id, session?.access_token]);

  const summary = monitoring?.summary || {};
  const events = useMemo(() => {
    const cutoff = Date.now() - selectedRange.hours * 60 * 60 * 1000;
    return (monitoring?.events || [])
      .filter((event) => parseEventTime(event) >= cutoff)
      .sort((a, b) => parseEventTime(b) - parseEventTime(a));
  }, [monitoring?.events, selectedRange.hours]);
  const reconnects = events.filter((event) => getEventKind(event) === 'reconnect').length;
  const offlineEvents = events.filter((event) => ['presence_offline', 'timeout'].includes(getEventKind(event))).length;
  const telemetryEvents = events.filter((event) => String(event.type || '').includes('telemetry')).length;
  const lastEvent = events[0];

  if (loading) {
    return (
      <section className="monitoring-card">
        <div className="h-5 w-48 animate-pulse rounded bg-white/10" />
        <div className="mt-5 h-28 animate-pulse rounded-xl bg-white/10" />
      </section>
    );
  }

  return (
    <section className="monitoring-card">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="monitoring-kicker">Monitoramento</p>
          <h2 className="monitoring-title">Disponibilidade real</h2>
          <p className="monitoring-copy">
            Baseado apenas em heartbeat, disponibilidade e eventos recebidos do dispositivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`monitoring-status ${summary.online ? 'is-online' : 'is-offline'}`}>
            {summary.online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
            {summary.online ? 'Online' : 'Offline'}
          </span>
          <button
            type="button"
            onClick={() => loadMonitoring({ silent: true })}
            className="monitoring-icon-button"
            aria-label="Atualizar monitoramento"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && <div className="monitoring-alert">{error}</div>}

      <div className="mt-5 flex flex-wrap gap-2">
        {rangeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setRangeKey(option.value)}
            className={`monitoring-range ${rangeKey === option.value ? 'active' : ''}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MonitoringMetric icon={Activity} label="Uptime" value={`${summary.uptime_percent || 0}%`} tone="text-green-300" />
        <MonitoringMetric icon={ServerCrash} label="Offline" value={formatMinutes(summary.offline_minutes || 0)} tone="text-red-300" />
        <MonitoringMetric icon={Zap} label="Quedas" value={offlineEvents || summary.downtime_incidents || 0} tone="text-amber-300" />
        <MonitoringMetric icon={Signal} label="Reconexoes" value={reconnects} tone="text-blue-300" />
      </div>

      <div className="monitoring-section">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="monitoring-section-title">Timeline</h3>
            <p className="monitoring-copy">Verde indica comunicacao ativa, vermelho indica queda ou timeout.</p>
          </div>
          <p className="monitoring-meta">
            Ultima comunicacao: {formatDateTime(summary.last_communication)}
          </p>
        </div>
        <AvailabilityRail timeline={monitoring?.timeline || []} range={selectedRange} />
        <div className="monitoring-legend">
          <span><i className="monitoring-swatch monitoring-swatch-online" /> online</span>
          <span><i className="monitoring-swatch monitoring-swatch-offline" /> offline</span>
          <span><i className="monitoring-swatch monitoring-swatch-unknown" /> sem dado</span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)]">
        <div className="monitoring-section">
          <h3 className="monitoring-section-title">Eventos recentes</h3>
          <div className="mt-4 space-y-2">
            {events.length > 0 ? events.slice(0, 8).map((event) => {
              const kind = getEventKind(event);
              return (
                <div key={event.id || `${kind}-${parseEventTime(event)}`} className="monitoring-event">
                  <span className={`monitoring-dot ${eventTone[kind] || 'monitoring-dot-neutral'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="monitoring-event-title">{getEventLabel(event)}</p>
                    <p className="monitoring-meta">{formatDateTime(event.created_at || event.started_at)}</p>
                  </div>
                </div>
              );
            }) : (
              <div className="monitoring-empty">Nenhum evento real nessa janela.</div>
            )}
          </div>
        </div>

        <div className="monitoring-section">
          <h3 className="monitoring-section-title">Sinal atual</h3>
          <div className="mt-4 space-y-3">
            <div className="monitoring-mini-row">
              <span>Telemetria</span>
              <strong>{telemetryEvents}</strong>
            </div>
            <div className="monitoring-mini-row">
              <span>Ultimo evento</span>
              <strong>{lastEvent ? getEventLabel(lastEvent) : 'Sem evento'}</strong>
            </div>
            <div className="monitoring-mini-row">
              <span>Atualizado</span>
              <strong>{lastRefreshAt ? new Date(lastRefreshAt).toLocaleTimeString('pt-BR') : '-'}</strong>
            </div>
            <div className="monitoring-mini-row">
              <span>Timeout</span>
              <strong>{summary.heartbeat_timeout_ms ? `${Math.round(summary.heartbeat_timeout_ms / 1000)}s` : '-'}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DeviceMonitoringPanel;
