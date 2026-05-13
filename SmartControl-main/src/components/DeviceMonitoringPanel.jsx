import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Clock3, ServerCrash, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { backendUrl } from '@/lib/backend';
import { subscribeBackendEvents } from '@/lib/realtimeEvents';

const stateClass = {
  online: 'bg-green-400/80 shadow-green-400/20',
  offline: 'bg-red-400/80 shadow-red-400/20',
  unknown: 'bg-white/10',
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

const MonitoringTile = ({ icon: Icon, label, value, accent = 'text-purple-300' }) => (
  <div className="rounded-2xl border border-purple-500/20 bg-black/25 p-4">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="mt-2 break-words text-2xl font-bold text-white">{value}</p>
      </div>
      <Icon className={`h-7 w-7 flex-none ${accent}`} />
    </div>
  </div>
);

const DeviceMonitoringPanel = ({ device }) => {
  const { session } = useAuth();
  const [monitoring, setMonitoring] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadMonitoring = async () => {
    if (!backendUrl || !device?.id) return;

    try {
      const response = await fetch(`${backendUrl}/api/devices/${device.id}/monitoring`, {
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(payload.error || 'Nao foi possivel carregar o monitoramento.');

      setMonitoring(payload);
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Nao foi possivel carregar o monitoramento.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonitoring();

    const polling = window.setInterval(loadMonitoring, 15000);
    const unsubscribe = subscribeBackendEvents({
      onDeviceState: (event) => {
        if (event.device_id === device?.id) window.setTimeout(loadMonitoring, 120);
      },
      onCommandAck: (event) => {
        if (event.device_id === device?.id) window.setTimeout(loadMonitoring, 120);
      },
    });

    return () => {
      window.clearInterval(polling);
      unsubscribe();
    };
  }, [device?.id, session?.access_token]);

  const hourLabels = useMemo(() => Array.from({ length: 24 }, (_, hour) => hour), []);

  if (loading) {
    return (
      <section className="gradient-card mobile-card rounded-2xl border border-purple-500/30 p-4 sm:rounded-3xl sm:p-8">
        <div className="h-6 w-52 animate-pulse rounded bg-white/10" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-2xl bg-white/10" />
          ))}
        </div>
      </section>
    );
  }

  const summary = monitoring?.summary || {};

  return (
    <section className="gradient-card mobile-card rounded-2xl border border-purple-500/30 p-4 sm:rounded-3xl sm:p-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.25em] text-purple-300">Monitoramento individual</p>
          <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">Saude operacional do dispositivo</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            Uptime, quedas e comunicacao MQTT/WebSocket concentrados neste dispositivo.
          </p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-sm ${
          summary.online ? 'border-green-400/30 bg-green-500/10 text-green-100' : 'border-red-400/30 bg-red-500/10 text-red-100'
        }`}>
          {summary.online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {summary.online ? 'Online agora' : 'Offline agora'}
        </span>
      </div>

      {error && (
        <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MonitoringTile icon={Activity} label="Uptime 7 dias" value={`${summary.uptime_percent || 0}%`} accent="text-green-300" />
        <MonitoringTile icon={ServerCrash} label="Tempo offline" value={formatMinutes(summary.offline_minutes || 0)} accent="text-red-300" />
        <MonitoringTile icon={Clock3} label="Ultima comunicacao" value={formatDateTime(summary.last_communication)} accent="text-blue-300" />
        <MonitoringTile icon={WifiOff} label="Quedas registradas" value={summary.downtime_incidents || 0} accent="text-amber-300" />
      </div>

      <div className="mt-8 rounded-2xl border border-purple-500/20 bg-black/25 p-4">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Mapa semanal de disponibilidade</h3>
            <p className="text-sm text-gray-400">Cada bloco representa uma hora; vermelho destaca periodos offline.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-green-400" /> online</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-red-400" /> offline</span>
            <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-white/20" /> sem dado</span>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[780px]">
            <div className="grid grid-cols-[72px_repeat(24,minmax(20px,1fr))] gap-1 text-[11px] text-gray-500">
              <div />
              {hourLabels.map((hour) => (
                <div key={hour} className="text-center">
                  {[0, 6, 12, 18, 23].includes(hour) ? `${hour}h` : ''}
                </div>
              ))}
            </div>

            <div className="mt-2 space-y-1">
              {(monitoring?.timeline || []).map((day) => (
                <div key={day.date} className="grid grid-cols-[72px_repeat(24,minmax(20px,1fr))] gap-1">
                  <div className="flex items-center truncate pr-2 text-xs font-medium uppercase text-gray-400">
                    {day.label}
                  </div>
                  {day.hours.map((bucket) => (
                    <span
                      key={`${day.date}-${bucket.hour}`}
                      title={`${day.date} ${String(bucket.hour).padStart(2, '0')}:00 - ${bucket.state}`}
                      className={`h-6 rounded-sm shadow-sm ${stateClass[bucket.state] || stateClass.unknown}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-purple-500/20 bg-black/25 p-4">
        <h3 className="text-lg font-semibold text-white">Historico de quedas</h3>
        <div className="mt-4 space-y-3">
          {(monitoring?.outages || []).length > 0 ? monitoring.outages.map((outage) => (
            <div key={`${outage.started_at}-${outage.ended_at || 'open'}`} className="flex flex-col gap-2 rounded-xl bg-black/25 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">
                  Inicio: {formatDateTime(outage.started_at)}
                </p>
                <p className="text-xs text-gray-400">
                  Fim: {outage.ended_at ? formatDateTime(outage.ended_at) : 'Ainda offline ou aguardando novo heartbeat'}
                </p>
              </div>
              <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-100">
                {formatMinutes(outage.duration_minutes)}
              </span>
            </div>
          )) : (
            <p className="rounded-xl bg-black/25 p-3 text-sm text-gray-400">
              Nenhuma queda detectada nos ultimos 7 dias.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default DeviceMonitoringPanel;
