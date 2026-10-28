'use client'

import { motion } from "framer-motion";
import { CinematicPanel } from "@/v2/components/CinematicPanel";
import { FloatingActionButton } from "@/v2/components/FloatingActionButton";
import { Plus } from "lucide-react";

export default function V2Page() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative p-8">
      {/* Ambient Glows */}
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-600/20 blur-[128px] rounded-full"
      />

      <CinematicPanel className="z-10 text-center max-w-xl">
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-6xl font-bold mb-6 tracking-tight"
        >
          FlameForge <span className="text-orange-500">2.0</span>
        </motion.h1>
        <p className="text-zinc-400 text-xl mb-10">
          The cinematic evolution of media organization.
        </p>
        <div className="grid grid-cols-2 gap-4">
           <button className="px-6 py-4 bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl transition-all">
             My Posters
           </button>
           <button className="px-6 py-4 bg-orange-600 hover:bg-orange-500 rounded-2xl transition-all font-semibold">
             Create New
           </button>
        </div>
      </CinematicPanel>

      <FloatingActionButton onClick={() => console.log("New Project")}>
        <Plus size={24} />
      </FloatingActionButton>
    </div>
  );
}
