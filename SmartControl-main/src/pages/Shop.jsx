import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

const Shop = () => {
  const [cart, setCart] = useState([]);

  const products = [
    {
      id: 1,
      name: 'Kit Básico ESP-01',
      price: 89.90,
      description: 'ESP-01, relé 5V, fonte 5V, cabos',
      image: 'Kit completo com ESP-01 e módulo relé para automação básica'
    },
    {
      id: 2,
      name: 'Kit Avançado ESP32',
      price: 159.90,
      description: 'ESP32, 4 relés, sensores DHT22, fonte',
      image: 'Kit avançado ESP32 com múltiplos relés e sensores de temperatura'
    },
    {
      id: 3,
      name: 'Kit Irrigação Completo',
      price: 249.90,
      description: 'ESP32, válvulas solenoides, sensores de umidade',
      image: 'Sistema completo de irrigação automatizada com válvulas e sensores'
    },
    {
      id: 4,
      name: 'Sensor de Umidade do Solo',
      price: 24.90,
      description: 'Sensor capacitivo resistente à corrosão',
      image: 'Sensor de umidade do solo capacitivo de alta precisão'
    },
    {
      id: 5,
      name: 'Válvula Solenoide 12V',
      price: 45.90,
      description: 'Válvula para irrigação 1/2 polegada',
      image: 'Válvula solenoide para controle de irrigação'
    },
    {
      id: 6,
      name: 'Kit LoRa ESP32',
      price: 199.90,
      description: 'ESP32 com módulo LoRa para longo alcance',
      image: 'Kit ESP32 com comunicação LoRa de longo alcance'
    }
  ];

  const addToCart = (product) => {
    toast({
      title: "🚧 Funcionalidade em desenvolvimento",
      description: "O carrinho de compras será implementado em breve! Por enquanto, entre em contato via WhatsApp para adquirir os produtos.",
    });
  };

  return (
    <>
      <Helmet>
        <title>Loja - Kits DIY SmartControl</title>
        <meta name="description" content="Adquira kits de automação DIY SmartControl. ESP32, sensores, válvulas e muito mais." />
      </Helmet>

      <div className="min-h-screen bg-black">
        <Navbar />

        <section className="pt-32 pb-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-16"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Kits DIY SmartControl
              </h1>
              <p className="text-xl text-gray-400">
                Tudo que você precisa para começar sua automação
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="gradient-card rounded-xl border border-purple-500/30 overflow-hidden"
                >
                  <img className="w-full h-48 object-cover" alt={product.name} src="https://images.unsplash.com/photo-1635865165118-917ed9e20936" />
                  
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-2">{product.name}</h3>
                    <p className="text-gray-400 mb-4">{product.description}</p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-purple-400">
                        R$ {product.price.toFixed(2)}
                      </span>
                      <Button
                        onClick={() => addToCart(product)}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-16 text-center gradient-card p-8 rounded-xl border border-purple-500/30"
            >
              <h2 className="text-2xl font-bold text-white mb-4">
                Precisa de ajuda para escolher?
              </h2>
              <p className="text-gray-400 mb-6">
                Entre em contato conosco pelo WhatsApp e tire suas dúvidas!
              </p>
              <a
                href="https://wa.me/5538999176405"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="bg-green-600 hover:bg-green-700">
                  Falar no WhatsApp
                </Button>
              </a>
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default Shop;