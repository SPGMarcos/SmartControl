import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Activity, ArrowLeft, ArrowRight, CreditCard, Gauge, Layers, Plus, Power, Wifi, Zap } from 'lucide-react';
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
import { subscribeBackendEvents } from '@/lib/realtimeEvents';
import { toast } from '@/components/ui/use-toast';
import { useSubscription } from '@/hooks/useSubscription';

const StatCard = ({ icon: Icon, label, value, accent = 'text-purple-400', delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="gradient-card mobile-card min-h-[104px] rounded-xl border border-purple-500/30 p-4 sm:min-h-[150px] sm:p-6"
  >
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-gray-400 text-sm">{label}</p>
        <p className="text-2xl font-bold text-white mt-2 sm:text-3xl">{value}</p>
      </div>
      <Icon className={`h-8 w-8 flex-none sm:h-12 sm:w-12 ${accent}`} />
    </div>
  </motion.div>
);

const ProjectCard = ({ project, selected, onOpenDevices, onOpenOverview, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08 }}
    className={`gradient-card mobile-card cursor-pointer rounded-xl border p-4 transition-all sm:p-6 ${
      selected ? 'border-purple-400 shadow-lg shadow-purple-950/30' : 'border-purple-500/30 hover:border-purple-400/60'
    }`}
    onClick={onOpenDevices}
  >
    <div className="mb-5 flex items-start justify-between gap-3 sm:gap-4">
      <div className="min-w-0">
        <p className="text-sm uppercase tracking-[0.2em] text-purple-300">Projeto</p>
        <button
          type="button"
          onClick={onOpenDevices}
          className="mt-2 block text-left text-xl font-bold text-white transition hover:text-purple-200 sm:text-2xl"
        >
          {project.name}
        </button>
        <p className="mt-2 text-sm leading-6 text-gray-400">{project.description}</p>
      </div>
      <div className="flex-none rounded-2xl border border-purple-400/30 bg-purple-500/10 p-3">
        <Layers className="h-7 w-7 text-purple-300" />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
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
        <div key={device.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/25 px-3 py-2">
          <Link
            to={`/devices/${device.id}`}
            onClick={(event) => event.stopPropagation()}
            className="truncate text-sm font-medium text-gray-300 transition hover:text-purple-200"
          >
            {device.name}
          </Link>
          <span className={`h-2 w-2 flex-none rounded-full ${isDeviceOnline(device) ? 'bg-green-400' : 'bg-gray-600'}`} />
        </div>
      ))}
    </div>

    {project.devices.length > 3 && (
      <p className="mt-3 text-xs text-gray-500">+{project.devices.length - 3} dispositivo(s) na lista completa</p>
    )}

    <Button
      onClick={(event) => {
        event.stopPropagation();
        onOpenOverview();
      }}
      className="mt-5 w-full bg-purple-600 hover:bg-purple-700"
    >
      Abrir dashboard do projeto
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  </motion.div>
);

const ProjectDeviceList = ({ project, onBack, onOpenOverview, onToggle }) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-5"
  >
    <div className="mobile-card rounded-xl border border-purple-500/30 bg-black/30 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.2em] text-purple-300">Dispositivos do projeto</p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{project.name}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">{project.description}</p>
        </div>
        <div className="mobile-button-row flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={onBack}
            variant="outline"
            className="border-purple-500/30 bg-black/30 text-gray-300 hover:bg-purple-600/20 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Projetos
          </Button>
          <Button type="button" onClick={onOpenOverview} className="bg-purple-600 hover:bg-purple-700">
            Abrir dashboard do projeto
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {project.devices.map((device, index) => (
        <DeviceCard
          key={device.id}
          device={{ ...device, detailUrl: `/devices/${device.id}` }}
          onToggle={() => onToggle(device.id, device.status)}
          index={index}
        />
      ))}
    </div>
  </motion.section>
);

