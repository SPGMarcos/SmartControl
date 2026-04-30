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
    mqttTopic: '',
  });

  const deviceTypes = [
    { value: 'relay', label: 'Relé / Válvula' },
    { value: 'light', label: 'Iluminação' },
    { value: 'motor', label: 'Motor / Bomba' },
    { value: 'sensor', label: 'Sensor' },
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

    const basePayload = {
      user_id: user.id,
      name: safeName,
      type: formData.type,
      mqtt_topic: safeMqttTopic,
    };

    const professionalPayload = {
      ...basePayload,
      project_name: safeProjectName,
      project_type: selectedProject?.type || 'custom',
      device_model: formData.deviceModel,
      protocol: formData.protocol,
      connection_status: 'offline',
      pairing_status: 'manual',
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
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

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
                    <Label htmlFor="mqttTopic" className="text-white">Tópico MQTT</Label>
                    <Input
                      id="mqttTopic"
                      name="mqttTopic"
                      value={formData.mqttTopic}
                      onChange={handleChange}
                      className="mt-2 bg-black/50 border-purple-500/30 text-white"
                      placeholder="smartcontrol/dispositivo/controle"
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
