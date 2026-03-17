import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import DeviceCard from '@/components/DeviceCard';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const Devices = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDevices = async () => {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching devices:', error);
      } else {
        setDevices(data);
      }
      setLoading(false);
    };

    fetchDevices();
  }, [user]);

  const handleDeviceToggle = async (deviceId, currentStatus) => {
    const { data, error } = await supabase
      .from('devices')
      .update({ status: !currentStatus })
      .eq('id', deviceId)
      .select()
      .single();

    if (error) {
      console.error('Error toggling device:', error);
    } else {
      setDevices(devices.map(d => (d.id === deviceId ? data : d)));
    }
  };

  const handleDeviceDelete = async (deviceId) => {
    const { error } = await supabase
      .from('devices')
      .delete()
      .eq('id', deviceId);

    if (error) {
      toast({
        title: "Erro ao deletar",
        description: "Não foi possível remover o dispositivo.",
        variant: "destructive",
      });
    } else {
      setDevices(devices.filter(d => d.id !== deviceId));
      toast({
        title: "Dispositivo removido!",
        description: "O dispositivo foi removido com sucesso.",
      });
    }
  };

  return (
    <>
      <Helmet>
        <title>Dispositivos - SmartControl</title>
        <meta name="description" content="Gerencie todos os seus dispositivos IoT SmartControl." />
      </Helmet>

      <DashboardLayout>
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Dispositivos</h1>
              <p className="text-gray-400">Gerencie todos os seus dispositivos IoT</p>
            </div>
            <Link to="/add-device">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Dispositivo
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-white">Carregando dispositivos...</div>
          ) : devices.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device, index) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onToggle={() => handleDeviceToggle(device.id, device.status)}
                  onDelete={() => handleDeviceDelete(device.id)}
                  index={index}
                  showDelete
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20 gradient-card rounded-xl border border-purple-500/30"
            >
              <p className="text-gray-400 text-lg mb-4">
                Você ainda não tem dispositivos cadastrados
              </p>
              <Link to="/add-device">
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Dispositivo
                </Button>
              </Link>
            </motion.div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
};

export default Devices;