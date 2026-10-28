'use client'

import { useState } from "react";
import { motion } from "framer-motion";
import { CinematicPanel } from "@/v2/components/CinematicPanel";
import { CinematicAtmospherePreview } from "@/v2/components/CinematicAtmospherePreview";
import { ReverseEnginePanel } from "@/v2/components/ReverseEnginePanel";
import { CinematicSidebar } from "@/v2/components/CinematicSidebar";
import { CinematicComparison } from "@/v2/components/CinematicComparison";
import { savePreset } from "@/v2/lib/presets";

export default function CinemaStudio() {
  const [aestheticParams, setAestheticParams] = useState<Record<string, string>>({});

  const handleSavePreset = () => {
    savePreset("New Cinematic Preset", aestheticParams);
    // Add toast notification logic here
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-white font-sans">
      <CinematicSidebar />
      <main className="flex-1 overflow-y-auto p-12">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex justify-between items-end"
        >
          <div>
            <h2 className="text-4xl font-bold tracking-tight text-white">Cinema Studio 2.0</h2>
            <p className="text-zinc-500">Immersive reverse engineering and cinematic poster generation.</p>
          </div>
          <button
            onClick={handleSavePreset}
            className="px-6 py-2 bg-orange-600 rounded-lg hover:bg-orange-500 transition-colors text-sm font-semibold"
          >
            Save Preset
          </button>
        </motion.header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <CinematicPanel className="md:col-span-1 space-y-6">
            <h3 className="text-xl font-semibold">Reverse Engineer</h3>
            <ReverseEnginePanel onParamsChange={setAestheticParams} />
          </CinematicPanel>

          <div className="md:col-span-2 space-y-8">
            <CinematicComparison
              originalUrl="/placeholder-poster.jpg"
              generatedUrl="/placeholder-poster.jpg"
            />
            <div className="grid grid-cols-2 gap-6">
              <CinematicAtmospherePreview type="movie" id="550" title="Fight Club" params={aestheticParams} />
              <CinematicAtmospherePreview type="movie" id="155" title="The Dark Knight" params={aestheticParams} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
