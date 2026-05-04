import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ArrowLeft, Layers, ShieldCheck, Wifi } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import HydroponicsDevicePanel from '@/components/HydroponicsDevicePanel';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { buildMqttTopics, buildDeviceExternalId } from '@/lib/mqttTopics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { getDeviceModelLabel, getDeviceProtocolLabel, getDeviceProjectName, isDeviceOnline } from '@/lib/deviceProjects';
import { isHydroponicsDevice } from '@/lib/hydroponicsHeltec';

const DeviceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [command, setCommand] = useState('request_status');
  const [sending, setSending] = useState(false);

  const fetchDevice = async () => {
    if (!user || !id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      toast({
        variant: 'destructive',
        title: 'Dispositivo não encontrado',
        description: 'Verifique se o dispositivo ainda está cadastrado.',
      });
      navigate('/devices');
      return;
    }

    setDevice(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchDevice();
  }, [user, id]);

  const sendDeviceCommand = async (commandPayload) => {
    if (!device) return;
    setSending(true);

    const backendUrl = import.meta.env.VITE_BACKEND_URL || '';
    if (!backendUrl) {
      toast({
        variant: 'destructive',
        title: 'Backend não configurado',
        description: 'Configure VITE_BACKEND_URL para enviar comandos MQTT.',
      });
      setSending(false);
      return;
    }

    const endpoint = commandPayload?.useConfigTopic
      ? `/api/devices/${device.id}/config`
      : '/api/command';

    const response = await fetch(`${backendUrl.replace(/\/+$/, '')}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify(commandPayload?.useConfigTopic
        ? {
            ...(commandPayload?.payload || {}),
            user_id: user?.id,
          }
        : {
            device_id: device.id,
            command: commandPayload?.command || commandPayload,
            payload: commandPayload?.payload || {},
            module: commandPayload?.module,
            user_id: user?.id,
          }),
    });

    const payload = await response.json();
    if (!response.ok) {
      toast({
        variant: 'destructive',
        title: 'Falha ao enviar comando',
        description: payload.error || 'Tente novamente mais tarde.',
      });
      setSending(false);
      return;
    }

    toast({
      title: commandPayload?.useConfigTopic ? 'ConfiguraÃ§Ã£o enviada' : 'Comando enviado',
      description: commandPayload?.useConfigTopic
        ? `Ajustes enviados para ${device.name}.`
        : `Comando '${commandPayload?.command || commandPayload}' enviado para ${device.name}.`,
    });
    setSending(false);
  };

  const handleSendCommand = async (event) => {
    event.preventDefault();
    await sendDeviceCommand({ command: command.trim() });
  };

  if (loading || !device) {
    return (
      <DashboardLayout>
        <div className="text-white">Carregando detalhes do dispositivo...</div>
      </DashboardLayout>
    );
  }

  const topics = buildMqttTopics({
    client: device.user_id || user?.id,
    project: device.project_name || device.project || 'default',
    deviceId: device.device_id || device.id,
    customTopic: device.mqtt_topic,
  });

  const online = isDeviceOnline(device);
  const hydroponicsDevice = isHydroponicsDevice(device);

  return (
    <>
      <Helmet>
        <title>{device.name} - SmartControl</title>
        <meta
          name="description"
          content={`Detalhes do dispositivo ${device.name} na plataforma SmartControl.`}
        />
      </Helmet>

      <DashboardLayout>
        <div className="space-y-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
          </Button>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="gradient-card rounded-3xl border border-purple-500/30 p-8"
            >
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.3em] text-purple-300">Detalhes do dispositivo</p>
                  <h1 className="mt-3 text-4xl font-bold text-white">{device.name}</h1>
                  <p className="mt-2 text-gray-400 max-w-2xl">
                    Painel de controle do dispositivo, com informações de autenticação, MQTT em nuvem e telemetria.
                  </p>
                </div>
                <div className="rounded-3xl border border-purple-400/20 bg-black/30 p-5">
                  <p className="text-sm text-gray-400">Status de conexão</p>
                  <p className="mt-2 text-2xl font-bold text-white">{online ? 'Online' : 'Offline'}</p>
                  <p className="text-sm text-gray-500 mt-1">Última atualização: {device.last_heartbeat ? new Date(device.last_heartbeat).toLocaleString('pt-BR') : 'Nenhuma'}</p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Modelo</p>
                  <p className="mt-2 text-lg text-white">{getDeviceModelLabel(device)}</p>
                </div>
                <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Protocolo</p>
                  <p className="mt-2 text-lg text-white">{getDeviceProtocolLabel(device)}</p>
                </div>
                <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">ID do dispositivo</p>
                  <p className="mt-2 text-lg text-white">{device.device_id || buildDeviceExternalId({ name: device.name, uniqueSuffix: device.id.slice(0, 4) })}</p>
                </div>
                <div className="rounded-3xl border border-purple-500/20 bg-black/30 p-6">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Token / API key</p>
                  <p className="mt-2 text-sm text-gray-200 break-all">{device.device_token || 'Não configurado'}</p>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-purple-500/20 bg-black/30 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-purple-300" />
                  <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Tópicos MQTT</p>
                </div>
                <div className="grid gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Comando</p>
                    <p className="text-sm text-white break-all">{topics.command}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="text-sm text-white break-all">{topics.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Telemetria</p>
                    <p className="text-sm text-white break-all">{topics.telemetry}</p>
                  </div>
                </div>
              </div>
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="gradient-card rounded-3xl border border-purple-500/30 p-8"
            >
              <div className="flex items-center gap-3 text-gray-300 mb-6">
                <Wifi className="w-5 h-5 text-purple-300" />
                <h2 className="text-lg font-semibold text-white">Acionamento remoto</h2>
              </div>

              <form onSubmit={handleSendCommand} className="space-y-5">
                <div>
                  <Label htmlFor="command" className="text-white">Comando MQTT</Label>
                  <Input
                    id="command"
                    name="command"
                    value={command}
                    onChange={(event) => setCommand(event.target.value)}
                    placeholder="toggle, on, off, status"
                    className="mt-2 bg-black/50 border-purple-500/30 text-white"
                  />
                </div>
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={sending}>
                  {sending ? 'Enviando...' : 'Enviar Comando'}
                </Button>
              </form>

              <div className="mt-8 rounded-3xl border border-purple-500/20 bg-black/30 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-purple-300" />
                  <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Integração</p>
                </div>
                <p className="text-sm text-gray-400">
                  Esta página prepara o dispositivo para comunicação MQTT em nuvem e mostra os tópicos que devem ser utilizados pelo ESP32, ESP8266, ESP-01, LoRa e módulos de relé/sensores.
                </p>
              </div>
            </motion.section>
          </div>

          {hydroponicsDevice && (
            <HydroponicsDevicePanel
              device={device}
              topics={topics}
              onCommand={sendDeviceCommand}
              onConfig={(configPayload) => sendDeviceCommand({ command: 'remote_config', payload: configPayload, useConfigTopic: true })}
            />
          )}
        </div>
      </DashboardLayout>
    </>
  );
};

export default DeviceDetail;
