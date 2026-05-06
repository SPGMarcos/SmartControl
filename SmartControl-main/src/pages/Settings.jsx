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
        <div className="mx-auto w-full max-w-2xl space-y-6 sm:space-y-8">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">Gerencie suas preferências e integrações</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="gradient-card mobile-card space-y-6 rounded-xl border border-purple-500/30 p-4 sm:p-8"
          >
            <h2 className="text-xl font-bold text-foreground">Perfil</h2>
            
            <div>
              <Label htmlFor="name" className="text-foreground">Nome</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 border-border bg-background text-foreground"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="mt-2 border-border bg-muted text-muted-foreground"
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
            className="gradient-card mobile-card space-y-6 rounded-xl border border-purple-500/30 p-4 sm:p-8"
          >
            <h2 className="text-xl font-bold text-foreground">Aparência</h2>
            
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-foreground">Tema do sistema</p>
                <p className="text-sm text-muted-foreground">
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
            className="gradient-card mobile-card space-y-6 rounded-xl border border-purple-500/30 p-4 sm:p-8"
          >
            <h2 className="text-xl font-bold text-foreground">Integrações</h2>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Amazon Alexa</p>
                  <p className="text-sm text-muted-foreground">Controle por voz</p>
                </div>
                <Button
                  onClick={() => handleIntegration('Alexa')}
                  variant="outline"
                  className="w-full border-purple-500/30 sm:w-auto"
                >
                  Conectar
                </Button>
              </div>

              <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">Google Home</p>
                  <p className="text-sm text-muted-foreground">Assistente Google</p>
                </div>
                <Button
                  onClick={() => handleIntegration('Google Home')}
                  variant="outline"
                  className="w-full border-purple-500/30 sm:w-auto"
                >
                  Conectar
                </Button>
              </div>

              <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">NabuCasa</p>
                  <p className="text-sm text-muted-foreground">Home Assistant Cloud</p>
                </div>
                <Button
                  onClick={() => handleIntegration('NabuCasa')}
                  variant="outline"
                  className="w-full border-purple-500/30 sm:w-auto"
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
