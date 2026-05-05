const DEFAULT_PROJECTS = {
  irrigation: {
    name: 'Irrigação residencial',
    type: 'irrigation',
    description: 'Válvulas, bombas e setores de irrigação automatizada.',
  },
  garden: {
    name: 'Piscina e jardim',
    type: 'garden',
    description: 'Dispositivos para área externa, jardim, piscina e lazer.',
  },
  greenhouse: {
    name: 'Estufa automatizada',
    type: 'greenhouse',
    description: 'Sensores, iluminação, controle climático e cultivo protegido.',
  },
  hydroponics: {
    name: 'Hidroponia inteligente',
    type: 'hydroponics',
    description: 'Bomba, oxigenador, temporizador ciclico e operacao local/remota para cultivo hidroponico.',
  },
  lighting: {
    name: 'Iluminação externa',
    type: 'lighting',
    description: 'Circuitos de iluminação inteligente e acionamentos rápidos.',
  },
  pump: {
    name: 'Controle de bomba',
    type: 'pump',
    description: 'Bombas, motores, relés e acionamentos críticos.',
  },
  agriculture: {
    name: 'Automação agrícola',
    type: 'agriculture',
    description: 'Soluções para campo, produção e automação rural.',
  },
  home: {
    name: 'Casa inteligente',
    type: 'home',
    description: 'Automação residencial, conforto, segurança e rotina.',
  },
};

export const projectTemplates = [
  DEFAULT_PROJECTS.irrigation,
  {
    name: 'Horta urbana',
    type: 'urban_garden',
    description: 'Irrigação, sensores e automações para hortas compactas.',
  },
  DEFAULT_PROJECTS.greenhouse,
  DEFAULT_PROJECTS.hydroponics,
  DEFAULT_PROJECTS.pump,
  DEFAULT_PROJECTS.lighting,
  DEFAULT_PROJECTS.garden,
  DEFAULT_PROJECTS.agriculture,
  DEFAULT_PROJECTS.home,
];

export const deviceModelOptions = [
  { value: 'esp32', label: 'ESP32' },
  { value: 'esp8266', label: 'ESP8266' },
  { value: 'esp01', label: 'ESP-01' },
  { value: 'esp32_lora', label: 'ESP32 LoRa' },
  { value: 'heltec_esp32_lora_hydroponics', label: 'Heltec ESP32 LoRa - Hidroponia SmartControl' },
  { value: 'relay_module', label: 'Módulo de relé' },
  { value: 'sensor_module', label: 'Módulo de sensor' },
  { value: 'custom', label: 'Dispositivo SmartControl personalizado' },
];

export const protocolOptions = [
  { value: 'mqtt', label: 'MQTT' },
  { value: 'local_api', label: 'API local' },
  { value: 'esphome', label: 'ESPHome' },
  { value: 'home_assistant', label: 'Home Assistant' },
  { value: 'lora', label: 'LoRa' },
];

const normalize = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const getUserDisplayName = (user) => {
  const metadataName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  if (metadataName?.trim()) return metadataName.trim();

  const emailPrefix = user?.email?.split('@')?.[0];
  if (emailPrefix) return emailPrefix;

  return 'Usuário SmartControl';
};

export const getDeviceProjectName = (device) => {
  if (device?.project_name) return device.project_name;
  if (device?.project) return device.project;
  if (device?.projectName) return device.projectName;
  if (device?.lineage) return device.lineage;

  const text = normalize(`${device?.name || ''} ${device?.type || ''} ${device?.mqtt_topic || ''}`);

  if (text.includes('hidroponia') || text.includes('hydroponics') || text.includes('heltec')) return DEFAULT_PROJECTS.hydroponics.name;
  if (text.includes('estufa') || text.includes('greenhouse')) return DEFAULT_PROJECTS.greenhouse.name;
  if (text.includes('horta')) return 'Horta urbana';
  if (text.includes('bomba') || text.includes('motor') || text.includes('poco') || text.includes('poço')) return DEFAULT_PROJECTS.pump.name;
  if (text.includes('luz') || text.includes('ilumin') || text.includes('light')) return DEFAULT_PROJECTS.lighting.name;
  if (text.includes('piscina') || text.includes('jardim')) return DEFAULT_PROJECTS.garden.name;
  if (text.includes('agro') || text.includes('fazenda') || text.includes('lora')) return DEFAULT_PROJECTS.agriculture.name;
  if (text.includes('irrig') || text.includes('valvula') || text.includes('válvula') || device?.type === 'relay') return DEFAULT_PROJECTS.irrigation.name;

  return DEFAULT_PROJECTS.home.name;
};

export const getDeviceModelLabel = (device) => {
  const value = device?.device_model || device?.model || device?.hardware || device?.board;
  const option = deviceModelOptions.find((item) => item.value === value);

  return option?.label || value || 'SmartControl IoT';
};

export const getDeviceProtocolLabel = (device) => {
  const value = device?.protocol || (device?.mqtt_topic ? 'mqtt' : '');
  const option = protocolOptions.find((item) => item.value === value);

  return option?.label || value || 'Não definido';
};

export const isDeviceOnline = (device) => {
  const lastHeartbeat = device?.last_heartbeat ? new Date(device.last_heartbeat).getTime() : null;
  const heartbeatIsFresh = lastHeartbeat ? Date.now() - lastHeartbeat < 2 * 60 * 1000 : false;

  // Priorizar heartbeat fresco sobre outros indicadores
  if (heartbeatIsFresh) {
    return true;
  }

  // Verificar status explícito de conexão
  const rawStatus = device?.connection_status || device?.online_status;
  if (typeof rawStatus === 'string') {
    return rawStatus.toLowerCase() === 'online';
  }

  // Verificar campo online booleano
  if (typeof device?.online === 'boolean') {
    return device.online;
  }

  // Fallback para status (menos confiável)
  return Boolean(device?.status);
};

export const getLastConnection = (device) => {
  return device?.last_heartbeat || device?.lastConnection || device?.updated_at || device?.created_at;
};

export const groupDevicesByProject = (devices = [], sensors = []) => {
  const projectsMap = new Map();

  devices.forEach((device) => {
    const projectName = getDeviceProjectName(device);

    if (!projectsMap.has(projectName)) {
      projectsMap.set(projectName, {
        id: normalize(projectName).replace(/[^a-z0-9]+/g, '-'),
        name: projectName,
        description:
          projectTemplates.find((template) => template.name === projectName)?.description ||
          'Linha de automação SmartControl com dispositivos agrupados por projeto.',
        devices: [],
        sensors: [],
      });
    }

    projectsMap.get(projectName).devices.push(device);
  });

  const projects = Array.from(projectsMap.values());

  sensors.forEach((sensor) => {
    const project = projects.find((item) => item.devices.some((device) => device.id === sensor.device_id));
    if (project) project.sensors.push(sensor);
  });

  return projects.map((project) => {
    const activeDevices = project.devices.filter((device) => device.status).length;
    const onlineDevices = project.devices.filter(isDeviceOnline).length;

    return {
      ...project,
      activeDevices,
      onlineDevices,
      totalDevices: project.devices.length,
      totalSensors: project.sensors.length,
    };
  });
};
