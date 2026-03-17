import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { supabase } from '@/lib/customSupabaseClient';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Save } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSave = async () => {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name }
    });

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Configurações salvas!",
        description: "Suas preferências foram atualizadas.",
      });
    }
  };

  const handleIntegration = (service) => {
    toast({
      title: "🚧 Funcionalidade em desenvolvimento",
      description: `A integração com ${service} será implementada em breve!`,
    });
  };

  return (
    <>
      <Helmet>
        <title>Configurações - SmartControl</title>
        <meta name="description" content="Configure suas preferências e integrações SmartControl." />
      </Helmet>

      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Configurações</h1>
            <p className="text-gray-400">Gerencie suas preferências e integrações</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="gradient-card p-8 rounded-xl border border-purple-500/30 space-y-6"
          >
            <h2 className="text-xl font-bold text-white">Perfil</h2>
            
            <div>
              <Label htmlFor="name" className="text-white">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 bg-black/50 border-purple-500/30 text-white"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-white">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="mt-2 bg-black/50 border-purple-500/30 text-white"
              />
            </div>

            <Button onClick={handleSave} className="bg-purple-600 hover:bg-purple-700">
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="gradient-card p-8 rounded-xl border border-purple-500/30 space-y-6"
          >
            <h2 className="text-xl font-bold text-white">Aparência</h2>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Modo Escuro</p>
                <p className="text-gray-400 text-sm">Ativar tema escuro</p>
              </div>
              <Switch checked={isDark} onCheckedChange={toggleTheme} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="gradient-card p-8 rounded-xl border border-purple-500/30 space-y-6"
          >
            <h2 className="text-xl font-bold text-white">Integrações</h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">Amazon Alexa</p>
                  <p className="text-gray-400 text-sm">Controle por voz</p>
                </div>
                <Button
                  onClick={() => handleIntegration('Alexa')}
                  variant="outline"
                  className="border-purple-500/30"
                >
                  Conectar
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">Google Home</p>
                  <p className="text-gray-400 text-sm">Assistente Google</p>
                </div>
                <Button
                  onClick={() => handleIntegration('Google Home')}
                  variant="outline"
                  className="border-purple-500/30"
                >
                  Conectar
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 bg-black/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">NabuCasa</p>
                  <p className="text-gray-400 text-sm">Home Assistant Cloud</p>
                </div>
                <Button
                  onClick={() => handleIntegration('NabuCasa')}
                  variant="outline"
                  className="border-purple-500/30"
                >
                  Conectar
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default Settings;