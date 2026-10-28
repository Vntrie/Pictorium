'use client'

import { motion } from "framer-motion";
import { X, Settings2 } from "lucide-react";

export const CinematicSettingsPanel = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      className="fixed right-0 top-0 w-96 h-full bg-zinc-900 border-l border-white/5 p-8 z-50 shadow-2xl"
    >
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-xl font-bold">Studio Settings</h3>
        <button onClick={onClose}><X size={20} /></button>
      </div>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
            <span>Dark Mode Glow</span>
            <div className="w-12 h-6 bg-orange-600 rounded-full" />
        </div>
        <div className="flex justify-between items-center">
            <span>Auto-Analyze</span>
            <div className="w-12 h-6 bg-zinc-700 rounded-full" />
        </div>
      </div>
    </motion.div>
  );
};
