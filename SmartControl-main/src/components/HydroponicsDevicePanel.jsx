import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Clock3,
  Cpu,
  Droplets,
  Gauge,
  History,
  Power,
  RefreshCw,
  Router,
  Settings,
  ShieldCheck,
  Waves,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  buildHydroponicsCommand,
  formatHydroponicsTimer,
  getHydroponicsLocalUrl,
  normalizeHydroponicsState,
} from '@/lib/hydroponicsHeltec';
import { isDeviceOnline } from '@/lib/deviceProjects';

const StatusPill = ({ online }) => (
  <span
    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
      online
        ? 'border-green-400/30 bg-green-500/10 text-green-300'
        : 'border-gray-500/30 bg-gray-500/10 text-gray-400'
    }`}
  >
    <span className={`h-2 w-2 rounded-full ${online ? 'bg-green-400' : 'bg-gray-500'}`} />
    {online ? 'Online' : 'Offline'}
  </span>
);

const MetricBox = ({ label, value, icon: Icon }) => (
  <div className="rounded-2xl border border-purple-500/20 bg-black/30 p-4">
    <div className="mb-3 flex items-center gap-2 text-gray-400">
      <Icon className="h-4 w-4 text-purple-300" />
      <span className="text-[11px] uppercase tracking-[0.18em]">{label}</span>
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);

const HydroponicsDevicePanel = ({ device, topics, onCommand, onConfig, compact = false }) => {
  const state = useMemo(() => normalizeHydroponicsState(device), [device]);
  const [timerValues, setTimerValues] = useState({
    tOn: state.tOn,
    tOff: state.tOff,
  });
  const [busyCommand, setBusyCommand] = useState('');
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    setTimerValues({
      tOn: state.tOn,
      tOff: state.tOff,
    });
  }, [state.tOn, state.tOff]);

  useEffect(() => {
    setNowTick(Date.now());

    if (!state.t24) return undefined;

    const timer = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [state.t24, state.rem, state.lastSeen]);

  const online = isDeviceOnline(device) || state.online;
  const stateAgeSeconds = state.lastSeen
    ? Math.max(0, Math.floor((nowTick - new Date(state.lastSeen).getTime()) / 1000))
    : 0;
  const visibleRemaining = state.t24 ? Math.max(0, state.rem - stateAgeSeconds) : 0;
  const timerLabel = state.t24 ? (state.v1 ? 'Bomba ativa' : 'Bomba em repouso') : 'Modo manual';
  const timerTone = state.v1 ? 'text-green-300' : 'text-amber-300';
  const localDashboardUrl = getHydroponicsLocalUrl(device);
  const localSettingsUrl = getHydroponicsLocalUrl(device, '/settings');

  const sendCommand = async (command, payload = {}) => {
    if (!onCommand) return;
    setBusyCommand(command);
    await onCommand(buildHydroponicsCommand(command, payload));
    setBusyCommand('');
  };

  const sendConfig = async (payload = {}) => {
    if (!onConfig) return false;
    setBusyCommand('set_config');
    await onConfig(payload);
    setBusyCommand('');
    return true;
  };

  const handleTimerSave = () => {
    const tOn = Math.max(1, Number(timerValues.tOn) || 10);
    const tOff = Math.max(1, Number(timerValues.tOff) || 10);
    if (!onConfig) {
      sendCommand('set_timers', { tOn, tOff });
      return;
    }
    sendConfig({ tOn, tOff });
  };

  const handleFactoryReset = () => {
    const confirmed = window.confirm(
      'Restaurar o padrao de fabrica apaga Wi-Fi e configuracoes locais do dispositivo. Deseja enviar este comando?'
    );
    if (confirmed) sendCommand('factory_reset', { confirm: true });
  };

  return (
    <section className="gradient-card rounded-3xl border border-purple-500/30 p-5 sm:p-7">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300">
              <Waves className="h-4 w-4" />
              Hidroponia Inteligente
            </span>
            <StatusPill online={online} />
          </div>
          <h2 className="text-2xl font-bold text-white sm:text-3xl">{device.name}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            Painel integrado do Heltec ESP32 LoRa mantendo a mesma lógica local: bomba, oxigenador,
            modo automático, temporizador ON/OFF, dashboard embarcada, OTA, WiFiManager e MQTT Cloud.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => sendCommand('request_status')}
          disabled={busyCommand === 'request_status'}
          variant="outline"
          className="border-purple-500/30 bg-black/30 text-gray-300 hover:bg-purple-600/20 hover:text-white"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Sincronizar status
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-5 sm:p-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="rounded-2xl border border-blue-400/30 bg-blue-500/10 p-3">
                <Gauge className="h-6 w-6 text-blue-300" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gray-500">Estado do sistema</p>
                <p className="text-lg font-semibold text-white">Controle de fluxo</p>
              </div>
            </div>
            <Switch
              checked={state.t24}
              onCheckedChange={(checked) => sendCommand('set_auto', { enabled: checked })}
            />
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500" htmlFor={`ton-${device.id}`}>
                Minutos ON
              </label>
              <Input
                id={`ton-${device.id}`}
                type="number"
                min="1"
                value={timerValues.tOn}
                onChange={(event) => setTimerValues((current) => ({ ...current, tOn: event.target.value }))}
                className="mt-3 bg-black/40 border-purple-500/30 text-white"
              />
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <label className="text-xs uppercase tracking-[0.2em] text-gray-500" htmlFor={`toff-${device.id}`}>
                Minutos OFF
              </label>
              <Input
                id={`toff-${device.id}`}
                type="number"
                min="1"
                value={timerValues.tOff}
                onChange={(event) => setTimerValues((current) => ({ ...current, tOff: event.target.value }))}
                className="mt-3 bg-black/40 border-purple-500/30 text-white"
              />
            </div>
          </div>

          <div className="mb-6 rounded-3xl border border-blue-500/30 bg-blue-500/10 p-5 text-center">
            <p className={`text-xs font-bold uppercase tracking-[0.25em] ${timerTone}`}>{timerLabel}</p>
            <p className="mt-3 font-mono text-5xl font-bold text-white">{formatHydroponicsTimer(visibleRemaining)}</p>
          </div>

          <div className="space-y-4 border-t border-purple-500/20 pt-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Droplets className="h-6 w-6 text-blue-300" />
                <div>
                  <p className="font-semibold text-white">Bomba d'Água</p>
                  <p className="text-xs text-gray-500">{state.t24 ? 'Controlada pelo temporizador' : 'Controle manual liberado'}</p>
                </div>
              </div>
              <Switch
                checked={state.v1}
                disabled={state.t24}
                onCheckedChange={(checked) => sendCommand('set_relay', { relay: 'pump', value: checked })}
              />
            </div>

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Activity className="h-6 w-6 text-blue-300" />
                <div>
                  <p className="font-semibold text-white">Oxigenador</p>
                  <p className="text-xs text-gray-500">{state.t24 ? 'Mantido ligado no modo automático' : 'Controle manual liberado'}</p>
                </div>
              </div>
              <Switch
                checked={state.v2}
                disabled={state.t24}
                onCheckedChange={(checked) => sendCommand('set_relay', { relay: 'oxygenator', value: checked })}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              onClick={handleTimerSave}
              disabled={busyCommand === 'set_timers' || busyCommand === 'set_config'}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              <Clock3 className="mr-2 h-4 w-4" />
              Salvar tempos
            </Button>
            {localSettingsUrl && (
              <a href={localSettingsUrl} target="_blank" rel="noreferrer" className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-purple-500/30 bg-black/30 text-gray-300 hover:bg-purple-600/20 hover:text-white"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Ajustes locais
                </Button>
              </a>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <MetricBox icon={Power} label="Modo" value={state.t24 ? 'Automático' : 'Manual'} />
            <MetricBox icon={History} label="Última conexão" value={state.lastSeen ? new Date(state.lastSeen).toLocaleString('pt-BR') : 'Aguardando'} />
            {!compact && <MetricBox icon={Cpu} label="Firmware" value={state.firmwareVersion} />}
            {!compact && <MetricBox icon={Router} label="Rede local" value={state.ip || state.mdns || 'Não informado'} />}
          </div>

          {!compact && (
            <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-5">
              <div className="mb-4 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-purple-300" />
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Integração MQTT</p>
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-gray-500">Comandos</p>
                  <p className="break-all text-gray-200">{topics?.command || 'Configure o tópico MQTT do dispositivo.'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="break-all text-gray-200">{topics?.status || 'Aguardando tópico.'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Heartbeat</p>
                  <p className="break-all text-gray-200">{topics?.heartbeat || 'Aguardando tópico.'}</p>
                </div>
              </div>
            </div>
          )}

          {!compact && (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-5">
              <p className="text-sm font-semibold text-red-200">Manutenção avançada</p>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                O reset de fábrica deve ser usado apenas durante reinstalação, pois apaga Wi-Fi e configuração MQTT local.
              </p>
              <Button
                type="button"
                onClick={handleFactoryReset}
                variant="outline"
                className="mt-4 border-red-500/30 bg-black/30 text-red-200 hover:bg-red-500/10 hover:text-red-100"
              >
                Restaurar padrão de fábrica
              </Button>
              {localDashboardUrl && (
                <a href={localDashboardUrl} target="_blank" rel="noreferrer" className="mt-3 block text-sm text-purple-300 hover:text-purple-200">
                  Abrir dashboard embarcada local
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default HydroponicsDevicePanel;
