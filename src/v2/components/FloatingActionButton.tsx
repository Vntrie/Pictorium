import { motion } from "framer-motion";

export const FloatingActionButton = ({ onClick, children }: { onClick: () => void, children: React.ReactNode }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-8 right-8 p-4 bg-orange-600 rounded-full shadow-[0_0_30px_rgba(234,88,12,0.4)] text-white"
    >
      {children}
    </motion.button>
  );
};
