'use client'

import { motion } from "framer-motion";
import { getAtmosphericPosterUrl } from "@/v2/lib/atmosphere-controller";

export const CinematicAtmospherePreview = ({
  type,
  id,
  title,
  params
}: {
  type: 'movie' | 'series',
  id: string,
  title: string,
  params: Record<string, string>
}) => {
  const posterUrl = getAtmosphericPosterUrl(type, id, params);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black relative"
    >
      <img src={posterUrl} alt={title} className="w-full h-auto aspect-[2/3] object-cover" />
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
        <h4 className="text-white font-semibold">{title}</h4>
        <p className="text-orange-500 text-xs">Cinematic Render</p>
      </div>
    </motion.div>
  );
};
