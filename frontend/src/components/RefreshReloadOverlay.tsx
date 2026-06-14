import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { RotateCw } from 'lucide-react';

interface RefreshReloadOverlayProps {
  show: boolean;
  title?: string;
  message?: string;
}

export default function RefreshReloadOverlay({
  show,
  title = 'Aktualisierung läuft',
  message = 'Daten werden neu geladen...',
}: RefreshReloadOverlayProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="status"
          aria-live="assertive"
          aria-busy="true"
          className="fixed inset-0 z-[80] flex items-center justify-center bg-gray-950/92 px-6 text-center backdrop-blur-md"
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <motion.div
            className="flex w-full max-w-xs flex-col items-center"
            initial={prefersReducedMotion ? undefined : { y: 10, scale: 0.98 }}
            animate={prefersReducedMotion ? undefined : { y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary-800/50 bg-gray-900 shadow-[0_0_40px_rgba(220,38,38,0.22)]">
              <motion.span
                aria-hidden="true"
                className="inline-flex text-primary-300"
                animate={prefersReducedMotion ? undefined : { rotate: 360 }}
                transition={prefersReducedMotion ? undefined : { duration: 0.8, ease: 'linear', repeat: Infinity }}
              >
                <RotateCw className="h-9 w-9" />
              </motion.span>
            </div>
            <p className="font-heading text-2xl font-bold text-white">{title}</p>
            <p className="mt-2 text-sm text-gray-300">{message}</p>
            <div className="mt-6 h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
              <motion.div
                className="h-full rounded-full bg-primary-500"
                initial={{ x: '-100%' }}
                animate={prefersReducedMotion ? { x: '0%' } : { x: '100%' }}
                transition={prefersReducedMotion ? { duration: 0.01 } : { duration: 0.9, ease: 'easeInOut', repeat: Infinity }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
