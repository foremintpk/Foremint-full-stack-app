"use client";

import dynamic from "next/dynamic";

const UsaInteractiveMap = dynamic(() => import("./UsaInteractiveMap"), {
  ssr: false,
  loading: () => (
    <div className="py-24 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div
          className="w-8 h-8 rounded-full border-2 border-[#34088f] border-t-transparent animate-spin"
        />
        <p className="text-sm text-gray-400 font-inter">Loading map…</p>
      </div>
    </div>
  ),
});

export default function MapSection() {
  return <UsaInteractiveMap />;
}
