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
import { Plus } from 'lucide-react';

const AddDevice = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    type: 'relay',
    mqttTopic: '',
  });

  const deviceTypes = [
    { value: 'relay', label: 'Relé / Válvula' },
    { value: 'light', label: 'Iluminação' },
    { value: 'motor', label: 'Motor' },
    { value: 'sensor', label: 'Sensor' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from('devices')
      .insert({
        user_id: user.id,
        name: formData.name,
        type: formData.type,
        mqtt_topic: formData.mqttTopic,
      });

    if (error) {
      toast({
        title: "Erro ao adicionar dispositivo",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Dispositivo adicionado!",
        description: `${formData.name} foi configurado com sucesso.`,
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
        <div className="max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Adicionar Dispositivo</h1>
              <p className="text-gray-400">Configure um novo dispositivo IoT</p>
            </div>

            <form onSubmit={handleSubmit} className="gradient-card p-8 rounded-xl border border-purple-500/30 space-y-6">
              <div>
                <Label htmlFor="name" className="text-white">Nome do Dispositivo</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-2 bg-black/50 border-purple-500/30 text-white"
                  placeholder="Ex: Válvula Jardim"
                />
              </div>

              <div>
                <Label htmlFor="type" className="text-white">Tipo de Dispositivo</Label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  className="mt-2 w-full bg-black/50 border border-purple-500/30 text-white rounded-md px-3 py-2"
                >
                  {deviceTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-purple-500/30 pt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Configuração MQTT</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="mqttTopic" className="text-white">Tópico MQTT</Label>
                    <Input
                      id="mqttTopic"
                      name="mqttTopic"
                      value={formData.mqttTopic}
                      onChange={handleChange}
                      className="mt-2 bg-black/50 border-purple-500/30 text-white"
                      placeholder="smartcontrol/device/1"
                    />
                  </div>
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