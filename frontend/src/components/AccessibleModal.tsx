import { useEffect, useRef, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface AccessibleModalProps {
  children: ReactNode;
  labelledBy: string;
  onClose: () => void;
  className?: string;
  panelClassName?: string;
  bottomSheet?: boolean;
}

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const EASE_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

export default function AccessibleModal({
  children,
  labelledBy,
  onClose,
  className = '',
  panelClassName = '',
  bottomSheet = false,
}: AccessibleModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(focusableSelector);
    window.setTimeout(() => {
      (firstFocusable || panel)?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(focusableSelector)
      ).filter((element) => element.offsetParent !== null);

      if (focusableElements.length === 0) {
        event.preventDefault();
        panelRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus?.();
    };
  }, [onClose]);

  return (
    <motion.div
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex overscroll-contain ${
        bottomSheet
          ? 'items-end sm:items-center justify-center p-0 sm:p-4'
          : 'items-center justify-center p-4'
      } ${className}`}
      onMouseDown={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`overscroll-contain ${panelClassName}`}
        onMouseDown={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20, scale: prefersReducedMotion ? 1 : 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.24, ease: EASE_EXPO }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}
