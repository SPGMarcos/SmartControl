import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Zap, Droplets, Lightbulb, Gauge, Shield, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Home = () => {
  const features = [
    {
      icon: Zap,
      title: 'Automação Inteligente',
      description: 'Controle total de dispositivos IoT em tempo real',
    },
    {
      icon: Droplets,
      title: 'Irrigação Automatizada',
      description: 'Gestão eficiente de válvulas e sistemas de irrigação',
    },
    {
      icon: Lightbulb,
      title: 'Iluminação Smart',
      description: 'Controle de iluminação com agendamento e sensores',
    },
    {
      icon: Gauge,
      title: 'Monitoramento',
      description: 'Sensores de temperatura, umidade, CO₂ e mais',
    },
    {
      icon: Shield,
      title: 'Segurança',
      description: 'Criptografia e autenticação de ponta a ponta',
    },
    {
      icon: Smartphone,
      title: 'App PWA',
      description: 'Acesso via navegador ou app instalável',
    },
  ];
  return (
    <>
      <Helmet>
        <title>SmartControl - Automação Residencial e Agrícola Inteligente</title>
        <meta name="description" content="Plataforma completa de automação residencial e agrícola. Controle dispositivos IoT, válvulas de irrigação, iluminação e sensores remotamente." />
      </Helmet>

      <div className="bg-black">
        <section className="relative pt-32 pb-20 px-4 overflow-hidden">
          <div className="absolute inset-0 gradient-purple opacity-50"></div>
          <div className={`absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20`}></div>

          <div className="container mx-auto max-w-6xl relative z-10">
            <motion.div
              initial={{
                opacity: 0,
                y: 30,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.8,
              }}
              className="text-center"
            >
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
                Smart<span className="text-purple-400">Control</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Automação residencial e agrícola de última geração. Controle seus dispositivos IoT de qualquer lugar.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register">
                  <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg">
                    Começar Agora
                  </Button>
                </Link>
                <Link to="/shop">
                  <Button size="lg" variant="outline" className="border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white px-8 py-6 text-lg">
                    Ver Kits DIY
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{
                opacity: 0,
                y: 50,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.8,
                delay: 0.3,
              }}
              className="mt-20"
            >
              <img className="w-full max-w-4xl mx-auto rounded-2xl shadow-2xl border border-purple-500/30" alt="SmartControl Dashboard" src="https://horizons-cdn.hostinger.com/e9ad8fef-df84-4261-b25c-4c136c187f76/chatgpt-image-11-de-out.-de-2025-21_45_20-YBWsd.png" />
            </motion.div>
          </div>
        </section>

        <section className="py-20 px-4 bg-gradient-to-b from-black to-gray-900">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{
                opacity: 0,
              }}
              whileInView={{
                opacity: 1,
              }}
              transition={{
                duration: 0.8,
              }}
              viewport={{
                once: true,
              }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Recursos Poderosos</h2>
              <p className="text-xl text-gray-400">Tudo que você precisa para automação completa</p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{
                    opacity: 0,
                    y: 30,
                  }}
                  whileInView={{
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                  }}
                  viewport={{
                    once: true,
                  }}
                  className="gradient-card p-6 rounded-xl border border-purple-500/20 hover:border-purple-500/50 transition-all"
                >
                  <feature.icon className="w-12 h-12 text-purple-400 mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-gradient-to-b from-gray-900 to-black">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{
                opacity: 0,
              }}
              whileInView={{
                opacity: 1,
              }}
              transition={{
                duration: 0.8,
              }}
              viewport={{
                once: true,
              }}
              className="text-center"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Pronto para começar?</h2>
              <p className="text-xl text-gray-400 mb-8">Crie sua conta gratuitamente e comece a automatizar hoje mesmo</p>
              <Link to="/register">
                <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-6 text-lg">
                  Criar Conta Grátis
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};
export default Home;