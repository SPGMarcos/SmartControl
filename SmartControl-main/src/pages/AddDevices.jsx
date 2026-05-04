import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Cpu, Plus, ShieldCheck } from 'lucide-react';
import { deviceModelOptions, projectTemplates, protocolOptions } from '@/lib/deviceProjects';
import { buildDeviceExternalId, buildMqttTopics, generateDeviceToken } from '@/lib/mqttTopics';
import {
  HYDROPONICS_CAPABILITIES,
  HYDROPONICS_DEFAULT_FIRMWARE,
  HYDROPONICS_DEVICE_TYPE,
  HYDROPONICS_MODULE_TYPE,
} from '@/lib/hydroponicsHeltec';
import { sanitizeText } from '@/lib/security';

const AddDevice = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    type: 'relay',
    projectName: projectTemplates[0].name,
    deviceModel: 'esp32',
    protocol: 'mqtt',
    mqttBroker: '',
    mqttTopic: '',
    deviceId: '',
    macAddress: '',
    firmwareVersion: '',
    hardwareVersion: '',
    localIp: '',
    mdnsHostname: '',
    deviceToken: generateDeviceToken(),
  });

  const deviceTypes = [
    { value: 'relay', label: 'Relé / Válvula' },
    { value: 'light', label: 'Iluminação' },
    { value: 'motor', label: 'Motor / Bomba' },
    { value: 'sensor', label: 'Sensor' },
    { value: HYDROPONICS_DEVICE_TYPE, label: 'Hidroponia inteligente' },
  ];

  const shouldRetryWithoutNewColumns = (error) => {
    const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
    return message.includes('column') || message.includes('schema') || message.includes('cache');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const safeName = sanitizeText(formData.name, 80);
    const safeProjectName = sanitizeText(formData.projectName, 80);
    const safeMqttTopic = sanitizeText(formData.mqttTopic, 120);
    const selectedProject = projectTemplates.find((project) => project.name === safeProjectName);

    if (!safeName) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe um nome para o dispositivo.',
        variant: 'destructive',
      });
      return;
    }

    const safeDeviceId = sanitizeText(formData.deviceId, 80) || buildDeviceExternalId({ name: safeName, uniqueSuffix: Date.now().toString().slice(-4) });
    const safeMacAddress = sanitizeText(formData.macAddress, 40);
    const safeFirmware = sanitizeText(formData.firmwareVersion, 40);
    const safeHardware = sanitizeText(formData.hardwareVersion, 40);
    const safeLocalIp = sanitizeText(formData.localIp, 60);
    const safeMdnsHostname = sanitizeText(formData.mdnsHostname, 80);
    const safeMqttBroker = sanitizeText(formData.mqttBroker, 120);
    const safeDeviceToken = sanitizeText(formData.deviceToken, 120);
    const isHydroponicsModule =
      formData.type === HYDROPONICS_DEVICE_TYPE || formData.deviceModel === HYDROPONICS_MODULE_TYPE;
    const topics = buildMqttTopics({
      client: user.id,
      project: safeProjectName,
      deviceId: safeDeviceId,
      customTopic: safeMqttTopic,
    });

    const basePayload = {
      user_id: user.id,
      name: safeName,
      type: formData.type,
      device_id: safeDeviceId,
      mac_address: safeMacAddress,
      firmware_version: safeFirmware,
      hardware_version: safeHardware,
      mqtt_broker: safeMqttBroker,
      mqtt_topic: topics.root,
      device_token: safeDeviceToken,
    };

    const professionalPayload = {
      ...basePayload,
      project_name: safeProjectName,
      project_type: selectedProject?.type || 'custom',
      device_model: formData.deviceModel,
      protocol: formData.protocol,
      connection_status: 'offline',
      pairing_status: 'manual',
      module_type: isHydroponicsModule ? HYDROPONICS_MODULE_TYPE : 'generic_iot',
      local_ip: safeLocalIp,
      mdns_hostname: safeMdnsHostname,
      capabilities: isHydroponicsModule ? HYDROPONICS_CAPABILITIES : {},
      configuration: {
        mqtt_topics: topics,
        local_dashboard: safeLocalIp || safeMdnsHostname || null,
        pairing: {
          mode: 'manual',
          token_created_at: new Date().toISOString(),
        },
      },
      last_state: isHydroponicsModule
        ? {
            t24: true,
            v1: true,
            v2: true,
            tOn: 10,
            tOff: 10,
            rem: 0,
          }
        : {},
    };

    let { error } = await supabase
      .from('devices')
      .insert(professionalPayload);

    if (error && shouldRetryWithoutNewColumns(error)) {
      const fallback = await supabase
        .from('devices')
        .insert(basePayload);
      error = fallback.error;
    }

    if (error) {
      toast({
        title: 'Erro ao adicionar dispositivo',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Dispositivo adicionado!',
        description: `${safeName} foi vinculado ao projeto ${safeProjectName}.`,
      });
      navigate('/devices');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((current) => {
      const next = {
        ...current,
        [name]: value,
      };

      if (name === 'deviceModel' && value === HYDROPONICS_MODULE_TYPE) {
        return {
          ...next,
          name: current.name || 'Hidroponia Heltec LoRa',
          type: HYDROPONICS_DEVICE_TYPE,
          projectName: 'Hidroponia inteligente',
          protocol: 'mqtt',
          deviceId: current.deviceId || 'hidroponia01',
          firmwareVersion: current.firmwareVersion || HYDROPONICS_DEFAULT_FIRMWARE,
          hardwareVersion: current.hardwareVersion || 'Heltec ESP32 LoRa V2',
          mdnsHostname: current.mdnsHostname || 'smarthidroponia.local',
        };
      }

      if (name === 'type' && value === HYDROPONICS_DEVICE_TYPE) {
        return {
          ...next,
          projectName: 'Hidroponia inteligente',
          deviceModel: HYDROPONICS_MODULE_TYPE,
          protocol: 'mqtt',
          firmwareVersion: current.firmwareVersion || HYDROPONICS_DEFAULT_FIRMWARE,
          hardwareVersion: current.hardwareVersion || 'Heltec ESP32 LoRa V2',
          mdnsHostname: current.mdnsHostname || 'smarthidroponia.local',
        };
      }

      return next;
    });
  };

  const topicPreview = buildMqttTopics({
    client: user?.id || 'cliente',
    project: formData.projectName,
    deviceId: formData.deviceId || 'hidroponia01',
    customTopic: formData.mqttTopic,
  });

  return (
    <>
      <Helmet>
        <title>Adicionar Dispositivo - SmartControl</title>
        <meta name="description" content="Configure um novo dispositivo IoT na plataforma SmartControl." />
      </Helmet>

      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Adicionar Dispositivo</h1>
              <p className="text-gray-400">
                Vincule ESP32, ESP8266, ESP-01, LoRa, relés, sensores e módulos personalizados a um projeto.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="gradient-card p-8 rounded-xl border border-purple-500/30 space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="name" className="text-white">Nome do Dispositivo</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="mt-2 bg-black/50 border-purple-500/30 text-white"
                    placeholder="Ex: Bomba Poço Principal"
                  />
                </div>

                <div>
                  <Label htmlFor="projectName" className="text-white">Projeto / Linha de automação</Label>
                  <select
                    id="projectName"
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleChange}
                    className="mt-2 w-full bg-black/50 border border-purple-500/30 text-white rounded-md px-3 py-2"
                  >
                    {projectTemplates.map((project) => (
                      <option key={project.name} value={project.name}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="type" className="text-white">Tipo de Dispositivo</Label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="mt-2 w-full bg-black/50 border border-purple-500/30 text-white rounded-md px-3 py-2"
                  >
                    {deviceTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="deviceModel" className="text-white">Hardware físico</Label>
                  <select
                    id="deviceModel"
                    name="deviceModel"
                    value={formData.deviceModel}
                    onChange={handleChange}
                    className="mt-2 w-full bg-black/50 border border-purple-500/30 text-white rounded-md px-3 py-2"
                  >
                    {deviceModelOptions.map((model) => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="deviceId" className="text-white">ID do Dispositivo</Label>
                  <Input
                    id="deviceId"
                    name="deviceId"
                    value={formData.deviceId}
                    onChange={handleChange}
                    className="mt-2 bg-black/50 border-purple-500/30 text-white"
                    placeholder="Ex: bomba-poço-1"
                  />
                </div>
                <div>
                  <Label htmlFor="macAddress" className="text-white">MAC Address</Label>
                  <Input
                    id="macAddress"
                    name="macAddress"
                    value={formData.macAddress}
                    onChange={handleChange}
                    className="mt-2 bg-black/50 border-purple-500/30 text-white"
                    placeholder="Ex: AA:BB:CC:DD:EE:FF"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="firmwareVersion" className="text-white">Firmware</Label>
                  <Input
                    id="firmwareVersion"
                    name="firmwareVersion"
                    value={formData.firmwareVersion}
                    onChange={handleChange}
                    className="mt-2 bg-black/50 border-purple-500/30 text-white"
                    placeholder="Ex: v1.0.0"
                  />
                </div>
                <div>
                  <Label htmlFor="hardwareVersion" className="text-white">Versão do Hardware</Label>
                  <Input
                    id="hardwareVersion"
                    name="hardwareVersion"
                    value={formData.hardwareVersion}
                    onChange={handleChange}
                    className="mt-2 bg-black/50 border-purple-500/30 text-white"
                    placeholder="Ex: ESP32 DevKit v4"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="mqttBroker" className="text-white">Broker MQTT</Label>
                  <Input
                    id="mqttBroker"
                    name="mqttBroker"
                    value={formData.mqttBroker}
                    onChange={handleChange}
                    className="mt-2 bg-black/50 border-purple-500/30 text-white"
                    placeholder="wss://broker.emqx.io:8084/mqtt"
                  />
                </div>
                <div>
                  <Label htmlFor="mqttTopic" className="text-white">Tópico MQTT</Label>
                  <Input
                    id="mqttTopic"
                    name="mqttTopic"
                    value={formData.mqttTopic}
                    onChange={handleChange}
                    className="mt-2 bg-black/50 border-purple-500/30 text-white"
                    placeholder="smartcontrol/cliente/projeto/dispositivo"
                  />
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="localIp" className="text-white">IP local</Label>
                  <Input
                    id="localIp"
                    name="localIp"
                    value={formData.localIp}
                    onChange={handleChange}
                    className="mt-2 bg-black/50 border-purple-500/30 text-white"
                    placeholder="Ex: 192.168.1.80"
                  />
                </div>
                <div>
                  <Label htmlFor="mdnsHostname" className="text-white">mDNS local</Label>
                  <Input
                    id="mdnsHostname"
                    name="mdnsHostname"
                    value={formData.mdnsHostname}
                    onChange={handleChange}
                    className="mt-2 bg-black/50 border-purple-500/30 text-white"
                    placeholder="smarthidroponia.local"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-purple-500/20 bg-black/30 p-4">
                <Label htmlFor="deviceToken" className="text-white">Token do Dispositivo</Label>
                <Input
                  id="deviceToken"
                  name="deviceToken"
                  value={formData.deviceToken}
                  readOnly
                  className="mt-2 bg-black/40 border-purple-500/30 text-white"
                />
              </div>

              <div className="rounded-xl border border-purple-500/20 bg-black/30 p-4">
                <p className="text-sm font-semibold text-white">Tópicos MQTT gerados</p>
                <div className="mt-3 grid gap-3 text-sm text-gray-300">
                  <p className="break-all"><span className="text-gray-500">CMD:</span> {topicPreview.command}</p>
                  <p className="break-all"><span className="text-gray-500">STATUS:</span> {topicPreview.status}</p>
                  <p className="break-all"><span className="text-gray-500">HEARTBEAT:</span> {topicPreview.heartbeat}</p>
                </div>
              </div>

              <div className="border-t border-purple-500/30 pt-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="rounded-xl border border-purple-400/30 bg-purple-500/10 p-3">
                    <Cpu className="h-5 w-5 text-purple-300" />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Integração e comunicação</h3>
                    <p className="text-sm text-gray-400">Base preparada para MQTT, ESPHome, API local, Home Assistant e LoRa.</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="protocol" className="text-white">Protocolo principal</Label>
                    <select
                      id="protocol"
                      name="protocol"
                      value={formData.protocol}
                      onChange={handleChange}
                      className="mt-2 w-full bg-black/50 border border-purple-500/30 text-white rounded-md px-3 py-2"
                    >
                      {protocolOptions.map((protocol) => (
                        <option key={protocol.value} value={protocol.value}>
                          {protocol.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="mqttCommandTopicPreview" className="text-white">Tópico final de comando</Label>
                    <Input
                      id="mqttCommandTopicPreview"
                      value={topicPreview.command}
                      readOnly
                      className="mt-2 bg-black/50 border-purple-500/30 text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-purple-500/20 bg-black/30 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-purple-300" />
                  <p className="text-sm leading-6 text-gray-400">
                    O dispositivo será criado em modo offline/manual. A próxima etapa é parear via token, MQTT,
                    ESPHome ou Home Assistant quando a estrutura backend estiver disponível.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Dispositivo
              </Button>
            </form>
          </motion.div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default AddDevice;
