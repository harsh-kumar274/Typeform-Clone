"use client";

import { motion } from "framer-motion";

export function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="tf-progress-bar" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
  );
}
