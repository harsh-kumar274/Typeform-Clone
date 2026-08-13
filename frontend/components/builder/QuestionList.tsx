"use client";

import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Question } from "@/lib/types";

interface SortableItemProps {
  question: Question;
  isActive: boolean;
  onClick: () => void;
  index: number;
}

function SortableItem({ question, isActive, onClick, index }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "short_text": return "T";
      case "long_text": return "¶";
      case "multiple_choice": return "☰";
      case "dropdown": return "▾";
      case "yes_no": return "Y/N";
      case "number": return "#";
      case "rating": return "★";
      case "email": return "@";
      default: return "?";
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 mb-2 rounded-lg cursor-pointer transition-colors border ${
        isActive ? "border-[var(--tf-accent)] bg-[var(--tf-bg-dark)] text-white" : "border-transparent hover:bg-gray-100"
      }`}
      onClick={onClick}
    >
      <div 
        className="cursor-grab text-gray-400 hover:text-gray-600 px-1"
        {...attributes} 
        {...listeners}
      >
        ⋮⋮
      </div>
      <div className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded ${isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"}`}>
        {getIcon(question.type)}
      </div>
      <div className="flex-1 truncate text-sm font-medium">
        {index + 1}. {question.title || "New Question"}
      </div>
    </div>
  );
}

interface QuestionListProps {
  questions: Question[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onReorder: (newQuestions: Question[]) => void;
}

export function QuestionList({ questions, activeId, onSelect, onReorder }: QuestionListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      
      const newQuestions = arrayMove(questions, oldIndex, newIndex);
      // Update order_index
      const updatedOrder = newQuestions.map((q, i) => ({ ...q, order_index: i }));
      onReorder(updatedOrder);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={questions.map(q => q.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="px-2">
          {questions.map((q, index) => (
            <SortableItem
              key={q.id}
              question={q}
              index={index}
              isActive={activeId === q.id}
              onClick={() => onSelect(q.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
