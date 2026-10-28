'use client'

import { motion } from "framer-motion";

export const CinematicComparison = ({ originalUrl, generatedUrl }: { originalUrl: string, generatedUrl: string }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <p className="text-zinc-500 text-xs">Original Reference</p>
        <img src={originalUrl} alt="Original" className="rounded-xl border border-white/5 shadow-lg" />
      </div>
      <div className="space-y-2">
        <p className="text-orange-500 text-xs">Cinematic Version</p>
        <img src={generatedUrl} alt="Generated" className="rounded-xl border border-orange-500/20 shadow-[0_0_20px_rgba(234,88,12,0.2)]" />
      </div>
    </div>
  );
};
