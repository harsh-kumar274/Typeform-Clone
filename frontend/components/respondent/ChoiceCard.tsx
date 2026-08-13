"use client";

import { motion } from "framer-motion";

interface ChoiceCardProps {
  label: string;
  badge: string;
  selected: boolean;
  onClick: () => void;
}

export function ChoiceCard({ label, badge, selected, onClick }: ChoiceCardProps) {
  return (
    <div
      className={`tf-choice-card ${selected ? "selected" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="tf-choice-badge">{badge}</div>
      <div className="flex-1 font-medium">{label}</div>
    </div>
  );
}
