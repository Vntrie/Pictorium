'use client'

import { useState } from "react";
import { motion } from "framer-motion";
import { analyzePosterPalette } from "@/v2/lib/analysis/palette";
import { getAestheticParams } from "@/v2/lib/analysis/aesthetic-mapper";

export const ReverseEnginePanel = ({ onParamsChange }: { onParamsChange: (params: Record<string, string>) => void }) => {
  const [palette, setPalette] = useState<number[][]>([]);
  const [params, setParams] = useState<Record<string, string>>({});

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const colors = await analyzePosterPalette(url);
      if (colors) {
        setPalette(colors);
        const newParams = getAestheticParams(colors) as Record<string, string>;
        setParams(newParams);
        onParamsChange(newParams);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-white/10 rounded-2xl h-48 flex items-center justify-center text-zinc-500 cursor-pointer hover:border-orange-500/50 transition-colors"
      >
        Drop Poster to Analyze Atmosphere
      </div>

      {palette.length > 0 && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {palette.map((color, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-12 h-12 rounded-lg"
                style={{ backgroundColor: `rgb(${color[0]}, ${color[1]}, ${color[2]})` }}
              />
            ))}
          </div>
          <div className="p-4 bg-white/5 rounded-xl text-xs font-mono text-zinc-400">
            <p>Detected Config:</p>
            <pre>{JSON.stringify(params, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};
