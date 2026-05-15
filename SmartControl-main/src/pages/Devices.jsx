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

const DeviceListSkeleton = () => (
  <div className="space-y-4">
    <div className="flex min-w-0 items-center gap-3">
      <span className="theme-badge flex-none rounded-xl p-2">
        <Layers className="theme-icon h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="h-6 w-48 animate-pulse rounded bg-white/10" />
        <div className="mt-2 h-4 w-32 animate-pulse rounded bg-white/10" />
      </div>
    </div>
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="gradient-card mobile-card min-h-[245px] rounded-xl border border-purple-500/30 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 animate-pulse rounded-lg bg-white/10" />
            <div className="min-w-0 flex-1">
              <div className="h-5 w-3/4 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-white/10" />
            </div>
          </div>
          <div className="mt-6 h-8 w-full animate-pulse rounded bg-white/10" />
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="h-16 animate-pulse rounded-lg bg-white/10" />
            <div className="h-16 animate-pulse rounded-lg bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Devices = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasLoadedOnceRef = React.useRef(false);

  const fetchDevices = useCallback(async ({ showLoader = false } = {}) => {
    if (!user) return;
    if (showLoader && !hasLoadedOnceRef.current) setLoading(true);

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
    hasLoadedOnceRef.current = true;
    setHasLoadedOnce(true);
  }, [user]);

  useEffect(() => {
    if (!user) return undefined;

    let refreshTimer = null;
    const scheduleRefresh = (delay = 120) => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        fetchDevices();
      }, delay);
    };

    fetchDevices({ showLoader: true });

    const polling = window.setInterval(() => {
      fetchDevices();
    }, 60000);

    const deviceSub = supabase.channel('devices-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices', filter: `user_id=eq.${user?.id}` }, () => {
        scheduleRefresh();
      })
      .subscribe();

    const unsubscribeBackendEvents = subscribeBackendEvents({
      onDeviceState: (event) => {
        if (!event.user_id || event.user_id === user?.id) scheduleRefresh();
      },
      onCommandAck: (event) => {
        if (!event.user_id || event.user_id === user?.id) scheduleRefresh(40);
      },
      onDeviceDiscovered: () => {
        scheduleRefresh();
      },
    });

    return () => {
      window.clearInterval(polling);
      if (refreshTimer) window.clearTimeout(refreshTimer);
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
        <div className="space-y-5 sm:space-y-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="theme-title text-3xl font-bold mb-2">Dispositivos</h1>
              <p className="theme-muted">Gerencie todos os seus dispositivos IoT</p>
            </div>
            <Link to="/add-device" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Dispositivo
              </Button>
            </Link>
          </div>

          {loading && !hasLoadedOnce && devices.length === 0 ? (
            <DeviceListSkeleton />
          ) : devices.length > 0 ? (
            <div className="space-y-8">
              {groupDevicesByProject(devices).map((project) => (
                <section key={project.id} className="space-y-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="theme-badge flex-none rounded-xl p-2">
                      <Layers className="theme-icon h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="theme-title text-2xl font-bold">{project.name}</h2>
                      <p className="theme-muted text-sm">
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
          ) : hasLoadedOnce ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="theme-card rounded-xl px-4 py-16 text-center sm:py-20"
            >
              <p className="theme-muted text-lg mb-4">
                Você ainda não tem dispositivos cadastrados
              </p>
              <Link to="/add-device" className="inline-block w-full sm:w-auto">
                <Button className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeiro Dispositivo
                </Button>
              </Link>
            </motion.div>
          ) : null}
        </div>
      </DashboardLayout>
    </>
  );
};

export default Devices;
