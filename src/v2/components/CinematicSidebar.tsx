import { motion } from "framer-motion";
import { LayoutDashboard, Images, Settings, Zap } from "lucide-react";

export const CinematicSidebar = () => {
  return (
    <motion.div
      className="w-20 bg-zinc-950 border-r border-white/5 flex flex-col items-center py-8 gap-8"
      initial={{ x: -100 }}
      animate={{ x: 0 }}
    >
      <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/20">
        <Zap className="text-white" size={20} />
      </div>
      <nav className="flex flex-col gap-6">
        <LayoutDashboard className="text-zinc-500 hover:text-white transition-colors" />
        <Images className="text-zinc-500 hover:text-white transition-colors" />
        <Settings className="text-zinc-500 hover:text-white transition-colors" />
      </nav>
    </motion.div>
  );
};
