import React, { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const dialogVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
  exit: { opacity: 0, scale: 0.98, y: 10, transition: { duration: 0.12 } },
};

const ConfirmDialog = ({ open, title = 'Confirmar', description, onConfirm, onClose }) => {
  const dialogRef = useRef(null);
  const firstButtonRef = useRef(null);

  useEffect(() => {
    if (open) {
      // bloqueia scroll do body
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // foca botão 'Não' por padrão
      setTimeout(() => firstButtonRef.current?.focus(), 0);

      const handleKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose?.();
        } else if (e.key === 'Tab') {
          // focus trap simples
          const focusable = dialogRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (!focusable || focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      };

      window.addEventListener('keydown', handleKey);
      return () => {
        window.removeEventListener('keydown', handleKey);
        document.body.style.overflow = prev;
      };
    }
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            aria-hidden="true"
          />
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial="hidden"
            animate="visible"
            exit="hidden"
          >
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
              aria-describedby="confirm-dialog-desc"
              className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl"
              variants={dialogVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 id="confirm-dialog-title" className="text-lg font-bold text-foreground">
                    {title}
                  </h3>
                  {description && (
                    <p id="confirm-dialog-desc" className="mt-2 text-sm text-muted-foreground">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  aria-label="Fechar"
                  onClick={onClose}
                  className="rounded-md p-2 text-foreground/60 hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={onClose}
                  ref={firstButtonRef}
                >
                  Não
                </Button>

                <Button
                  variant="destructive"
                  onClick={() => {
                    Promise.resolve(onConfirm && onConfirm()).finally(() => onClose && onClose());
                  }}
                >
                  Sim, excluir
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConfirmDialog;