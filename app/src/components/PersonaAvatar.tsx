"use client";
import { useState } from "react";

type Props = {
  sessionId: string;
  slot: number;
  initials: string;
  tintClass: string;
  size?: string;
  version?: number | string;
};

export default function PersonaAvatar({ sessionId, slot, initials, tintClass, size = "w-11 h-11", version = 0 }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`${size} rounded-md ${tintClass} flex items-center justify-center text-white text-base font-bold ring-1 ring-white/10 shrink-0`}>
        {initials}
      </div>
    );
  }
  return (
    <img
      src={`/api/persona-images/${sessionId}/${slot}?v=${version}`}
      alt={initials}
      onError={() => setFailed(true)}
      className={`${size} rounded-md object-cover ring-1 ring-white/10 shrink-0 bg-stone-50`}
    />
  );
}
