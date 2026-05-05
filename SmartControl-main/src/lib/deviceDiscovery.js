import { backendUrl } from './backend';

/**
 * Busca dispositivos descobertos no backend
 * @returns {Promise<Array>} Lista de dispositivos descobertos
 */
export const discoverDevices = async () => {
  try {
    const response = await fetch(`${backendUrl}/api/discover/devices`);
    if (!response.ok) {
      console.error('Erro ao buscar dispositivos descobertos:', response.status);
      return [];
    }
    const data = await response.json();
    return data.devices || [];
  } catch (error) {
    console.error('Erro na descoberta de dispositivos:', error);
    return [];
  }
};

/**
 * Busca informações de um dispositivo descoberto específico
 * @param {string} deviceId - ID do dispositivo descoberto
 * @returns {Promise<Object|null>} Dados do dispositivo ou null
 */
export const getDiscoveredDevice = async (deviceId) => {
  try {
    const response = await fetch(`${backendUrl}/api/discover/devices/${deviceId}`);
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Erro ao buscar dispositivo descoberto:', error);
    return null;
  }
};

/**
 * Mapeia dados descobertos para o formulário de cadastro
 * @param {Object} discoveredData - Dados do dispositivo descoberto
 * @returns {Object} Dados formatados para o formulário
 */
export const mapDiscoveredDataToForm = (discoveredData) => {
  if (!discoveredData) return {};

  return {
    deviceId: discoveredData.device_id || '',
    macAddress: discoveredData.mac_address || '',
    firmwareVersion: discoveredData.firmware_version || '',
    hardwareVersion: discoveredData.hardware_version || '',
    localIp: discoveredData.ip || '',
    mdnsHostname: discoveredData.mdns || '',
    // Se for módulo de hidroponia, seleciona o tipo correto
    ...(discoveredData.module && discoveredData.module.includes('hydroponics') && {
      type: 'hydroponics',
      deviceModel: 'heltec_esp32_lora_hydroponics',
      projectName: 'Hidroponia inteligente',
    }),
  };
};
