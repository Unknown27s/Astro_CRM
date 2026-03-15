import React from 'react';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnEscape?: boolean;
  closeOnClickOutside?: boolean;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
};

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      isOpen,
      onClose,
      title,
      children,
      footer,
      size = 'md',
      closeOnEscape = true,
      closeOnClickOutside = true,
    },
    ref
  ) => {
    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (closeOnEscape && e.key === 'Escape' && isOpen) {
          onClose();
        }
      };

      if (isOpen) document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEscape, onClose]);

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black/50"
          onClick={closeOnClickOutside ? onClose : undefined}
        />
        <div
          ref={ref}
          className={cn(
            'relative bg-white rounded-xl shadow-xl p-6 w-full animate-fadeIn',
            sizeClasses[size]
          )}
        >
          {title && (
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
            </div>
          )}
          <div className="mb-6">{children}</div>
          {footer && <div className="border-t border-neutral-200 pt-4">{footer}</div>}
        </div>
      </div>
    );
  }
);
Modal.displayName = 'Modal';

interface AlertProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

const Alert = ({
  isOpen,
  onClose,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'info',
  loading = false,
}: AlertProps) => {
  const variantColors = {
    danger: 'text-danger-600',
    warning: 'text-warning-600',
    info: 'text-primary-600',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
    >
      <p className={cn('text-sm mb-4', variantColors[variant])}>{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-all"
          disabled={loading}
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className={cn(
            'px-4 py-2 rounded-lg text-white font-medium transition-all disabled:opacity-50',
            variant === 'danger' ? 'bg-danger-600 hover:bg-danger-700' : 'bg-primary-600 hover:bg-primary-700'
          )}
          disabled={loading}
        >
          {loading ? '...' : confirmText}
        </button>
      </div>
    </Modal>
  );
};

export { Modal, Alert };
