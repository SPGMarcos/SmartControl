import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Gauge, Layers, Plus, Power, Wifi, Zap } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import DeviceCard from '@/components/DeviceCard';
import HydroponicsDevicePanel from '@/components/HydroponicsDevicePanel';
import SensorCard from '@/components/SensorCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { getUserDisplayName, groupDevicesByProject, isDeviceOnline } from '@/lib/deviceProjects';
import { applyHydroponicsCommandState, buildHydroponicsMqttTopics, isHydroponicsDevice } from '@/lib/hydroponicsHeltec';
import { backendUrl } from '@/lib/backend';
import { toast } from '@/components/ui/use-toast';

const StatCard = ({ icon: Icon, label, value, accent = 'text-purple-400', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="gradient-card p-6 rounded-xl border border-purple-500/30"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-3xl font-bold text-white mt-2">{value}</p>
      </div>
      <Icon className={`w-12 h-12 ${accent}`} />
    </div>
  </motion.div>
);

const ProjectCard = ({ project, selected, onOpen, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 }}
    className={`gradient-card rounded-2xl border p-6 transition-all ${
      selected ? 'border-purple-400 shadow-lg shadow-purple-950/30' : 'border-purple-500/30 hover:border-purple-400/60'
    }`}
  >
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-purple-300">Projeto</p>
        <h3 className="mt-2 text-2xl font-bold text-white">{project.name}</h3>
        <p className="mt-2 text-sm leading-6 text-gray-400">{project.description}</p>
      </div>
      <div className="rounded-2xl border border-purple-400/30 bg-purple-500/10 p-3">
        <Layers className="h-7 w-7 text-purple-300" />
      </div>
    </div>

    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-xl bg-black/30 p-3 text-center">
        <p className="text-2xl font-bold text-white">{project.totalDevices}</p>
        <p className="text-xs text-gray-500">dispositivos</p>
      </div>
      <div className="rounded-xl bg-black/30 p-3 text-center">
        <p className="text-2xl font-bold text-green-400">{project.onlineDevices}</p>
        <p className="text-xs text-gray-500">online</p>
      </div>
      <div className="rounded-xl bg-black/30 p-3 text-center">
        <p className="text-2xl font-bold text-purple-300">{project.activeDevices}</p>
        <p className="text-xs text-gray-500">ativos</p>
      </div>
    </div>

    <div className="mt-5 space-y-2">
      {project.devices.slice(0, 3).map((device) => (
        <div key={device.id} className="flex items-center justify-between rounded-xl bg-black/25 px-3 py-2">
          <span className="truncate text-sm text-gray-300">{device.name}</span>
          <span className={`ml-3 h-2 w-2 rounded-full ${isDeviceOnline(device) ? 'bg-green-400' : 'bg-gray-600'}`} />
        </div>
      ))}
    </div>

    <Button onClick={onOpen} className="mt-5 w-full bg-purple-600 hover:bg-purple-700">
      Abrir dashboard do projeto
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </motion.div>
);

