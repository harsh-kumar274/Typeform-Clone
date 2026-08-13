"use client";

import { useState } from "react";
import type { Question, QuestionType } from "@/lib/types";

interface QuestionEditorProps {
  question: Question;
  onUpdate: (data: Partial<Question>) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddOption: (label: string) => Promise<void>;
  onUpdateOption: (id: number, label: string) => Promise<void>;
  onDeleteOption: (id: number) => Promise<void>;
}

export function QuestionEditor({ 
  question, 
  onUpdate, 
  onDelete, 
  onAddOption, 
  onUpdateOption, 
  onDeleteOption 
}: QuestionEditorProps) {
  const [title, setTitle] = useState(question.title);
  const [description, setDescription] = useState(question.description || "");
  const [newOption, setNewOption] = useState("");

  const handleTitleBlur = () => {
    if (title !== question.title) onUpdate({ title });
  };

  const handleDescBlur = () => {
    if (description !== (question.description || "")) onUpdate({ description: description || null });
  };

  const handleAddOption = async () => {
    if (newOption.trim()) {
      await onAddOption(newOption.trim());
      setNewOption("");
    }
  };

  const hasOptions = ["multiple_choice", "dropdown"].includes(question.type);
  const isRating = question.type === "rating";
  const isNumber = question.type === "number";

  return (
    <div className="p-8 max-w-2xl mx-auto flex flex-col gap-8">
      {/* Type Info */}
      <div className="flex items-center justify-between border-b pb-4 border-[var(--tf-border)]">
        <div>
          <h2 className="text-sm font-semibold text-[var(--tf-muted)] uppercase tracking-wider">
            {question.type.replace("_", " ")}
          </h2>
        </div>
        <button 
          onClick={onDelete}
          className="text-red-500 hover:bg-red-50 px-3 py-1.5 rounded text-sm font-medium transition-colors"
        >
          Delete Question
        </button>
      </div>

      {/* Basic Settings */}
      <div className="flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium text-[var(--tf-text-secondary)] mb-2">
            Question Title
          </label>
          <input
            type="text"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--tf-accent)]"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Type your question here"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-[var(--tf-text-secondary)] mb-2">
            Description (Optional)
          </label>
          <textarea
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--tf-accent)] resize-none"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleDescBlur}
            placeholder="Add some context or instructions"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="req"
            checked={question.is_required}
            onChange={(e) => onUpdate({ is_required: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 text-[var(--tf-accent)] focus:ring-[var(--tf-accent)]"
          />
          <label htmlFor="req" className="text-sm font-medium cursor-pointer">
            Required
          </label>
        </div>
      </div>

      {/* Options Editing */}
      {hasOptions && (
        <div className="flex flex-col gap-4 border-t pt-8 border-[var(--tf-border)]">
          <label className="block text-sm font-medium text-[var(--tf-text-secondary)]">
            Choices
          </label>
          
          {question.options?.map((opt, i) => (
            <div key={opt.id} className="flex gap-2">
              <div className="w-8 h-10 flex items-center justify-center bg-gray-100 rounded text-sm font-bold text-gray-500">
                {String.fromCharCode(65 + i)}
              </div>
              <input
                type="text"
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--tf-accent)]"
                defaultValue={opt.label}
                onBlur={(e) => {
                  if (e.target.value !== opt.label) {
                    onUpdateOption(opt.id, e.target.value);
                  }
                }}
              />
              <button
                onClick={() => onDeleteOption(opt.id)}
                className="px-3 text-red-500 hover:bg-red-50 rounded transition-colors"
              >
                ✕
              </button>
            </div>
          ))}

          <div className="flex gap-2 mt-2">
            <input
              type="text"
              className="flex-1 px-4 py-2 border border-dashed border-gray-400 rounded-lg focus:outline-none focus:border-solid focus:border-[var(--tf-accent)] bg-gray-50"
              placeholder="Add a new option..."
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddOption()}
            />
            <button
              onClick={handleAddOption}
              disabled={!newOption.trim()}
              className="px-4 bg-gray-100 hover:bg-gray-200 rounded font-medium disabled:opacity-50 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Rating Settings */}
      {isRating && (
        <div className="flex flex-col gap-4 border-t pt-8 border-[var(--tf-border)]">
          <label className="block text-sm font-medium text-[var(--tf-text-secondary)]">
            Max Rating
          </label>
          <select
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--tf-accent)]"
            value={(question.settings_json as any)?.maxRating || 5}
            onChange={(e) => onUpdate({ 
              settings_json: { ...question.settings_json, maxRating: parseInt(e.target.value) } 
            })}
          >
            {[3, 4, 5, 6, 7, 8, 9, 10].map(n => (
              <option key={n} value={n}>{n} Stars</option>
            ))}
          </select>
        </div>
      )}

      {/* Number Settings */}
      {isNumber && (
        <div className="flex flex-col gap-4 border-t pt-8 border-[var(--tf-border)]">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--tf-text-secondary)] mb-2">
                Minimum Value
              </label>
              <input
                type="number"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--tf-accent)]"
                value={(question.settings_json as any)?.min ?? ""}
                onChange={(e) => onUpdate({ 
                  settings_json: { 
                    ...question.settings_json, 
                    min: e.target.value ? parseInt(e.target.value) : null 
                  } 
                })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--tf-text-secondary)] mb-2">
                Maximum Value
              </label>
              <input
                type="number"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:border-[var(--tf-accent)]"
                value={(question.settings_json as any)?.max ?? ""}
                onChange={(e) => onUpdate({ 
                  settings_json: { 
                    ...question.settings_json, 
                    max: e.target.value ? parseInt(e.target.value) : null 
                  } 
                })}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
