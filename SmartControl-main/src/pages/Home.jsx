import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  Droplets,
  Gauge,
  Home as HomeIcon,
  Leaf,
  Lightbulb,
  LockKeyhole,
  Shield,
  ShieldCheck,
  Smartphone,
  Sprout,
  Tractor,
  Warehouse,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import MarketplaceModal from '@/components/MarketplaceModal';
import heroImage from '@/assets/smartcontrol-hero.svg';

const Home = () => {
  const basePath = import.meta.env.BASE_URL || '/';
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://smartcontrol.app';
  const homeUrl = `${siteUrl}${normalizedBasePath}`;
  const socialImageUrl = `${siteUrl}${normalizedBasePath}logo.png`;

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

  const commercialHighlights = [
    'Controle remoto de bombas, válvulas, iluminação e sensores',
    'Projetado para ESP32, ESP8266, Home Assistant e automações IoT',
    'Painel web responsivo para residência, horta, estufa e campo',
  ];

  const securityHighlights = [
    {
      icon: LockKeyhole,
      title: 'Acesso protegido',
      description: 'Rotas privadas, validação de sessão e autenticação centralizada pelo Supabase Auth.',
    },
    {
      icon: ShieldCheck,
      title: 'Dados validados',
      description: 'Formulários com validação de email, senha forte e sanitização de informações do usuário.',
    },
    {
      icon: Cpu,
      title: 'Base comercial',
      description: 'Configuração por ambiente, tratamento de erros e estrutura preparada para crescer com segurança.',
    },
  ];

  const plans = [
    {
      icon: HomeIcon,
      name: 'Residencial Smart',
      profile: 'Usuários residenciais',
      description: 'Automação de iluminação, jardim, piscina, portão e irrigação doméstica com controle remoto simples.',
      benefits: ['Até 10 dispositivos', 'Alertas básicos', 'Controle via painel web', 'Preparado para voz e Home Assistant'],
    },
    {
      icon: Leaf,
      name: 'Horta Urbana',
      profile: 'Hortas urbanas',
      description: 'Solução para pequenos cultivos com irrigação programada, sensores de umidade e acompanhamento diário.',
      benefits: ['Irrigação por setores', 'Sensores ambientais', 'Histórico de acionamentos', 'Suporte de implantação'],
    },
    {
      icon: Sprout,
      name: 'Produtor Essencial',
      profile: 'Pequenos produtores',
      description: 'Controle de bombas, válvulas e iluminação para produtores que precisam reduzir trabalho manual.',
      benefits: ['Até 25 dispositivos', 'Rotinas de automação', 'Monitoramento remoto', 'Integração com ESP32/ESP8266'],
    },
    {
      icon: Tractor,
      name: 'Agro Profissional',
      profile: 'Agricultores',
      description: 'Automação agrícola para áreas maiores com mais pontos de controle, telemetria e operação por projeto.',
      benefits: ['Projetos por área', 'Controle de bombas', 'Status online/offline', 'Base para MQTT e integrações externas'],
    },
    {
      icon: Warehouse,
      name: 'Estufa Inteligente',
      profile: 'Estufas automatizadas',
      description: 'Controle climático, irrigação, sensores e acionamentos rápidos para ambientes controlados.',
      benefits: ['Sensores de ambiente', 'Controle climático', 'Alertas operacionais', 'Dashboard centralizado'],
    },
    {
      icon: Gauge,
      name: 'Agro Escala',
      profile: 'Grandes produtores',
      description: 'Base para operação comercial com múltiplos projetos, dispositivos distribuídos e expansão sob demanda.',
      benefits: ['Múltiplas unidades', 'Arquitetura escalável', 'Suporte personalizado', 'Integrações futuras com voz e cloud'],
    },
  ];

  return (
    <>
      <Helmet>
        <title>SmartControl | Automação Residencial, Irrigação Inteligente e IoT</title>
        <meta
          name="description"
          content="SmartControl é uma plataforma para automação residencial, irrigação inteligente, automação agrícola e controle IoT com ESP32, ESP8266, Home Assistant e soluções inteligentes."
        />
        <meta
          name="keywords"
          content="SmartControl, automação residencial, irrigação inteligente, automação agrícola, IoT, ESP32, ESP8266, Home Assistant, sensores, válvulas solenoides, iluminação inteligente, automação de fazendas"
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={homeUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:title" content="SmartControl | Automação Residencial e Agrícola Inteligente" />
        <meta
          property="og:description"
          content="Controle dispositivos IoT, irrigação, iluminação, sensores e automações inteligentes em uma plataforma profissional."
        />
        <meta property="og:url" content={homeUrl} />
        <meta property="og:image" content={socialImageUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SmartControl | Automação Inteligente" />
        <meta
          name="twitter:description"
          content="Automação residencial, agrícola e irrigação inteligente com ESP32, ESP8266, Home Assistant e IoT."
        />
        <meta name="twitter:image" content={socialImageUrl} />
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
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold text-white mb-6">
                Smart<span className="text-purple-400">Control</span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
                Automação residencial e agrícola de última geração. Controle seus dispositivos IoT de qualquer lugar.
              </p>
              <p className="mx-auto mb-6 max-w-3xl text-base text-gray-400 md:text-lg">
                Uma solução para quem precisa operar automação residencial, irrigação inteligente,
                estufas, bombas, válvulas e sensores com mais previsibilidade e menos trabalho manual.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register">
                  <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-6 text-lg">
                    Começar Agora
                  </Button>
                </Link>
                <MarketplaceModal triggerLabel="Ver Loja" triggerMode="button" triggerClassName="px-8 py-6 text-lg" />
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
              className="mt-16"
            >
              <div className="relative mx-auto max-w-5xl">
                <div className="absolute -inset-4 rounded-3xl bg-purple-600/20 blur-2xl"></div>
                <div className="relative overflow-hidden rounded-3xl border border-purple-500/30 bg-black/60 shadow-2xl shadow-purple-950/30">
                  <img
                    className="w-full object-cover"
                    alt="SmartControl controlando casa inteligente, irrigação e sensores IoT"
                    src={heroImage}
                    loading="eager"
                    decoding="async"
                  />
                  <div className="absolute left-4 top-4 hidden rounded-full border border-purple-400/30 bg-black/70 px-4 py-2 text-sm text-purple-100 backdrop-blur md:block">
                    Casa inteligente + irrigação + IoT
                  </div>
                  <div className="absolute bottom-4 right-4 hidden rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-left text-sm text-gray-200 backdrop-blur md:block">
                    <span className="block font-semibold text-white">Pronto para ESP32 e ESP8266</span>
                    <span className="text-gray-400">Base visual para automação real</span>
                  </div>
                </div>
              </div>
              <div className="mb-8 flex flex-wrap justify-center gap-3 mt-8">
                {commercialHighlights.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-black/40 px-4 py-2 text-sm text-gray-200"
                  >
                    <CheckCircle2 className="h-4 w-4 text-purple-300" />
                    {item}
                  </span>
                ))}
              </div>
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

        <section className="py-20 px-4 bg-gradient-to-b from-gray-900 via-black to-gray-900">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]"
            >
              <div>
                <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-200">
                  <ShieldCheck className="h-4 w-4" />
                  Plataforma preparada para operação profissional
                </span>
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-5">
                  Segurança, clareza e controle para vender como produto real
                </h2>
                <p className="text-lg leading-8 text-gray-400">
                  A SmartControl centraliza dispositivos, sensores e automações em uma experiência única.
                  O objetivo é entregar mais controle para residências, produtores e empresas que precisam
                  acompanhar tudo remotamente, com uma base mais confiável para evoluir para integrações,
                  MQTT, Home Assistant e dispositivos reais.
                </p>
              </div>

              <div className="grid gap-4">
                {securityHighlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="gradient-card rounded-2xl border border-purple-500/20 p-5 transition hover:border-purple-400/50"
                    >
                      <div className="flex items-start gap-4">
                        <span className="rounded-2xl border border-white/10 bg-purple-500/10 p-3">
                          <Icon className="h-6 w-6 text-purple-300" />
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-gray-400">{item.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-20 px-4 bg-gradient-to-b from-gray-900 to-black">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="mb-14 text-center"
            >
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-200">
                <ArrowRight className="h-4 w-4" />
                Planos por perfil de cliente
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Uma SmartControl para cada tipo de operação
              </h2>
              <p className="mx-auto max-w-3xl text-lg text-gray-400">
                A plataforma fica organizada para atender desde uma casa inteligente até uma operação agrícola
                com estufas, setores de irrigação, bombas, sensores e dispositivos distribuídos.
              </p>
            </motion.div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {plans.map((plan, index) => {
                const Icon = plan.icon;
                return (
                  <motion.div
                    key={plan.name}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.08 }}
                    viewport={{ once: true }}
                    className="gradient-card flex h-full flex-col rounded-2xl border border-purple-500/20 p-6 hover:border-purple-400/50"
                  >
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <span className="rounded-2xl border border-white/10 bg-purple-500/10 p-3">
                        <Icon className="h-7 w-7 text-purple-300" />
                      </span>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-gray-300">
                        {plan.profile}
                      </span>
                    </div>

                    <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
                    <p className="mt-3 flex-1 text-sm leading-6 text-gray-400">{plan.description}</p>

                    <div className="mt-6 space-y-3">
                      {plan.benefits.map((benefit) => (
                        <div key={benefit} className="flex items-start gap-3 text-sm text-gray-300">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-purple-300" />
                          <span>{benefit}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>
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
