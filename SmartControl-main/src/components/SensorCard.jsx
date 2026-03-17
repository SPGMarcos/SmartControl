import React from 'react';
import { motion } from 'framer-motion';
import { Thermometer, Droplets, Sun, Wind } from 'lucide-react';

const SensorCard = ({ sensor, index }) => {
  const icons = {
    temperature: Thermometer,
    humidity: Droplets,
    light: Sun,
    co2: Wind,
  };

  const Icon = icons[sensor.type] || Thermometer;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="gradient-card p-6 rounded-xl border border-purple-500/30"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-lg bg-purple-600">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white capitalize">{sensor.type}</h3>
        </div>
      </div>

      <div className="text-center">
        <p className="text-4xl font-bold text-white mb-1">
          {sensor.value}
          <span className="text-xl text-gray-400 ml-1">{sensor.unit}</span>
        </p>
        <p className="text-gray-500 text-xs">
          {new Date(sensor.timestamp).toLocaleString('pt-BR')}
        </p>
      </div>
    </motion.div>
  );
};

export default SensorCard;