import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Droplets, Lightbulb, Zap, Gauge, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import ConfirmDialog from './ConfirmDialog';

const DeviceCard = ({ device, onToggle, onDelete, index, showDelete }) => {
  const icons = {
    relay: Droplets,
    light: Lightbulb,
    motor: Zap,
    sensor: Gauge,
  };

  const [confirmOpen, setConfirmOpen] = useState(false);

  const Icon = icons[device.type] || Zap;

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
            <h3 className="text-lg font-bold text-white">{device.name}</h3>
            <p className="text-gray-400 text-sm capitalize">{device.type}</p>
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
        <span className="text-gray-400 text-sm">
          {device.status ? 'Ligado' : 'Desligado'}
        </span>
        <Switch
          checked={device.status}
          onCheckedChange={() => onToggle(device.id)}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-purple-500/20">
        <p className="text-gray-500 text-xs">
          Última conexão: {new Date(device.lastConnection).toLocaleString('pt-BR')}
        </p>
      </div>

      {/* Modal de confirmação */}
      <ConfirmDialog
        open={confirmOpen}
        title="Excluir dispositivo?"
        description={`Deseja realmente excluir "${device.name}"? Esta ação não pode ser desfeita.`}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </motion.div>
  );
};

export default DeviceCard;