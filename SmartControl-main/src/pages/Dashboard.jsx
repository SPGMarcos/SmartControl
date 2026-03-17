import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import DeviceCard from '@/components/DeviceCard';
import SensorCard from '@/components/SensorCard';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Activity, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';


const Dashboard = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      setLoading(true);

      const { data: devicesData, error: devicesError } = await supabase
        .from('devices')
        .select('*')
        .eq('user_id', user.id);

      if (devicesError) {
        console.error('Error fetching devices:', devicesError);
      } else {
        setDevices(devicesData || []);
        
        if (devicesData && devicesData.length > 0) {
            const deviceIds = devicesData.map(d => d.id);
            const { data: sensorsData, error: sensorsError } = await supabase
                .from('sensors')
                .select('*')
                .in('device_id', deviceIds);

            if (sensorsError) {
                console.error('Error fetching sensors:', sensorsError);
            } else {
                setSensors(sensorsData || []);
            }
        }
      }
      setLoading(false);
    };

    fetchData();
    
    const deviceSub = supabase.channel('public:devices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices', filter: `user_id=eq.${user?.id}` }, payload => {
        fetchData();
      })
      .subscribe();

    const sensorSub = supabase.channel('public:sensors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sensors' }, payload => {
        fetchData();
      })
      .subscribe();

    return () => {
        supabase.removeChannel(deviceSub);
        supabase.removeChannel(sensorSub);
    }

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-white">Carregando...</div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Dashboard - SmartControl</title>
        <meta name="description" content="Painel de controle dos seus dispositivos IoT SmartControl." />
      </Helmet>

      <DashboardLayout>
        <div className="space-y-8">
          <div className="mt-6 mb-6">
            <h1 className="text-3xl font-bold text-white mb-4">
              Bem-vindo, {user?.user_metadata?.full_name || user?.email}!
            </h1>
            <p className="text-gray-400">Gerencie seus dispositivos e monitore sensores em tempo real</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="gradient-card p-6 rounded-xl border border-purple-500/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Dispositivos Ativos</p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {devices.filter(d => d.status).length}
                  </p>
                </div>
                <Zap className="w-12 h-12 text-purple-400" />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="gradient-card p-6 rounded-xl border border-purple-500/30"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total de Dispositivos</p>
                  <p className="text-3xl font-bold text-white mt-2">{devices.length}</p>
                </div>
                <Activity className="w-12 h-12 text-green-400" />
              </div>
            </motion.div>
          </div>

          {devices.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Meus Dispositivos</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {devices.map((device, index) => (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    onToggle={() => handleDeviceToggle(device.id, device.status)}
                    index={index}
                  />
                ))}
              </div>
            </div>
          )}

          {sensors.length > 0 && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Sensores</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {sensors.map((sensor, index) => (
                  <SensorCard key={sensor.id} sensor={sensor} index={index} />
                ))}
              </div>
            </div>
          )}

          {devices.length === 0 && !loading && (
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

export default Dashboard;