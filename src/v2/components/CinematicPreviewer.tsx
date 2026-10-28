import { motion } from "framer-motion";
import { getPosterUrl } from "@/v2/lib/poster-client";

export const CinematicPreviewer = ({ type, id, title }: { type: 'movie' | 'series', id: string, title: string }) => {
  const posterUrl = getPosterUrl({ type, id });

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative group rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-zinc-900"
    >
      <img src={posterUrl} alt={title} className="w-full h-auto aspect-[2/3] object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
        <h3 className="text-white font-bold text-lg">{title}</h3>
      </div>
    </motion.div>
  );
};