const ProjectDashboard = ({ project, onToggle, onClose }) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="mobile-card rounded-2xl border border-purple-500/30 bg-black/30 p-4 sm:p-6"
  >
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-purple-300">Dashboard do projeto</p>
        <h2 className="mt-2 text-3xl font-bold text-white">{project.name}</h2>
        <p className="mt-2 text-gray-400">{project.description}</p>
      </div>
      <div className="mobile-button-row flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          onClick={onClose}
          variant="outline"
          className="border-purple-500/30 bg-black/30 text-gray-300 hover:bg-purple-600/20 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar aos dispositivos
        </Button>
        <Link to="/add-device">
          <Button className="w-full bg-purple-600 hover:bg-purple-700 sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Adicionar dispositivo
          </Button>
        </Link>
      </div>
    </div>

    <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard icon={Layers} label="Dispositivos" value={project.totalDevices} />
      <StatCard icon={Wifi} label="Online" value={project.onlineDevices} accent="text-green-400" delay={0.05} />
      <StatCard icon={Power} label="Acionados" value={project.activeDevices} accent="text-purple-300" delay={0.1} />
      <StatCard icon={Gauge} label="Sensores" value={project.totalSensors} accent="text-blue-300" delay={0.15} />
    </div>

    {project.devices.some(isHydroponicsDevice) && (
      <div className="mb-8 space-y-4">
        <h3 className="text-xl font-bold text-white">Módulos oficiais SmartControl</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {project.devices.filter(isHydroponicsDevice).map((device) => (
            <Link
              key={device.id}
              to={`/devices/${device.id}`}
              className="gradient-card block rounded-xl border border-purple-500/30 p-5 transition hover:border-purple-400/60"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white">{device.name}</p>
                  <p className="mt-1 text-sm text-gray-400">Controle individual do módulo oficial</p>
                </div>
                <span className={`mt-2 h-2 w-2 rounded-full ${isDeviceOnline(device) ? 'bg-green-400' : 'bg-gray-600'}`} />
              </div>
              <div className="mt-4 inline-flex items-center text-sm font-semibold text-purple-300">
                Abrir controle
                <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
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

const ProjectDashboardGrouped = ({ project, onToggle, onDeviceCommand, onClose, userId }) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="space-y-5"
  >
    <div className="mobile-card rounded-xl border border-purple-500/30 bg-black/30 p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-[0.2em] text-purple-300">Dashboard do projeto</p>
          <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{project.name}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            {project.totalDevices} dispositivo{project.totalDevices > 1 ? 's' : ''} registrado{project.totalDevices > 1 ? 's' : ''} nesta dashboard.
          </p>
        </div>
        <div className="mobile-button-row flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={onClose}
            variant="outline"
            className="border-purple-500/30 bg-black/30 text-gray-300 hover:bg-purple-600/20 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar aos dispositivos
          </Button>
          <Link to="/add-device">
            <Button className="w-full bg-purple-600 hover:bg-purple-700 sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar dispositivo
            </Button>
          </Link>
        </div>
      </div>
    </div>

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

    {project.devices.some((device) => !isHydroponicsDevice(device)) && (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {project.devices.filter((device) => !isHydroponicsDevice(device)).map((device, index) => (
          <DeviceCard
            key={device.id}
            device={{ ...device, detailUrl: `/devices/${device.id}` }}
            onToggle={() => onToggle(device.id, device.status)}
            index={index}
          />
        ))}
      </div>
    )}
  </motion.section>
);

const Dashboard = () => {
  const { user, session } = useAuth();
  const [devices, setDevices] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [projectView, setProjectView] = useState('projects');
  const optimisticDevicesRef = useRef(new Map());
  const { currentPlan, limits } = useSubscription();

  const mergeOptimisticDevices = (freshDevices = []) =>
    freshDevices.map((device) => {
      const optimisticDevice = optimisticDevicesRef.current.get(device.id);
      if (!optimisticDevice) return device;

      const optimisticTime = new Date(optimisticDevice.last_heartbeat || optimisticDevice.updated_at || 0).getTime();

      if (Date.now() - optimisticTime > 25000) {
        optimisticDevicesRef.current.delete(device.id);
        return device;
      }

      return {
        ...device,
        ...optimisticDevice,
      };
    });

  useEffect(() => {
    const fetchData = async ({ showLoader = false } = {}) => {
      if (!user) return;
      if (showLoader) setLoading(true);

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

      const safeDevices = mergeOptimisticDevices(devicesData || []);
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

    let refreshTimer = null;
    const scheduleRefresh = (delay = 120) => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        fetchData();
      }, delay);
    };

    fetchData({ showLoader: true });

    const polling = window.setInterval(() => {
      fetchData();
    }, 3000);

    const deviceSub = supabase.channel('public:devices')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'devices', filter: `user_id=eq.${user?.id}` }, () => {
        scheduleRefresh();
      })
      .subscribe();

    const sensorSub = supabase.channel('public:sensors')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sensors' }, () => {
        scheduleRefresh();
      })
      .subscribe();

    const unsubscribeBackendEvents = subscribeBackendEvents({
      onDeviceState: (event) => {
        if (!event.user_id || event.user_id === user.id) scheduleRefresh();
      },
      onCommandAck: (event) => {
        if (!event.user_id || event.user_id === user.id) scheduleRefresh(40);
      },
      onDeviceDiscovered: () => {
        scheduleRefresh();
      },
    });

    return () => {
      window.clearInterval(polling);
      if (refreshTimer) window.clearTimeout(refreshTimer);
      supabase.removeChannel(deviceSub);
      supabase.removeChannel(sensorSub);
      unsubscribeBackendEvents();
    };
  }, [user]);

  const projects = useMemo(() => groupDevicesByProject(devices, sensors), [devices, sensors]);
  const selectedProject = selectedProjectId ? projects.find((project) => project.id === selectedProjectId) : null;
  const displayName = getUserDisplayName(user);
  const onlineDevices = devices.filter(isDeviceOnline).length;
  const openProjectDevices = (projectId) => {
    setSelectedProjectId(projectId);
    setProjectView('devices');
  };
  const openProjectOverview = (projectId) => {
    setSelectedProjectId(projectId);
    setProjectView('overview');
  };
  const closeProjectView = () => {
    setSelectedProjectId('');
    setProjectView('projects');
  };

  useEffect(() => {
    if (selectedProjectId && projects.length > 0 && !selectedProject) {
      closeProjectView();
    }
  }, [selectedProjectId, selectedProject, projects.length]);

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
    const shouldWaitForFirmware = commandPayload?.requiresStateConfirmation === true;
    const optimisticDevice = shouldWaitForFirmware ? device : applyHydroponicsCommandState(device, commandPayload);
    const hasOptimisticUpdate = optimisticDevice !== device;

    if (hasOptimisticUpdate) {
      optimisticDevicesRef.current.set(device.id, optimisticDevice);
      setDevices((currentDevices) =>
        currentDevices.map((currentDevice) =>
          currentDevice.id === device.id ? optimisticDevice : currentDevice
        )
      );
    }

    const restoreDevice = () => {
      optimisticDevicesRef.current.delete(device.id);
      if (!hasOptimisticUpdate) return;

      setDevices((currentDevices) =>
        currentDevices.map((currentDevice) =>
          currentDevice.id === device.id ? device : currentDevice
        )
      );
    };

    if (!backendUrl) {
      restoreDevice();
      toast({
        variant: 'destructive',
        title: 'Backend nao configurado',
        description: 'Configure VITE_BACKEND_URL para enviar comandos MQTT.',
      });
      return { ok: false, error: 'backend_not_configured' };
    }

    const endpoint = commandPayload?.useConfigTopic
      ? `/api/devices/${device.id}/config`
      : '/api/command';

    let response;
    let payload = {};

    try {
      response = await fetch(`${backendUrl}${endpoint}`, {
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
      payload = await response.json();
    } catch (error) {
      restoreDevice();
      toast({
        variant: 'destructive',
        title: 'Backend indisponivel',
        description: 'Nao foi possivel enviar o comando agora. Tente novamente em instantes.',
      });
      return { ok: false, error: 'backend_unavailable' };
    }

    if (!response.ok) {
      restoreDevice();
      toast({
        variant: 'destructive',
        title: 'Falha ao enviar comando',
        description: payload.error || 'Tente novamente mais tarde.',
      });
      return { ok: false, error: payload.error || 'command_failed' };
    }

    toast({
      title: commandPayload?.useConfigTopic ? 'Configuracao enviada' : 'Comando enviado',
      description: commandPayload?.useConfigTopic
        ? `Ajustes enviados para ${device.name}.`
        : commandPayload?.requiresStateConfirmation
          ? `Aguardando confirmacao da firmware de ${device.name}.`
          : `${commandPayload?.command} enviado para ${device.name}.`,
    });
    return { ok: true, ...payload };
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
        <div className="w-full space-y-6 sm:space-y-8">
          {projectView === 'projects' && (
            <>
              <div className="mb-5 mt-0 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl min-w-0">
                  <p className="theme-kicker text-sm uppercase tracking-[0.25em]">Olá, {displayName}</p>
                  <h1 className="theme-title mt-2 text-3xl font-bold md:text-4xl">
                    Sua central SmartControl
                  </h1>
                  <p className="theme-muted mt-2 leading-7">
                    Organize projetos, controle dispositivos e acompanhe sensores em uma visão única.
                  </p>
                </div>
                <div className="mobile-button-row flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link to="/subscription" className="w-full sm:w-auto">
                    <Button variant="outline" className="w-full border-purple-500/30 bg-black/30 text-gray-300 hover:bg-purple-600/20 hover:text-white sm:w-auto">
                      <CreditCard className="w-4 h-4 mr-2" />
                      {currentPlan.name}
                    </Button>
                  </Link>
                  <Link to={limits.can_add_device ? '/add-device' : '/subscription'} className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto">
                      <Plus className="w-4 h-4 mr-2" />
                      {limits.can_add_device ? 'Novo dispositivo' : 'Fazer upgrade'}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-6 lg:grid-cols-4">
                <StatCard icon={Zap} label="Dispositivos Ativos" value={devices.filter((device) => device.status).length} />
                <StatCard icon={Activity} label="Total de Dispositivos" value={devices.length} accent="text-green-400" delay={0.1} />
                <StatCard icon={Layers} label="Uso do Plano" value={`${limits.devices_used}/${limits.device_limit}`} accent="text-purple-300" delay={0.2} />
                <StatCard icon={Wifi} label="Online" value={onlineDevices} accent="text-blue-300" delay={0.3} />
              </div>
              {!limits.can_add_device && (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                  Limite de dispositivos do plano atual atingido. A dashboard continua operando, mas novos dispositivos exigem upgrade em Minha Assinatura.
                </div>
              )}
            </>
          )}

          {projects.length > 0 && (
            <>
              {projectView === 'projects' && (
              <section id="projects">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="theme-title text-2xl font-bold">Projetos e linhas de automação</h2>
                    <p className="theme-muted mt-1">Escolha uma classe para ver os dispositivos ou abra a visão agrupada.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {projects.map((project, index) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      selected={selectedProject?.id === project.id}
                      onOpenDevices={() => openProjectDevices(project.id)}
                      onOpenOverview={() => openProjectOverview(project.id)}
                      index={index}
                    />
                  ))}
                </div>
              </section>
              )}

              {selectedProject && projectView === 'devices' && (
                <ProjectDeviceList
                  project={selectedProject}
                  onBack={closeProjectView}
                  onOpenOverview={() => openProjectOverview(selectedProject.id)}
                  onToggle={handleDeviceToggle}
                />
              )}

              {selectedProject && projectView === 'overview' && (
                <ProjectDashboardGrouped
                  project={selectedProject}
                  onToggle={handleDeviceToggle}
                  onDeviceCommand={handleDeviceCommand}
                  onClose={() => openProjectDevices(selectedProject.id)}
                  userId={user?.id}
                />
              )}
            </>
          )}

          {devices.length === 0 && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="theme-card text-center py-20 rounded-xl"
            >
              <p className="theme-muted text-lg mb-4">
                Você ainda não tem dispositivos cadastrados
              </p>
              <Link to="/add-device">
                <Button>
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
