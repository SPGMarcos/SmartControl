import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Instagram, MessageCircle, PackageSearch, ShoppingBag, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const contactMessage = encodeURIComponent('Ola! Quero conhecer as solucoes SmartControl.');

const marketplaceOptions = [
  {
    icon: MessageCircle,
    title: 'Atendimento pelo WhatsApp',
    description: 'Fale direto para montar seu kit, tirar duvidas e solicitar orcamento.',
    href: `https://wa.me/5538999176405?text=${contactMessage}`,
    label: 'Chamar no WhatsApp',
    external: true,
    accent: 'text-green-400',
  },
  {
    icon: Instagram,
    title: 'Instagram SmartControl',
    description: 'Acompanhe novidades, instalacoes, bastidores e atualizacoes da plataforma.',
    href: 'https://instagram.com/marcosgabrielfer',
    label: '@marcosgabrielfer',
    external: true,
    accent: 'text-purple-300',
  },
  {
    icon: PackageSearch,
    title: 'Catalogo de produtos',
    description: 'Veja kits ESP32, sensores, valvulas, reles e solucoes de automacao.',
    href: '/shop',
    label: 'Abrir catalogo',
    external: false,
    accent: 'text-slate-200',
  },
  {
    icon: Sparkles,
    title: 'Marketplace futuro',
    description: 'Area preparada para venda online de controladores e dispositivos SmartControl.',
    label: 'Em breve',
    disabled: true,
    accent: 'text-purple-400',
  },
];

const MarketplaceModal = ({
  triggerLabel = 'Loja',
  triggerMode = 'link',
  triggerClassName = '',
  triggerSize = 'lg',
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  const trigger =
    triggerMode === 'button' ? (
      <Button
        type="button"
        size={triggerSize}
        variant="outline"
        onClick={() => setOpen(true)}
        className={`border-purple-400 text-purple-400 hover:bg-purple-400 hover:text-white ${triggerClassName}`}
      >
        {triggerLabel}
      </Button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-gray-300 hover:text-white transition-colors ${triggerClassName}`}
      >
        {triggerLabel}
      </button>
    );

  const modal = open ? (
    <div
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto px-4 py-8 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="marketplace-title"
        >
          <button
            type="button"
            aria-label="Fechar marketplace"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative z-10 max-h-[calc(100vh-4rem)] w-full max-w-4xl overflow-y-auto rounded-3xl border border-purple-500/30 bg-black shadow-2xl shadow-purple-950/40">
            <div className="absolute inset-0 gradient-purple opacity-25" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.24),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />

            <div className="relative p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-200">
                    <ShoppingBag className="h-4 w-4" />
                    Marketplace SmartControl
                  </div>
                  <h2 id="marketplace-title" className="text-2xl font-bold text-white sm:text-4xl">
                    Solucoes inteligentes para casa, campo e empresas
                  </h2>
                  <p className="mt-3 max-w-2xl text-base text-gray-300 sm:text-lg">
                    Escolha um canal para comprar kits, pedir orcamento ou acompanhar as novidades da SmartControl.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-gray-300 transition hover:border-purple-400/60 hover:text-white"
                  aria-label="Fechar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {marketplaceOptions.map((option) => {
                  const Icon = option.icon;
                  const cardClass =
                    'group block rounded-2xl border border-purple-500/20 bg-black/55 p-5 text-left transition hover:-translate-y-1 hover:border-purple-400/60 hover:bg-purple-950/20';

                  const content = (
                    <>
                      <div className="flex items-center gap-3">
                        <span className="rounded-2xl border border-white/10 bg-white/5 p-3">
                          <Icon className={`h-6 w-6 ${option.accent}`} />
                        </span>
                        <h3 className="text-lg font-semibold text-white">{option.title}</h3>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-gray-400">{option.description}</p>
                      <span className="mt-5 inline-flex text-sm font-semibold text-purple-300 group-hover:text-purple-200">
                        {option.label}
                      </span>
                    </>
                  );

                  if (option.disabled) {
                    return (
                      <div key={option.title} className={`${cardClass} cursor-not-allowed opacity-80`}>
                        {content}
                      </div>
                    );
                  }

                  if (option.external) {
                    return (
                      <a
                        key={option.title}
                        href={option.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cardClass}
                      >
                        {content}
                      </a>
                    );
                  }

                  return (
                    <Link key={option.title} to={option.href} onClick={() => setOpen(false)} className={cardClass}>
                      {content}
                    </Link>
                  );
                })}
              </div>

              <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-sm text-gray-300">
                Produtos planejados: controladores ESP32 e ESP8266, sensores ambientais, reles, valvulas solenoides,
                kits de irrigacao inteligente, iluminacao smart e automacao personalizada.
              </div>
            </div>
          </div>
    </div>
  ) : null;

  return (
    <>
      {trigger}
      {modal && (typeof document !== 'undefined' ? createPortal(modal, document.body) : modal)}
    </>
  );
};

export default MarketplaceModal;
