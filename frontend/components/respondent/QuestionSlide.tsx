"use client";

import { useEffect, useRef, useState } from "react";
import type { Question } from "@/lib/types";
import { ChoiceCard } from "./ChoiceCard";

interface Props {
  question: Question;
  value: string;
  onChange: (val: string) => void;
  onEnter: () => void;
  questionNumber: number;
  error?: string | null;
}

export function QuestionSlide({ question, value, onChange, onEnter, questionNumber, error }: Props) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  // Auto-focus the primary input when the slide mounts
  useEffect(() => {
    // slight delay to allow the animation to start
    const timer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [question.id]);

  // Keyboard navigation for choices
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in a text field
      if (["short_text", "long_text", "email", "number"].includes(question.type)) {
        return;
      }
      
      if (question.type === "multiple_choice" && question.options) {
        const num = parseInt(e.key);
        if (!isNaN(num) && num > 0 && num <= question.options.length) {
          onChange(question.options[num - 1].label);
          // Auto advance on choice selection could go here if desired, 
          // but we'll let them press enter or click OK for consistency unless specified.
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [question, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onEnter();
    }
  };

  const renderInput = () => {
    switch (question.type) {
      case "short_text":
      case "email":
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={question.type === "email" ? "email" : "text"}
            className="tf-input"
            placeholder="Type your answer here..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        );
      case "long_text":
        return (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            className="tf-textarea"
            placeholder="Type your answer here..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown} // Shift+Enter for new line handled by default, just Enter advances
          />
        );
      case "number":
        return (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="number"
            className="tf-input"
            placeholder="0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        );
      case "yes_no":
        return (
          <div className="flex gap-4">
            <ChoiceCard
              label="Yes"
              badge="Y"
              selected={value === "Yes"}
              onClick={() => onChange("Yes")}
            />
            <ChoiceCard
              label="No"
              badge="N"
              selected={value === "No"}
              onClick={() => onChange("No")}
            />
          </div>
        );
      case "multiple_choice":
        return (
          <div className="flex flex-col gap-3">
            {question.options?.map((opt, i) => (
              <ChoiceCard
                key={opt.id}
                label={opt.label}
                badge={String.fromCharCode(65 + i)} // A, B, C...
                selected={value === opt.label}
                onClick={() => onChange(opt.label)}
              />
            ))}
          </div>
        );
      case "dropdown":
        return (
          <select
            ref={inputRef as React.RefObject<HTMLSelectElement>}
            className="tf-select"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
          >
            <option value="" disabled>Select an option</option>
            {question.options?.map((opt) => (
              <option key={opt.id} value={opt.label}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case "rating": {
        const maxRating = (question.settings_json as any)?.maxRating || 5;
        return (
          <div className="flex gap-4 items-center">
            {Array.from({ length: maxRating }).map((_, i) => (
              <div
                key={i}
                className={`tf-rating-star text-4xl ${parseInt(value) >= i + 1 ? "active" : ""}`}
                onClick={() => onChange((i + 1).toString())}
              >
                ★
              </div>
            ))}
          </div>
        );
      }
      default:
        return <div>Unsupported question type</div>;
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full px-6">
      <div className="flex gap-4 items-baseline mb-6">
        <span className="text-xl font-semibold text-[var(--tf-accent)]">
          {questionNumber} <span className="opacity-50">→</span>
        </span>
        <h2 className="tf-question-title">
          {question.title}
          {question.is_required && <span className="text-[var(--tf-error)] ml-2">*</span>}
        </h2>
      </div>

      {question.description && (
        <p className="text-lg text-[var(--tf-muted)] mb-8 ml-10">
          {question.description}
        </p>
      )}

      <div className="ml-10 mb-8">
        {renderInput()}
        {error && (
          <div className="text-[var(--tf-error)] bg-[#ff3b30]/10 px-3 py-2 rounded-md mt-4 text-sm font-medium">
            {error}
          </div>
        )}
      </div>

      <div className="ml-10 flex items-center gap-4">
        <button
          className="tf-ok-button"
          onClick={onEnter}
        >
          OK <span className="font-normal opacity-80">✓</span>
        </button>
        <span className="tf-enter-hint">
          press <strong>Enter ↵</strong>
        </span>
      </div>
    </div>
  );
}