const ProjectDashboard = ({ project, onToggle, onDeviceCommand, userId }) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-purple-500/30 bg-black/30 p-6"
  >
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-purple-300">Dashboard do projeto</p>
        <h2 className="mt-2 text-3xl font-bold text-white">{project.name}</h2>
        <p className="mt-2 text-gray-400">{project.description}</p>
      </div>
      <Link to="/add-device">
        <Button className="bg-purple-600 hover:bg-purple-700">
          <Plus className="mr-2 h-4 w-4" />
          Adicionar dispositivo
        </Button>
      </Link>
    </div>

    <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Layers} label="Dispositivos" value={project.totalDevices} />
      <StatCard icon={Wifi} label="Online" value={project.onlineDevices} accent="text-green-400" delay={0.05} />
      <StatCard icon={Power} label="Acionados" value={project.activeDevices} accent="text-purple-300" delay={0.1} />
      <StatCard icon={Gauge} label="Sensores" value={project.totalSensors} accent="text-blue-300" delay={0.15} />
    </div>

    {project.devices.some(isHydroponicsDevice) && (
      <div className="mb-8 space-y-5">
        <h3 className="text-xl font-bold text-white">Módulos oficiais SmartControl</h3>
        {project.devices.filter(isHydroponicsDevice).map((device) => (
          <HydroponicsDevicePanel
            key={device.id}
            device={device}
            compact
            topics={buildHydroponicsMqttTopics({ userId, projectName: project.name, device })}
            onCommand={(commandPayload) => onDeviceCommand(device, commandPayload)}
            onConfig={(configPayload) => onDeviceCommand(device, { command: 'remote_config', payload: configPayload, useConfigTopic: true })}
          />
        ))}
      </div>
    )}

    <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
      <div>
        <h3 className="mb-4 text-xl font-bold text-white">Acionamentos rápidos</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {project.devices.filter((device) => !isHydroponicsDevice(device)).map((device, index) => (
            <DeviceCard
              key={device.id}
              device={{ ...device, detailUrl: `/devices/${device.id}` }}
              onToggle={() => onToggle(device.id, device.status)}
              index={index}
            />
          ))}
          {project.devices.every(isHydroponicsDevice) && (
            <div className="gradient-card rounded-xl border border-purple-500/30 p-6 text-gray-300">
              Os acionamentos deste projeto estão concentrados no módulo de hidroponia acima.
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-xl font-bold text-white">Sensores e telemetria</h3>
        {project.sensors.length > 0 ? (
          <div className="grid gap-4">
            {project.sensors.map((sensor, index) => (
              <SensorCard key={sensor.id} sensor={sensor} index={index} />
            ))}
          </div>
        ) : (
          <div className="gradient-card rounded-xl border border-purple-500/30 p-6">
            <p className="text-gray-300">Nenhum sensor vinculado a este projeto ainda.</p>
            <p className="mt-2 text-sm text-gray-500">
              A estrutura já está pronta para ESP32, ESP8266, ESP-01, LoRa, sensores e módulos personalizados.
            </p>
          </div>
        )}
      </div>
    </div>
  </motion.section>
);

const Dashboard = () => {
  const { user, session } = useAuth();
  const [devices, setDevices] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState('');

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
        setDevices([]);
        setSensors([]);
        setLoading(false);
        return;
      }

      const safeDevices = devicesData || [];
      setDevices(safeDevices);

      if (safeDevices.length > 0) {
        const deviceIds = safeDevices.map((device) => device.id);
        const { data: sensorsData, error: sensorsError } = await supabase
          .from('sensors')
          .select('*')
          .in('device_id', deviceIds);

        if (sensorsError) {
          console.error('Error fetching sensors:', sensorsError);
          setSensors([]);
        } else {
          setSensors(sensorsData || []);
        }
      } else {
        setSensors([]);
      }

      setLoading(false);
    };

    fetchData();

    const deviceSub = supabase.channel('public:devices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices', filter: `user_id=eq.${user?.id}` }, () => {
        fetchData();
      })
      .subscribe();

    const sensorSub = supabase.channel('public:sensors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sensors' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(deviceSub);
      supabase.removeChannel(sensorSub);
    };
  }, [user]);

  const projects = useMemo(() => groupDevicesByProject(devices, sensors), [devices, sensors]);
  const selectedProject = projects.find((project) => project.id === selectedProjectId) || projects[0];
  const displayName = getUserDisplayName(user);
  const onlineDevices = devices.filter(isDeviceOnline).length;

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
      setDevices(devices.map((device) => (device.id === deviceId ? data : device)));
    }
  };

  const handleDeviceCommand = async (device, commandPayload) => {
    if (!backendUrl) {
      toast({
        variant: 'destructive',
        title: 'Backend não configurado',
        description: 'Configure VITE_BACKEND_URL para enviar comandos MQTT.',
      });
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
            command: commandPayload?.command,
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
      return;
    }

    setDevices((currentDevices) =>
      currentDevices.map((currentDevice) =>
        currentDevice.id === device.id
          ? applyHydroponicsCommandState(currentDevice, commandPayload)
          : currentDevice
      )
    );

    toast({
      title: commandPayload?.useConfigTopic ? 'ConfiguraÃ§Ã£o enviada' : 'Comando enviado',
      description: commandPayload?.useConfigTopic
        ? `Ajustes enviados para ${device.name}.`
        : `${commandPayload?.command} enviado para ${device.name}.`,
    });
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
          <div className="mt-6 mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-purple-300">Olá, {displayName}</p>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                Sua central SmartControl
              </h1>
              <p className="mt-2 text-gray-400">
                Organize projetos, controle dispositivos e acompanhe sensores em uma visão única.
              </p>
            </div>
            <Link to="/add-device">
              <Button className="bg-purple-600 hover:bg-purple-700">
                <Plus className="w-4 h-4 mr-2" />
                Novo dispositivo
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={Zap} label="Dispositivos Ativos" value={devices.filter((device) => device.status).length} />
            <StatCard icon={Activity} label="Total de Dispositivos" value={devices.length} accent="text-green-400" delay={0.1} />
            <StatCard icon={Layers} label="Projetos" value={projects.length} accent="text-purple-300" delay={0.2} />
            <StatCard icon={Wifi} label="Online" value={onlineDevices} accent="text-blue-300" delay={0.3} />
          </div>

          {projects.length > 0 && (
            <>
              <section>
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Projetos e linhas de automação</h2>
                    <p className="mt-1 text-gray-400">Acesse um projeto inteiro ou controle cada dispositivo individualmente.</p>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
                  {projects.map((project, index) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      selected={selectedProject?.id === project.id}
                      onOpen={() => setSelectedProjectId(project.id)}
                      index={index}
                    />
                  ))}
                </div>
              </section>

              {selectedProject && (
                <ProjectDashboard
                  project={selectedProject}
                  onToggle={handleDeviceToggle}
                  onDeviceCommand={handleDeviceCommand}
                  userId={user?.id}
                />
              )}
            </>
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
