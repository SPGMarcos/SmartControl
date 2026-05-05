import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Droplets, Gauge, Leaf, Lightbulb, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import ConfirmDialog from './ConfirmDialog';
import {
  getDeviceModelLabel,
  getDeviceProjectName,
  getDeviceProtocolLabel,
  getLastConnection,
  isDeviceOnline,
} from '@/lib/deviceProjects';

const DeviceCard = ({ device, onToggle, onDelete, index = 0, showDelete }) => {
  const icons = {
    relay: Droplets,
    light: Lightbulb,
    motor: Zap,
    sensor: Gauge,
    hydroponics: Leaf,
  };

  const [confirmOpen, setConfirmOpen] = useState(false);

  const Icon = icons[device.type] || Zap;
  const online = isDeviceOnline(device);
  const lastConnection = getLastConnection(device);

  const handleDeleteClick = () => {
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (onDelete) {
      await onDelete(device.id);
    }
    setConfirmOpen(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="gradient-card p-6 rounded-xl border border-purple-500/30 hover:border-purple-500/50 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${device.status ? 'bg-purple-600' : 'bg-gray-700'}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
              {device.detailUrl ? (
                <Link to={device.detailUrl} className="text-lg font-bold text-white hover:text-purple-300 transition">
                  {device.name}
                </Link>
              ) : (
                <h3 className="text-lg font-bold text-white">{device.name}</h3>
              )}
            <p className="text-gray-400 text-sm">{getDeviceProjectName(device)}</p>
          </div>
        </div>
        {showDelete && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDeleteClick}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-gray-400 text-sm">
            {device.status ? 'Ligado' : 'Desligado'}
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-green-400' : 'bg-gray-600'}`}></span>
            <span className="text-xs text-gray-500">{online ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <Switch
          checked={Boolean(device.status)}
          onCheckedChange={() => onToggle(device.id)}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-purple-500/20 pt-4">
        <div className="rounded-lg bg-black/30 p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Hardware</p>
          <p className="mt-1 text-sm text-gray-200">{getDeviceModelLabel(device)}</p>
        </div>
        <div className="rounded-lg bg-black/30 p-3">
          <p className="text-[11px] uppercase tracking-wide text-gray-500">Protocolo</p>
          <p className="mt-1 text-sm text-gray-200">{getDeviceProtocolLabel(device)}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-purple-500/20 pt-4">
        <p className="text-gray-500 text-xs">
          Última conexão: {lastConnection ? new Date(lastConnection).toLocaleString('pt-BR') : 'Aguardando telemetria'}
        </p>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Excluir dispositivo?"
        description={`Deseja realmente excluir "${device.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Sim, excluir"
        cancelLabel="Nao"
        destructive
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </motion.div>
  );
};

export default DeviceCard;
