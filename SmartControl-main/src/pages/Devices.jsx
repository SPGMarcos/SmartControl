import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import DeviceCard from '@/components/DeviceCard';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { Button } from '@/components/ui/button';
import { Layers, Plus } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { groupDevicesByProject } from '@/lib/deviceProjects';
import { subscribeBackendEvents } from '@/lib/realtimeEvents';

const Devices = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = useCallback(async ({ showLoader = false } = {}) => {
    if (!user) return;
    if (showLoader) setLoading(true);

    const { data, error } = await supabase
      .from('devices')
      .select('*')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching devices:', error);
    } else {
      setDevices(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    fetchDevices({ showLoader: true });

    const polling = window.setInterval(() => {
      fetchDevices();
    }, 3000);

    const deviceSub = supabase.channel('devices-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices', filter: `user_id=eq.${user?.id}` }, () => {
        fetchDevices();
      })
      .subscribe();

    const unsubscribeBackendEvents = subscribeBackendEvents({
      onDeviceState: (event) => {
        if (!event.user_id || event.user_id === user?.id) fetchDevices();
      },
      onDeviceDiscovered: () => {
        fetchDevices();
      },
    });

    return () => {
      window.clearInterval(polling);
      supabase.removeChannel(deviceSub);
      unsubscribeBackendEvents();
    };
  }, [fetchDevices, user?.id]);

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
      setDevices((currentDevices) => currentDevices.map((device) => (device.id === deviceId ? data : device)));
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
      setDevices((currentDevices) => currentDevices.filter((device) => device.id !== deviceId));
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
        <div className="space-y-6 sm:space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold text-white mb-2">Dispositivos</h1>
              <p className="text-gray-400">Gerencie todos os seus dispositivos IoT</p>
            </div>
            <Link to="/add-device" className="w-full sm:w-auto">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Dispositivo
              </Button>
            </Link>
          </div>

          {loading ? (
            <div className="text-white">Carregando dispositivos...</div>
          ) : devices.length > 0 ? (
            <div className="space-y-8">
              {groupDevicesByProject(devices).map((project) => (
                <section key={project.id} className="space-y-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex-none rounded-xl border border-purple-400/30 bg-purple-500/10 p-2">
                      <Layers className="h-5 w-5 text-purple-300" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-2xl font-bold text-white">{project.name}</h2>
                      <p className="text-sm text-gray-400">
                        {project.totalDevices} dispositivo{project.totalDevices > 1 ? 's' : ''} neste projeto
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
                    {project.devices.map((device, index) => (
                      <DeviceCard
                        key={device.id}
                        device={{ ...device, detailUrl: `/devices/${device.id}` }}
                        onToggle={() => handleDeviceToggle(device.id, device.status)}
                        onDelete={() => handleDeviceDelete(device.id)}
                        index={index}
                        showDelete
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="gradient-card rounded-xl border border-purple-500/30 px-4 py-16 text-center sm:py-20"
            >
              <p className="text-gray-400 text-lg mb-4">
                Você ainda não tem dispositivos cadastrados
              </p>
              <Link to="/add-device" className="inline-block w-full sm:w-auto">
                <Button className="w-full bg-purple-600 hover:bg-purple-700 sm:w-auto">
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
