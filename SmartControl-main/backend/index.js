import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mqtt from 'mqtt';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  MQTT_URL,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_CLIENT_ID,
  PORT = 4000,
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Supabase service credentials are obrigatórios no backend. Verifique .env.');
}

if (!MQTT_URL) {
  throw new Error('MQTT_URL is obrigatório no backend. Verifique .env.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  global: {
    headers: {
      'x-client-info': 'smartcontrol-backend',
    },
  },
});

const mqttClient = mqtt.connect(MQTT_URL, {
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  clientId: MQTT_CLIENT_ID || `smartcontrol-backend-${Math.random().toString(36).substring(2, 8)}`,
  keepalive: 30,
  reconnectPeriod: 5000,
});

mqttClient.on('connect', () => {
  console.log('MQTT backend conectado ao broker.');
});

mqttClient.on('reconnect', () => {
  console.log('Reconectando ao broker MQTT...');
});

mqttClient.on('error', (error) => {
  console.error('Erro MQTT:', error?.message || error);
});

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  return res.json({ status: 'ok', version: '1.0.0' });
});

app.post('/api/command', async (req, res) => {
  const { device_id, command, user_id, device_token } = req.body;

  if (!device_id || !command) {
    return res.status(400).json({ error: 'device_id e command são obrigatórios.' });
  }

  try {
    const { data: device, error: fetchError } = await supabase
      .from('devices')
      .select('*')
      .eq('id', device_id)
      .single();

    if (fetchError || !device) {
      return res.status(404).json({ error: 'Dispositivo não encontrado.' });
    }

    if (device_token && device.device_token && device_token !== device.device_token) {
      return res.status(403).json({ error: 'Token de dispositivo inválido.' });
    }

    const topic = device.mqtt_topic || device.topic || `smartcontrol/${device.user_id}/${device.project_name || 'default'}/${device.device_id || device.id}/cmd`;
    const payload = {
      device_id: device.device_id || device.id,
      command,
      sent_at: new Date().toISOString(),
      user_id,
    };

    mqttClient.publish(topic, JSON.stringify(payload), { qos: 1, retain: false }, (err) => {
      if (err) {
        console.error('Erro ao publicar MQTT:', err);

        supabase.from('logs').insert([{
          device_id: device.id,
          user_id: user_id || null,
          type: 'mqtt_publish_error',
          payload: JSON.stringify({ topic, payload, error: err.message || err }),
          created_at: new Date().toISOString(),
        }]).catch((logError) => {
          console.error('Erro ao gravar log MQTT:', logError);
        });

        return res.status(500).json({ error: 'Falha ao enviar comando ao broker MQTT.' });
      }

      supabase.from('logs').insert([{
        device_id: device.id,
        user_id: user_id || null,
        type: 'command_sent',
        payload: JSON.stringify({ topic, payload }),
        created_at: new Date().toISOString(),
      }]).catch((logError) => {
        console.error('Erro ao gravar log de comando:', logError);
      });

      return res.json({ status: 'sent', topic, payload });
    });
  } catch (error) {
    console.error('Erro no backend de comando:', error);
    return res.status(500).json({ error: 'Erro interno no backend de integração.' });
  }
});

app.listen(PORT, () => {
  console.log(`SmartControl backend rodando na porta ${PORT}`);
});