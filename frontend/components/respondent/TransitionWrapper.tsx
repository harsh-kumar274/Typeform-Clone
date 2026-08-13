"use client";

import { motion, AnimatePresence } from "framer-motion";
import React from "react";

interface Props {
  children: React.ReactNode;
  slideKey: string | number;
  direction?: number; // 1 for forward, -1 for backward
}

export function TransitionWrapper({ children, slideKey, direction = 1 }: Props) {
  return (
    <AnimatePresence mode="wait" initial={false} custom={direction}>
      <motion.div
        key={slideKey}
        custom={direction}
        initial={{ opacity: 0, y: direction * 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: direction * -50 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="w-full h-full flex flex-col justify-center"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
