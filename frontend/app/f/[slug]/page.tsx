"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { respondApi } from "@/lib/api/responses";
import { Form, Question } from "@/lib/types";
import { QuestionSlide } from "@/components/respondent/QuestionSlide";
import { ProgressBar } from "@/components/respondent/ProgressBar";
import { TransitionWrapper } from "@/components/respondent/TransitionWrapper";
import { ThankYouScreen } from "@/components/respondent/ThankYouScreen";
import { useToast } from "@/components/shared/Toast";
import { useDebounce } from "@/hooks/useDebounce";

export default function RespondentFlowPage() {
  const params = useParams();
  const slug = params.slug as string;
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isCompleted, setIsCompleted] = useState(false);
  
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentValue, setCurrentValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Load form & token
  useEffect(() => {
    async function load() {
      try {
        const formData = await respondApi.getPublicForm(slug);
        setForm(formData);

        // Check if we have an existing session
        const sessionKey = `tf_session_${slug}`;
        const existingToken = sessionStorage.getItem(sessionKey);
        
        if (existingToken) {
          try {
            const resumeData = await respondApi.resumeResponse(existingToken);
            setToken(existingToken);
            setIsCompleted(resumeData.is_complete);
            
            // Rehydrate answers
            const ansMap: Record<number, string> = {};
            resumeData.answers.forEach(a => {
              if (a.value_text !== null) {
                ansMap[a.question_id] = a.value_text;
              }
            });
            setAnswers(ansMap);
            
            // Start at first unanswered question, or 0
            let startIdx = 0;
            for (let i = 0; i < formData.questions.length; i++) {
              if (!ansMap[formData.questions[i].id]) {
                startIdx = i;
                break;
              }
            }
            if (resumeData.is_complete) {
              startIdx = formData.questions.length;
            }
            setCurrentIndex(startIdx);
            if (startIdx < formData.questions.length) {
              setCurrentValue(ansMap[formData.questions[startIdx].id] || "");
            }

          } catch (e) {
            // Token invalid or expired, clear it
            sessionStorage.removeItem(sessionKey);
            const { response_token } = await respondApi.startResponse(slug);
            setToken(response_token);
            sessionStorage.setItem(sessionKey, response_token);
          }
        } else {
          const { response_token } = await respondApi.startResponse(slug);
          setToken(response_token);
          sessionStorage.setItem(sessionKey, response_token);
        }
      } catch (e) {
        showToast("Form not found", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug, showToast]);

  // Sync current value when index changes
  useEffect(() => {
    if (form && currentIndex < form.questions.length) {
      const q = form.questions[currentIndex];
      setCurrentValue(answers[q.id] || "");
      setError(null);
    }
  }, [currentIndex, form, answers]);

  const activeQuestion = form?.questions[currentIndex];

  // Progressive saving
  const debouncedValue = useDebounce(currentValue, 500);
  
  useEffect(() => {
    async function autoSave() {
      if (!token || !activeQuestion || debouncedValue === answers[activeQuestion.id]) return;
      // Skip empty save for initial load if no answer yet
      if (debouncedValue === "" && !answers[activeQuestion.id]) return;

      setIsSaving(true);
      try {
        await respondApi.saveAnswer(token, activeQuestion.id, debouncedValue);
        setAnswers(prev => ({ ...prev, [activeQuestion.id]: debouncedValue }));
        setError(null);
      } catch (e: any) {
        // Validation error on server
        if (e.status === 400 && e.detail) {
          setError(e.detail);
        }
      } finally {
        setIsSaving(false);
      }
    }
    autoSave();
  }, [debouncedValue, token, activeQuestion, answers]);

  const handleNext = async () => {
    if (!form || !activeQuestion || !token) return;
    
    // Client-side required check
    if (activeQuestion.is_required && !currentValue.trim()) {
      setError("This question is required");
      return;
    }

    // Force save if not debounced yet
    if (currentValue !== answers[activeQuestion.id]) {
      setIsSaving(true);
      try {
        await respondApi.saveAnswer(token, activeQuestion.id, currentValue);
        setAnswers(prev => ({ ...prev, [activeQuestion.id]: currentValue }));
        setError(null);
      } catch (e: any) {
        setIsSaving(false);
        if (e.status === 400 && e.detail) {
          setError(e.detail);
        } else {
          showToast("Failed to save answer", "error");
        }
        return; // Stop advance if validation failed
      }
      setIsSaving(false);
    } else if (error) {
       return; // Already have validation error
    }

    // Advance or submit
    if (currentIndex < form.questions.length - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    } else {
      // Submit
      try {
        await respondApi.submit(token);
        setIsCompleted(true);
        sessionStorage.removeItem(`tf_session_${slug}`);
      } catch (e: any) {
        if (e.status === 400 && e.detail) {
           showToast(e.detail, "error");
        } else {
           showToast("Failed to submit form", "error");
        }
      }
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Global up arrow for previous question
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        // Prevent going back if inside textarea
        if (document.activeElement?.tagName === "TEXTAREA") return;
        handlePrev();
      } else if (e.key === "ArrowDown" && document.activeElement?.tagName !== "TEXTAREA") {
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, currentValue, error]); // dependencies for up-to-date handleNext

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg)]">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--tf-border)] border-t-[var(--tf-accent)] animate-spin" />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--tf-bg)]">
        <h1 className="text-2xl font-semibold">Form not found</h1>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: form.theme_color || "var(--tf-bg)" }}>
        <div className="w-full h-full bg-[var(--tf-bg)] relative flex flex-col">
          <ThankYouScreen message={form.thank_you_message} />
        </div>
      </div>
    );
  }

  const progress = form.questions.length > 0 ? (currentIndex / form.questions.length) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: form.theme_color || "var(--tf-bg)" }}>
      {/* 
        Typeform usually has a colored background or theme, with the form itself 
        on a white/dark card, or the whole background is colored.
        For this clone, we'll use the theme color as background if provided.
      */}
      <div className="flex-1 w-full flex flex-col bg-[var(--tf-bg)] text-[var(--tf-text)]">
        <ProgressBar progress={progress} />
        
        {activeQuestion && (
          <div className="flex-1 overflow-hidden relative">
            <TransitionWrapper slideKey={activeQuestion.id} direction={direction}>
              <QuestionSlide
                question={activeQuestion}
                value={currentValue}
                onChange={setCurrentValue}
                onEnter={handleNext}
                questionNumber={currentIndex + 1}
                error={error}
              />
            </TransitionWrapper>
            
            {/* Optional loading spinner for auto-save feedback */}
            {isSaving && (
              <div className="absolute top-6 right-6 flex items-center gap-2 text-xs text-[var(--tf-muted)]">
                <span className="w-3 h-3 rounded-full border border-[var(--tf-border)] border-t-[var(--tf-accent)] animate-spin" />
                Saving...
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
