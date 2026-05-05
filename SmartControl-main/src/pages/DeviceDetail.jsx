import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit3, Layers, Save, ShieldCheck, Wifi, X } from 'lucide-react';
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
import { applyHydroponicsCommandState, isHydroponicsDevice } from '@/lib/hydroponicsHeltec';
import { backendUrl } from '@/lib/backend';

const DeviceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [command, setCommand] = useState('request_status');
  const [sending, setSending] = useState(false);
  const [editingConnection, setEditingConnection] = useState(false);
  const [connectionData, setConnectionData] = useState({
    device_id: '',
    mac_address: '',
    ip_address: '',
    mqtt_topic: '',
  });
  const optimisticDeviceRef = useRef(null);

  const fetchDevice = async ({ showLoader = false } = {}) => {
    if (!user || !id) return;
    if (showLoader) setLoading(true);
    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      if (!showLoader) return;
      toast({
        variant: 'destructive',
        title: 'Dispositivo não encontrado',
        description: 'Verifique se o dispositivo ainda está cadastrado.',
      });
      navigate('/devices');
      return;
    }

    const optimisticDevice = optimisticDeviceRef.current;
    if (optimisticDevice) {
      const remoteTime = new Date(data.last_heartbeat || data.updated_at || data.created_at || 0).getTime();
      const optimisticTime = new Date(optimisticDevice.last_heartbeat || optimisticDevice.updated_at || 0).getTime();

      if (Date.now() - optimisticTime > 12000 || remoteTime >= optimisticTime) {
        optimisticDeviceRef.current = null;
        setDevice(data);
      } else {
        setDevice({
          ...data,
          ...optimisticDevice,
        });
      }
    } else {
      setDevice(data);
    }
    setConnectionData({
      device_id: data.device_id || '',
      mac_address: data.mac_address || '',
      ip_address: data.ip || '',
      mqtt_topic: data.mqtt_topic || '',
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchDevice({ showLoader: true });

    const polling = window.setInterval(() => {
      fetchDevice();
    }, 3000);

    return () => window.clearInterval(polling);
  }, [user, id]);

  const sendDeviceCommand = async (commandPayload) => {
    if (!device) return;
    setSending(true);

    const optimisticDevice = applyHydroponicsCommandState(device, commandPayload);
    const hasOptimisticUpdate = optimisticDevice !== device;

    if (hasOptimisticUpdate) {
      optimisticDeviceRef.current = optimisticDevice;
      setDevice(optimisticDevice);
    }

    const restoreDevice = () => {
      optimisticDeviceRef.current = null;
      if (hasOptimisticUpdate) setDevice(device);
    };

    if (!backendUrl) {
      restoreDevice();
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

    const response = await fetch(`${backendUrl}${endpoint}`, {
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
      restoreDevice();
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

  const handleSaveConnection = async () => {
    if (!device) return;
    setSending(true);

    const { error } = await supabase
      .from('devices')
      .update({
        device_id: connectionData.device_id || null,
        mac_address: connectionData.mac_address || null,
        ip: connectionData.ip_address || null,
        mqtt_topic: connectionData.mqtt_topic || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', device.id);

    setSending(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar os dados de conexão.',
      });
    } else {
      toast({
        title: 'Dados atualizados',
        description: 'As informações de conexão foram salvas com sucesso.',
      });
      setEditingConnection(false);
      fetchDevice({ showLoader: false });
    }
  };

  const handleCancelEdit = () => {
    setConnectionData({
      device_id: device?.device_id || '',
      mac_address: device?.mac_address || '',
      ip_address: device?.ip || '',
      mqtt_topic: device?.mqtt_topic || '',
    });
    setEditingConnection(false);
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

              <div className="mt-8 rounded-3xl border border-purple-500/20 bg-black/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-purple-300" />
                    <p className="text-sm uppercase tracking-[0.2em] text-gray-500">Dados de conexão</p>
                  </div>
                  {!editingConnection ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingConnection(true)}
                      className="border-purple-500/30 bg-black/30 text-gray-300 hover:bg-purple-600/20 hover:text-white"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        className="border-gray-500/30 bg-black/30 text-gray-300 hover:bg-gray-600/20"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveConnection}
                        disabled={sending}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {sending ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  )}
                </div>

                {!editingConnection ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-xs text-gray-500">ID do dispositivo</p>
                      <p className="text-sm text-white">{connectionData.device_id || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">MAC Address</p>
                      <p className="text-sm text-white">{connectionData.mac_address || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Endereço IP</p>
                      <p className="text-sm text-white">{connectionData.ip_address || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Tópico MQTT personalizado</p>
                      <p className="text-sm text-white break-all">{connectionData.mqtt_topic || 'Padrão do sistema'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="device_id" className="text-white">ID do dispositivo</Label>
                      <Input
                        id="device_id"
                        value={connectionData.device_id}
                        onChange={(e) => setConnectionData(prev => ({ ...prev, device_id: e.target.value }))}
                        placeholder="Identificador único do dispositivo"
                        className="mt-2 bg-black/50 border-purple-500/30 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">Use MAC address ou ID único para identificação</p>
                    </div>
                    <div>
                      <Label htmlFor="mac_address" className="text-white">MAC Address</Label>
                      <Input
                        id="mac_address"
                        value={connectionData.mac_address}
                        onChange={(e) => setConnectionData(prev => ({ ...prev, mac_address: e.target.value }))}
                        placeholder="AA:BB:CC:DD:EE:FF"
                        className="mt-2 bg-black/50 border-purple-500/30 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ip_address" className="text-white">Endereço IP</Label>
                      <Input
                        id="ip_address"
                        value={connectionData.ip_address}
                        onChange={(e) => setConnectionData(prev => ({ ...prev, ip_address: e.target.value }))}
                        placeholder="192.168.1.100"
                        className="mt-2 bg-black/50 border-purple-500/30 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">Endereço IP local (não é identificador principal)</p>
                    </div>
                    <div>
                      <Label htmlFor="mqtt_topic" className="text-white">Tópico MQTT personalizado</Label>
                      <Input
                        id="mqtt_topic"
                        value={connectionData.mqtt_topic}
                        onChange={(e) => setConnectionData(prev => ({ ...prev, mqtt_topic: e.target.value }))}
                        placeholder="smartcontrol/meu-topico"
                        className="mt-2 bg-black/50 border-purple-500/30 text-white"
                      />
                      <p className="text-xs text-gray-400 mt-1">Deixe vazio para usar tópico padrão</p>
                    </div>
                  </div>
                )}
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
