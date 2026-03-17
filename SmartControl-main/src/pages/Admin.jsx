import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/lib/customSupabaseClient';
import { Users, Activity, Zap } from 'lucide-react';

const Admin = () => {
  const [users, setUsers] = useState([]);
  const [allDevices, setAllDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      
      const { data: usersData, error: usersError } = await supabase.rpc('get_all_users');
      if (usersError) console.error('Error fetching users:', usersError);
      else setUsers(usersData || []);

      const { data: devicesData, error: devicesError } = await supabase.from('devices').select('*');
      if (devicesError) console.error('Error fetching devices:', devicesError);
      else setAllDevices(devicesData || []);

      setLoading(false);
    };
    
    fetchAdminData();
  }, []);

  const stats = [
    {
      icon: Users,
      label: 'Total de Usuários',
      value: users.length,
      color: 'text-blue-400'
    },
    {
      icon: Zap,
      label: 'Dispositivos Cadastrados',
      value: allDevices.length,
      color: 'text-purple-400'
    },
    {
      icon: Activity,
      label: 'Dispositivos Ativos',
      value: allDevices.filter(d => d.status).length,
      color: 'text-green-400'
    }
  ];

  if (loading) {
    return <DashboardLayout><div className="text-white">Carregando dados administrativos...</div></DashboardLayout>;
  }

  return (
    <>
      <Helmet>
        <title>Administração - SmartControl</title>
        <meta name="description" content="Painel administrativo SmartControl." />
      </Helmet>

      <DashboardLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Administração</h1>
            <p className="text-gray-400">Painel de controle administrativo</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="gradient-card p-6 rounded-xl border border-purple-500/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">{stat.label}</p>
                    <p className="text-3xl font-bold text-white mt-2">{stat.value}</p>
                  </div>
                  <stat.icon className={`w-12 h-12 ${stat.color}`} />
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="gradient-card p-8 rounded-xl border border-purple-500/30"
          >
            <h2 className="text-xl font-bold text-white mb-6">Usuários Cadastrados</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-500/30">
                    <th className="text-left text-gray-400 pb-4">Nome</th>
                    <th className="text-left text-gray-400 pb-4">Email</th>
                    <th className="text-left text-gray-400 pb-4">Função</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-purple-500/10">
                      <td className="py-4 text-white">{user.full_name || 'N/A'}</td>
                      <td className="py-4 text-gray-400">{user.email}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          user.role === 'admin' 
                            ? 'bg-purple-500/20 text-purple-400' 
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {user.role || 'user'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    </>
  );
};

export default Admin;