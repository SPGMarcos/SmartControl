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
      <Dialog.Content className="theme-card fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl shadow-purple-950/40">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <Dialog.Title className="text-xl font-bold theme-title">{title}</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-6 theme-muted">
              {description}
            </Dialog.Description>
          </div>
          <Dialog.Close className="rounded-full border border-[var(--border-color)] bg-[var(--button-ghost-hover)] p-2 text-[var(--button-ghost-text)] transition hover:border-[var(--accent-purple)] hover:text-[var(--text-strong)]">
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
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            onClick={async () => {
              await onConfirm?.();
            }}
            disabled={loading}
            variant={destructive ? 'destructive' : 'default'}
          >
            {loading ? 'Aguarde...' : confirmLabel}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export default ConfirmDialog;
