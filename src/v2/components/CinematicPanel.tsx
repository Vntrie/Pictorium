import { motion } from "framer-motion";

export const CinematicPanel = ({ children, className }: { children: React.ReactNode, className?: string }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className={`cinematic-panel p-6 rounded-2xl ${className}`}
    >
      {children}
    </motion.div>
  );
};
