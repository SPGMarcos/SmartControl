import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Cpu, Plus, ShieldCheck, Search, Check } from 'lucide-react';
import { deviceModelOptions, projectTemplates, protocolOptions } from '@/lib/deviceProjects';
import { buildDeviceExternalId, buildMqttTopics, generateDeviceToken } from '@/lib/mqttTopics';
import {
  HYDROPONICS_CAPABILITIES,
  HYDROPONICS_DEFAULT_FIRMWARE,
  HYDROPONICS_DEVICE_TYPE,
  HYDROPONICS_ESP32_MODULE_TYPE,
  HYDROPONICS_MODULE_TYPE,
} from '@/lib/hydroponicsHeltec';
import { sanitizeText } from '@/lib/security';
import { discoverDevices, mapDiscoveredDataToForm } from '@/lib/deviceDiscovery';
import { deviceKindTemplates, getDeviceKindTemplate } from '@/lib/deviceTemplates';
import { fetchBillingJson } from '@/lib/billing';
import { useSubscription } from '@/hooks/useSubscription';

const AddDevice = () => {
  const { user, session } = useAuth();
  const { currentPlan, limits, refresh: refreshSubscription } = useSubscription();
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
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [discoveredDevicesList, setDiscoveredDevicesList] = useState([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [showDiscoveredDevices, setShowDiscoveredDevices] = useState(false);
  const [selectedDiscoveredDevice, setSelectedDiscoveredDevice] = useState(null);

  const handleDiscoverDevices = async () => {
    setIsDiscovering(true);
    try {
      const devices = await discoverDevices();
      setDiscoveredDevicesList(devices);
      setShowDiscoveredDevices(true);

      if (devices.length === 0) {
        toast({
          title: 'Nenhum dispositivo descoberto',
          description: 'Certifique-se de que o ESP está conectado ao MQTT e enviando heartbeat.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: `${devices.length} dispositivo(s) descoberto(s)!`,
          description: 'Selecione um para preencher automaticamente o formulário.',
        });
      }
    } catch (error) {
      console.error('Erro na descoberta:', error);
      toast({
        title: 'Erro na descoberta',
        description: 'Não foi possível buscar dispositivos descobertos.',
        variant: 'destructive',
      });
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSelectDiscoveredDevice = (device) => {
    const mappedData = mapDiscoveredDataToForm(device);
    setFormData((current) => ({
      ...current,
      ...mappedData,
    }));
    setSelectedDiscoveredDevice(device.device_id);
    setShowDiscoveredDevices(false);
    toast({
      title: 'Dispositivo selecionado!',
      description: `Os dados de "${device.device_id}" foram carregados automaticamente.`,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const safeName = sanitizeText(formData.name, 80);
    const safeProjectName = sanitizeText(formData.projectName, 80);
    const safeMqttTopic = sanitizeText(formData.mqttTopic, 120);
    const selectedProject = projectTemplates.find((project) => project.name === safeProjectName);
    const selectedDeviceTemplate = getDeviceKindTemplate(formData.type);

    if (!safeName) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe um nome para o dispositivo.',
        variant: 'destructive',
      });
      return;
    }

    if (!limits.can_add_device) {
      toast({
        title: 'Limite do plano atingido',
        description: `Seu plano ${currentPlan.name} permite ${limits.device_limit} dispositivo(s). Faca upgrade em Minha Assinatura.`,
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
    const hydroponicsModuleType =
      formData.deviceModel === HYDROPONICS_MODULE_TYPE
        ? HYDROPONICS_MODULE_TYPE
        : formData.type === HYDROPONICS_DEVICE_TYPE
          ? HYDROPONICS_ESP32_MODULE_TYPE
          : 'generic_iot';
    const isHydroponicsModule = formData.type === HYDROPONICS_DEVICE_TYPE;
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
      module_type: hydroponicsModuleType,
      local_ip: safeLocalIp,
      mdns_hostname: safeMdnsHostname,
      capabilities: isHydroponicsModule ? HYDROPONICS_CAPABILITIES : {},
      configuration: {
        dashboard_template: selectedDeviceTemplate.dashboard,
        allowed_commands: selectedDeviceTemplate.commands,
        mqtt_topics: topics,
        local_dashboard: safeLocalIp || safeMdnsHostname || null,
        pairing: {
          mode: 'manual',
          token_created_at: new Date().toISOString(),
        },
      },
      last_state: isHydroponicsModule
        ? {
            t24: false,
            v1: false,
            v2: true,
            tOn: 10,
            tOff: 10,
            rem: 0,
          }
        : {},
    };

    try {
      await fetchBillingJson('/api/devices', {
        token: session?.access_token,
        method: 'POST',
        body: professionalPayload,
      });
      refreshSubscription();
      toast({
        title: 'Dispositivo adicionado!',
        description: `${safeName} foi vinculado ao projeto ${safeProjectName}.`,
      });
      navigate('/devices');
    } catch (error) {
      toast({
        title: 'Erro ao adicionar dispositivo',
        description: error.message,
        variant: 'destructive',
      });
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
          hardwareVersion: current.hardwareVersion || 'ESP32 LoRa',
          mdnsHostname: current.mdnsHostname || 'smarthidroponia.local',
        };
      }

      if (name === 'type' && value === HYDROPONICS_DEVICE_TYPE) {
        return {
          ...next,
          projectName: 'Hidroponia inteligente',
          deviceModel: current.deviceModel && current.deviceModel !== HYDROPONICS_MODULE_TYPE
            ? current.deviceModel
            : 'esp32',
          protocol: 'mqtt',
          firmwareVersion: current.firmwareVersion || HYDROPONICS_DEFAULT_FIRMWARE,
          hardwareVersion: current.hardwareVersion || 'ESP32',
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
        <div className="mx-auto w-full max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h1 className="theme-title text-3xl font-bold mb-2">Adicionar Dispositivo</h1>
              <p className="theme-muted">
                Apenas os dados essenciais são necessários para cadastrar o dispositivo. O restante é gerado automaticamente pelo backend e pela firmware.
              </p>
            </div>

            <div className={`rounded-2xl border p-4 text-sm ${
              limits.can_add_device
                ? 'border-purple-400/30 bg-purple-500/10 text-purple-100'
                : 'border-amber-400/30 bg-amber-500/10 text-amber-100'
            }`}>
              Plano atual: <strong>{currentPlan.name}</strong> - {limits.devices_used}/{limits.device_limit} dispositivo(s) usados.
              {!limits.can_add_device && ' Faca upgrade em Minha Assinatura para cadastrar novos dispositivos.'}
            </div>

            <form onSubmit={handleSubmit} className="theme-card mobile-card space-y-6 rounded-xl p-4 sm:p-8">
              <div className="theme-panel rounded-2xl p-4 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="theme-title text-lg font-semibold">Descoberta automática de dispositivos</h3>
                    <p className="theme-muted text-sm mt-1">Se seu ESP está conectado ao MQTT, clique para descobri-lo automaticamente.</p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleDiscoverDevices}
                    disabled={isDiscovering}
                    className="w-full shrink-0 sm:w-auto"
                  >
                    <Search className="w-4 h-4 mr-2" />
                    {isDiscovering ? 'Buscando...' : 'Descobrir agora'}
                  </Button>
                </div>

                {showDiscoveredDevices && discoveredDevicesList.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="theme-muted text-sm">Dispositivos disponíveis:</p>
                    {discoveredDevicesList.map((device) => (
                      <motion.button
                        key={device.device_id}
                        type="button"
                        onClick={() => handleSelectDiscoveredDevice(device)}
                        className={`w-full rounded-lg border p-3 text-left transition-all ${
                          selectedDiscoveredDevice === device.device_id
                            ? 'border-[var(--input-focus-border)] bg-[var(--badge-bg)]'
                            : 'border-[var(--panel-border)] bg-[var(--panel-bg)] hover:border-[var(--input-focus-border)]'
                        }`}
                      >
                        <div className="flex flex-col gap-3 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between">
                          <div className="min-w-0">
                            <p className="theme-title font-medium">{device.device_id}</p>
                            <p className="theme-muted text-xs">{device.ip} • {device.mac_address}</p>
                          </div>
                          {selectedDiscoveredDevice === device.device_id && (
                            <Check className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Nome do Dispositivo</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="mt-2"
                    placeholder="Ex: Bomba Poço Principal"
                  />
                </div>

                <div>
                  <Label htmlFor="projectName">Projeto / Linha de automação</Label>
                  <select
                    id="projectName"
                    name="projectName"
                    value={formData.projectName}
                    onChange={handleChange}
                    className="theme-field mt-2 w-full rounded-md border px-3 py-2"
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
                  <Label htmlFor="type">Tipo de Dispositivo</Label>
                  <select
                    id="type"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="theme-field mt-2 w-full rounded-md border px-3 py-2"
                  >
                    {deviceKindTemplates.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced((current) => !current)}
                    className="theme-link text-left text-sm font-medium transition"
                  >
                    {showAdvanced ? 'Ocultar opções avançadas' : 'Mostrar opções avançadas'}
                  </button>
                </div>
              </div>

              {showAdvanced && (
                  <div className="theme-panel space-y-6 rounded-2xl p-4 sm:p-6">
                  <p className="theme-muted text-sm">
                    Estas informações são opcionais. Se você estiver usando firmware e backend SmartControl recentes, elas serão preenchidas automaticamente.
                  </p>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="deviceModel">Hardware físico</Label>
                      <select
                        id="deviceModel"
                        name="deviceModel"
                        value={formData.deviceModel}
                        onChange={handleChange}
                        className="theme-field mt-2 w-full rounded-md border px-3 py-2"
                      >
                        {deviceModelOptions.map((model) => (
                          <option key={model.value} value={model.value}>
                            {model.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label htmlFor="protocol">Protocolo principal</Label>
                      <select
                        id="protocol"
                        name="protocol"
                        value={formData.protocol}
                        onChange={handleChange}
                        className="theme-field mt-2 w-full rounded-md border px-3 py-2"
                      >
                        {protocolOptions.map((protocol) => (
                          <option key={protocol.value} value={protocol.value}>
                            {protocol.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="deviceId">ID do Dispositivo</Label>
                      <Input
                        id="deviceId"
                        name="deviceId"
                        value={formData.deviceId}
                        onChange={handleChange}
                        className="mt-2"
                        placeholder="Se vazio, será gerado automaticamente"
                      />
                    </div>
                    <div>
                      <Label htmlFor="macAddress">MAC Address</Label>
                      <Input
                        id="macAddress"
                        name="macAddress"
                        value={formData.macAddress}
                        onChange={handleChange}
                        className="mt-2"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="firmwareVersion">Firmware</Label>
                      <Input
                        id="firmwareVersion"
                        name="firmwareVersion"
                        value={formData.firmwareVersion}
                        onChange={handleChange}
                        className="mt-2"
                        placeholder="Ex: v1.0.0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="hardwareVersion">Versão do Hardware</Label>
                      <Input
                        id="hardwareVersion"
                        name="hardwareVersion"
                        value={formData.hardwareVersion}
                        onChange={handleChange}
                        className="mt-2"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="mqttBroker">Broker MQTT</Label>
                      <Input
                        id="mqttBroker"
                        name="mqttBroker"
                        value={formData.mqttBroker}
                        onChange={handleChange}
                        className="mt-2"
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mqttTopic">Tópico MQTT</Label>
                      <Input
                        id="mqttTopic"
                        name="mqttTopic"
                        value={formData.mqttTopic}
                        onChange={handleChange}
                        className="mt-2"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <Label htmlFor="localIp">IP local</Label>
                      <Input
                        id="localIp"
                        name="localIp"
                        value={formData.localIp}
                        onChange={handleChange}
                        className="mt-2"
                        placeholder="Opcional"
                      />
                    </div>
                    <div>
                      <Label htmlFor="mdnsHostname">mDNS local</Label>
                      <Input
                        id="mdnsHostname"
                        name="mdnsHostname"
                        value={formData.mdnsHostname}
                        onChange={handleChange}
                        className="mt-2"
                        placeholder="Opcional"
                      />
                    </div>
                  </div>

                  <div className="theme-panel rounded-xl p-4">
                    <Label htmlFor="deviceToken">Token do Dispositivo</Label>
                    <Input
                      id="deviceToken"
                      name="deviceToken"
                      value={formData.deviceToken}
                      readOnly
                      className="mt-2"
                    />
                  </div>
                </div>
              )}

              <div className="theme-panel rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="theme-icon mt-0.5 h-5 w-5" />
                  <p className="theme-muted text-sm leading-6">
                    Apenas as informações essenciais são necessárias. O restante é preenchido automaticamente pelo backend e pela firmware SmartControl.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
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
