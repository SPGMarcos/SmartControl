import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
  onOpenChange,
  onClose,
}) => (
  <Dialog.Root
    open={open}
    onOpenChange={(nextOpen) => {
      onOpenChange?.(nextOpen);
      if (!nextOpen) onClose?.();
    }}
  >
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm" />
      <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-purple-500/30 bg-black p-6 shadow-2xl shadow-purple-950/40">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <Dialog.Title className="text-xl font-bold text-white">{title}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 text-gray-400">
              {description}
            </Dialog.Description>
          </div>
          <Dialog.Close className="rounded-full border border-white/10 bg-white/5 p-2 text-gray-300 transition hover:border-purple-400/60 hover:text-white">
            <X className="h-4 w-4" />
          </Dialog.Close>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onOpenChange?.(false);
              onClose?.();
            }}
            className="border-purple-500/30 bg-black/30 text-gray-300 hover:bg-purple-600/20 hover:text-white"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={async () => {
              await onConfirm?.();
            }}
            disabled={loading}
            className={destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-purple-600 hover:bg-purple-700'}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export default ConfirmDialog;
