import React from 'react';
import { Instagram, MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const Footer = () => {
  const location = useLocation();
  // Se estiver em uma rota que começa com /dashboard, /devices, /add-device, /settings, /admin, aplica padding extra à esquerda
  const isDashboard = /^\/(dashboard|devices|add-device|settings|admin)/.test(location.pathname);
  const sidebarWidth = 256; // igual ao SIDEBAR_WIDTH do DashboardLayout
  return (
    <footer
      className="bg-black border-t border-purple-500/30 py-12 px-4"
      style={isDashboard ? { paddingLeft: sidebarWidth } : {}}
    >
      <div className="container mx-auto max-w-6xl">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-4">
              Smart<span className="text-purple-400">Control</span>
            </h3>
            <p className="text-gray-400">
              Plataforma inteligente de automação residencial e agrícola
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Links Rápidos</h4>
            <ul className="space-y-2">
              <li>
                <a href="/" className="text-gray-400 hover:text-purple-400 transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="/shop" className="text-gray-400 hover:text-purple-400 transition-colors">
                  Loja
                </a>
              </li>
              <li>
                <a href="/login" className="text-gray-400 hover:text-purple-400 transition-colors">
                  Login
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-4">Contato</h4>
            <div className="space-y-3">
              <a
                href="https://wa.me/5538999176405"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-green-400 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                <span>(38) 99917-6405</span>
              </a>
              <a
                href="https://instagram.com/marcosgabrielfer"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-gray-400 hover:text-purple-400 transition-colors"
              >
                <Instagram className="w-5 h-5" />
                <span>@marcosgabrielfer</span>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-purple-500/30 text-center">
          <p className="text-gray-400">
            © 2024 SmartControl - Criado por Marcos Gabriel Ferreira Miranda
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;