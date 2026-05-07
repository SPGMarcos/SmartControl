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
import { sanitizeText, validateDisplayName } from '@/lib/security';

const Settings = () => {
  const { user } = useAuth();
  const { isDark, setTheme } = useTheme();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (user) {
      setName(user.user_metadata?.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleSave = async () => {
    const safeName = sanitizeText(name, 80);
    const nameError = validateDisplayName(safeName);

    if (nameError) {
      toast({
        title: "Nome inválido",
        description: nameError,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: { full_name: safeName }
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
      setName(safeName);
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
        <div className="mx-auto w-full max-w-2xl space-y-5 sm:space-y-7">
          <div>
            <h1 className="theme-title mb-2 text-3xl font-bold">Configurações</h1>
            <p className="theme-muted">Gerencie suas preferências e integrações</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="theme-card mobile-card space-y-6 rounded-xl p-4 sm:p-8"
          >
            <h2 className="theme-title text-xl font-bold">Perfil</h2>
            
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="mt-2"
              />
            </div>

            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Salvar Alterações
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="theme-card mobile-card space-y-6 rounded-xl p-4 sm:p-8"
          >
            <h2 className="theme-title text-xl font-bold">Aparência</h2>
            
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="theme-title font-medium">Tema do sistema</p>
                <p className="theme-muted text-sm">
                  {isDark ? 'Modo escuro ativo' : 'Modo claro ativo'}
                </p>
              </div>
              <Switch
                checked={isDark}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="theme-card mobile-card space-y-6 rounded-xl p-4 sm:p-8"
          >
            <h2 className="theme-title text-xl font-bold">Integrações</h2>
            
            <div className="space-y-4">
              <div className="theme-panel flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="theme-title font-medium">Amazon Alexa</p>
                  <p className="theme-muted text-sm">Controle por voz</p>
                </div>
                <Button
                  onClick={() => handleIntegration('Alexa')}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Conectar
                </Button>
              </div>

              <div className="theme-panel flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="theme-title font-medium">Google Home</p>
                  <p className="theme-muted text-sm">Assistente Google</p>
                </div>
                <Button
                  onClick={() => handleIntegration('Google Home')}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Conectar
                </Button>
              </div>

              <div className="theme-panel flex flex-col gap-4 rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="theme-title font-medium">NabuCasa</p>
                  <p className="theme-muted text-sm">Home Assistant Cloud</p>
                </div>
                <Button
                  onClick={() => handleIntegration('NabuCasa')}
                  variant="outline"
                  className="w-full sm:w-auto"
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
