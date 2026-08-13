"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { formsApi } from "@/lib/api/forms";
import { questionsApi, optionsApi } from "@/lib/api/questions";
import type { Form, Question, QuestionType } from "@/lib/types";
import { useToast } from "@/components/shared/Toast";
import { QuestionList } from "@/components/builder/QuestionList";
import { QuestionEditor } from "@/components/builder/QuestionEditor";
import { QuestionSlide } from "@/components/respondent/QuestionSlide";
import Modal from "@/components/shared/Modal";
import { 
  ChevronRight, HelpCircle, LayoutTemplate, MessageSquare, 
  Mic, Plus, Send, X, Search, Mail, Phone, MapPin, Link2, 
  List, ChevronDown, Image as ImageIcon, ToggleLeft, Scale, 
  CheckSquare, BarChart, BarChart2, Star, ListOrdered, Grid, 
  AlignLeft, Type, Video, Sparkles, MessageCircleQuestion, 
  Hash, Calendar, PenTool, CreditCard, Upload, CalendarClock, 
  PanelTop, FileSignature, FolderTree, PanelBottom, ExternalLink
} from "lucide-react";

// For the sidebar standard add button
const QUESTION_TYPES: { type: QuestionType; label: string; icon: string }[] = [
  { type: "short_text", label: "Short Text", icon: "T" },
  { type: "long_text", label: "Long Text", icon: "¶" },
  { type: "multiple_choice", label: "Multiple Choice", icon: "☰" },
  { type: "dropdown", label: "Dropdown", icon: "▾" },
  { type: "yes_no", label: "Yes / No", icon: "Y/N" },
  { type: "number", label: "Number", icon: "#" },
  { type: "rating", label: "Rating", icon: "★" },
  { type: "email", label: "Email", icon: "@" },
];

export default function BuilderPage() {
  const params = useParams();
  const formId = parseInt(params.formId as string);
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [previewValue, setPreviewValue] = useState("");
  
  // New UI states
  const [showElementPickerModal, setShowElementPickerModal] = useState(false);

  const loadForm = useCallback(async () => {
    try {
      const data = await formsApi.get(formId);
      data.questions.sort((a, b) => a.order_index - b.order_index);
      setForm(data);
      if (data.questions.length > 0 && !activeQuestionId) {
        setActiveQuestionId(data.questions[0].id);
      }
    } catch (e) {
      showToast("Failed to load form", "error");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [formId, showToast, router, activeQuestionId]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  const activeQuestion = form?.questions.find(q => q.id === activeQuestionId);

  useEffect(() => {
    setPreviewValue("");
  }, [activeQuestionId]);

  const handleUpdateForm = async (updates: Partial<Form>) => {
    try {
      await formsApi.update(formId, updates);
      setForm(prev => prev ? { ...prev, ...updates } : null);
    } catch {
      showToast("Failed to update form", "error");
    }
  };

  const handleAddQuestion = async (type: QuestionType) => {
    try {
      const newQ = await questionsApi.create(formId, {
        type,
        title: "New Question",
      });
      setForm(prev => {
        if (!prev) return null;
        return { ...prev, questions: [...prev.questions, newQ] };
      });
      setActiveQuestionId(newQ.id);
      setShowTypePicker(false);
      setShowElementPickerModal(false);
      showToast("Question added");
    } catch {
      showToast("Failed to add question", "error");
    }
  };

  const handleUpdateQuestion = async (updates: Partial<Question>) => {
    if (!activeQuestionId) return;
    try {
      const updated = await questionsApi.update(activeQuestionId, updates);
      setForm(prev => {
        if (!prev) return null;
        return {
          ...prev,
          questions: prev.questions.map(q => q.id === activeQuestionId ? { ...q, ...updated } : q)
        };
      });
    } catch {
      showToast("Failed to update question", "error");
    }
  };

  const handleDeleteQuestion = async () => {
    if (!activeQuestionId) return;
    try {
      await questionsApi.delete(activeQuestionId);
      showToast("Question deleted");
      
      setForm(prev => {
        if (!prev) return null;
        return { ...prev, questions: prev.questions.filter(q => q.id !== activeQuestionId) };
      });
      setActiveQuestionId(null);
      // Wait a moment then reload to get proper indexes
      setTimeout(loadForm, 100);
    } catch {
      showToast("Failed to delete question", "error");
    }
  };

  const handleReorder = async (newOrder: Question[]) => {
    setForm(prev => prev ? { ...prev, questions: newOrder } : null);
    try {
      await questionsApi.reorder(formId, newOrder.map((q, i) => ({ id: q.id, order_index: i })));
    } catch {
      showToast("Failed to reorder", "error");
      loadForm();
    }
  };

  const handleAddOption = async (label: string) => {
    if (!activeQuestionId) return;
    try {
      const opt = await optionsApi.create(activeQuestionId, label);
      setForm(prev => {
        if (!prev) return null;
        return {
          ...prev,
          questions: prev.questions.map(q => {
            if (q.id === activeQuestionId) {
              return { ...q, options: [...(q.options || []), opt] };
            }
            return q;
          })
        };
      });
    } catch {
      showToast("Failed to add option", "error");
    }
  };

  const handleUpdateOption = async (id: number, label: string) => {
    try {
      const updated = await optionsApi.update(id, { label });
      setForm(prev => {
        if (!prev) return null;
        return {
          ...prev,
          questions: prev.questions.map(q => {
            if (q.id === activeQuestionId) {
              return {
                ...q,
                options: q.options.map(o => o.id === id ? { ...o, ...updated } : o)
              };
            }
            return q;
          })
        };
      });
    } catch {
      showToast("Failed to update option", "error");
    }
  };

  const handleDeleteOption = async (id: number) => {
    try {
      await optionsApi.delete(id);
      setForm(prev => {
        if (!prev) return null;
        return {
          ...prev,
          questions: prev.questions.map(q => {
            if (q.id === activeQuestionId) {
              return { ...q, options: q.options.filter(o => o.id !== id) };
            }
            return q;
          })
        };
      });
    } catch {
      showToast("Failed to delete option", "error");
    }
  };

  const handlePublish = async () => {
    if (!form) return;
    try {
      const res = await formsApi.publish(formId);
      setForm(prev => prev ? { ...prev, status: "published", public_slug: res.public_slug } : null);
      showToast("Form published successfully!");
    } catch (e: any) {
      showToast(e.detail || "Failed to publish", "error");
    }
  };

  if (loading || !form) {
    return <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
      <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
    </div>;
  }

  const isFormEmpty = form.questions.length === 0;

  if (isFormEmpty) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans">
        {/* Top Nav for empty state */}
        <header className="flex items-center justify-between px-6 h-14 bg-[#fafafa]">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
            <button 
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 hover:text-gray-900 transition-colors"
            >
              <LayoutTemplate className="w-4 h-4" /> Forms
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900">{form.title}</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gray-500 hover:text-gray-900">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button className="w-7 h-7 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center font-semibold text-xs">
              HJ
            </button>
          </div>
        </header>

        {/* AI Setup Area */}
        <main className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full px-6 pb-32">
          <div className="text-center mb-8">
            <div className="text-sm font-semibold text-gray-500 mb-2">Typeform AI</div>
            <h1 className="text-2xl font-light text-gray-900">What would you like to create?</h1>
          </div>

          <div className="w-full bg-white rounded-xl shadow-sm border border-purple-200 p-1 mb-8 focus-within:ring-2 focus-within:ring-purple-100 transition-shadow">
            <div className="border border-purple-100 rounded-lg p-4">
              <textarea 
                className="w-full h-24 resize-none outline-none text-gray-700 placeholder-gray-400"
                placeholder="Type or paste your form questions."
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex gap-3 text-gray-400">
                  <button className="hover:text-gray-700"><Mic className="w-4 h-4" /></button>
                  <button className="hover:text-gray-700"><Plus className="w-4 h-4" /></button>
                  <button className="hover:text-gray-700 font-bold tracking-widest text-lg leading-none mb-1">...</button>
                </div>
                <button className="w-8 h-8 rounded bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setShowElementPickerModal(true)}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Start from scratch
            </button>
            <button className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center gap-2 opacity-70 cursor-not-allowed">
              Sync to CRM 
              <span className="flex gap-1 ml-1">
                <div className="w-4 h-4 rounded-full bg-orange-500 text-white flex items-center justify-center text-[8px] font-bold">hub</div>
                <div className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[8px] font-bold">sf</div>
              </span>
            </button>
          </div>
        </main>
        
        {/* Element Picker Modal directly rendered for the empty state */}
        <ElementPickerModal 
          open={showElementPickerModal} 
          onClose={() => setShowElementPickerModal(false)}
          onSelect={handleAddQuestion}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-gray-900">
      {/* Header */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-medium text-sm transition-colors"
          >
            <LayoutTemplate className="w-4 h-4" /> Forms
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            className="font-semibold text-sm outline-none hover:bg-gray-50 focus:bg-gray-50 px-2 py-1 rounded transition-colors text-gray-900"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            onBlur={(e) => handleUpdateForm({ title: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-3">
          {form.status === "published" && form.public_slug && (
            <a 
              href={`/f/${form.public_slug}`} 
              target="_blank" 
              rel="noreferrer"
              className="text-sm font-medium text-purple-600 hover:underline mr-4"
            >
              View Live Form
            </a>
          )}
          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${form.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
            {form.status}
          </span>
          <button
            onClick={handlePublish}
            className="bg-black text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            Publish
          </button>
          <button className="text-gray-500 hover:text-gray-900 ml-2">
            <HelpCircle className="w-5 h-5" />
          </button>
          <button className="w-7 h-7 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center font-semibold text-xs ml-1">
            HJ
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-72 border-r border-gray-200 flex flex-col bg-[#fafafa]">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white">
            <h3 className="font-semibold text-sm">Questions</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            <QuestionList
              questions={form.questions}
              activeId={activeQuestionId}
              onSelect={setActiveQuestionId}
              onReorder={handleReorder}
            />
          </div>

          <div className="p-4 bg-white border-t border-gray-200">
            <button
              onClick={() => setShowElementPickerModal(true)}
              className="w-full py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium hover:border-black hover:shadow-sm transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Element
            </button>
          </div>
        </aside>

        {/* Center - Editor */}
        <main className="flex-[1.2] border-r border-gray-200 bg-white overflow-y-auto">
          {activeQuestion ? (
            <QuestionEditor
              question={activeQuestion}
              onUpdate={handleUpdateQuestion}
              onDelete={handleDeleteQuestion}
              onAddOption={handleAddOption}
              onUpdateOption={handleUpdateOption}
              onDeleteOption={handleDeleteOption}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm font-medium">
              Select or add a question to edit
            </div>
          )}
        </main>

        {/* Right - Live Preview */}
        <aside className="flex-1 bg-gray-100 flex flex-col items-center justify-center p-8 overflow-hidden relative">
          <div className="absolute top-4 left-4 text-[10px] font-bold tracking-widest text-gray-400 uppercase">
            Live Preview
          </div>
          
          <div className="w-full h-full max-h-[800px] max-w-[600px] bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="h-2 w-full bg-gray-200" />
            <div className="flex-1 relative flex flex-col bg-white">
              {activeQuestion ? (
                <QuestionSlide
                  question={activeQuestion}
                  value={previewValue}
                  onChange={setPreviewValue}
                  onEnter={() => showToast("This is just a preview", "info")}
                  questionNumber={form.questions.findIndex(q => q.id === activeQuestion.id) + 1}
                />
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                  Preview area
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <ElementPickerModal 
        open={showElementPickerModal} 
        onClose={() => setShowElementPickerModal(false)}
        onSelect={handleAddQuestion}
      />
    </div>
  );
}

// --- Large Element Picker Modal Component ---

interface ElementPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (type: QuestionType) => void;
}

function ElementPickerModal({ open, onClose, onSelect }: ElementPickerModalProps) {
  if (!open) return null;

  const categories = [
    {
      title: "Contact info",
      items: [
        { label: "Contact Info", icon: <LayoutTemplate className="w-4 h-4 text-pink-500" />, type: null, disabled: true },
        { label: "Email", icon: <Mail className="w-4 h-4 text-pink-500" />, type: "email" },
        { label: "Phone Number", icon: <Phone className="w-4 h-4 text-pink-500" />, type: null, disabled: true },
        { label: "Address", icon: <MapPin className="w-4 h-4 text-pink-500" />, type: null, disabled: true },
        { label: "Website", icon: <Link2 className="w-4 h-4 text-pink-500" />, type: null, disabled: true },
      ]
    },
    {
      title: "Choice",
      items: [
        { label: "Multiple Choice", icon: <List className="w-4 h-4 text-purple-500" />, type: "multiple_choice" },
        { label: "Dropdown", icon: <ChevronDown className="w-4 h-4 text-purple-500" />, type: "dropdown" },
        { label: "Picture Choice", icon: <ImageIcon className="w-4 h-4 text-purple-500" />, type: null, disabled: true },
        { label: "Yes/No", icon: <ToggleLeft className="w-4 h-4 text-purple-500" />, type: "yes_no" },
        { label: "Legal", icon: <Scale className="w-4 h-4 text-purple-500" />, type: null, disabled: true },
        { label: "Checkbox", icon: <CheckSquare className="w-4 h-4 text-purple-500" />, type: null, disabled: true },
      ]
    },
    {
      title: "Rating & ranking",
      items: [
        { label: "Net Promoter Score", icon: <BarChart className="w-4 h-4 text-green-500" />, type: null, disabled: true },
        { label: "Opinion Scale", icon: <BarChart2 className="w-4 h-4 text-green-500" />, type: null, disabled: true },
        { label: "Rating", icon: <Star className="w-4 h-4 text-green-500" />, type: "rating" },
        { label: "Ranking", icon: <ListOrdered className="w-4 h-4 text-green-500" />, type: null, disabled: true },
        { label: "Matrix", icon: <Grid className="w-4 h-4 text-green-500" />, type: null, disabled: true },
      ]
    },
    {
      title: "Text & Video",
      items: [
        { label: "Long Text", icon: <AlignLeft className="w-4 h-4 text-blue-500" />, type: "long_text" },
        { label: "Short Text", icon: <Type className="w-4 h-4 text-blue-500" />, type: "short_text" },
        { label: "Video and Audio", icon: <Video className="w-4 h-4 text-blue-500" />, type: null, disabled: true, pro: true },
        { label: "Clarify with AI", icon: <Sparkles className="w-4 h-4 text-blue-500" />, type: null, disabled: true, pro: true },
        { label: "FAQ with AI", icon: <MessageCircleQuestion className="w-4 h-4 text-blue-500" />, type: null, disabled: true, pro: true },
      ]
    },
    {
      title: "Other",
      items: [
        { label: "Number", icon: <Hash className="w-4 h-4 text-yellow-600" />, type: "number" },
        { label: "Date", icon: <Calendar className="w-4 h-4 text-yellow-600" />, type: null, disabled: true },
        { label: "Signature", icon: <PenTool className="w-4 h-4 text-yellow-600" />, type: null, disabled: true, pro: true },
        { label: "Payment", icon: <CreditCard className="w-4 h-4 text-yellow-600" />, type: null, disabled: true, pro: true },
        { label: "File Upload", icon: <Upload className="w-4 h-4 text-yellow-600" />, type: null, disabled: true, pro: true },
        { label: "Scheduler", icon: <CalendarClock className="w-4 h-4 text-yellow-600" />, type: null, disabled: true },
        { label: "Welcome Screen", icon: <PanelTop className="w-4 h-4 text-gray-500" />, type: null, disabled: true },
        { label: "Partial Submit Point", icon: <FileSignature className="w-4 h-4 text-gray-500" />, type: null, disabled: true, pro: true },
        { label: "Statement", icon: <Type className="w-4 h-4 text-gray-500" />, type: null, disabled: true },
        { label: "Question Group", icon: <FolderTree className="w-4 h-4 text-gray-500" />, type: null, disabled: true },
        { label: "End Screen", icon: <PanelBottom className="w-4 h-4 text-gray-500" />, type: null, disabled: true },
        { label: "Redirect to URL", icon: <ExternalLink className="w-4 h-4 text-gray-500" />, type: null, disabled: true, pro: true },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* Top Header Tabs */}
        <div className="flex items-center justify-between px-6 border-b border-gray-100">
          <div className="flex gap-8">
            <button className="py-4 border-b-2 border-black font-semibold text-gray-900 text-sm">Add form elements</button>
            <button className="py-4 border-b-2 border-transparent font-medium text-gray-500 hover:text-gray-900 text-sm">Import questions</button>
            <button className="py-4 border-b-2 border-transparent font-medium text-gray-500 hover:text-gray-900 text-sm">Create with AI</button>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-64 border-r border-gray-100 p-6 flex flex-col gap-8 bg-gray-50/30 overflow-y-auto">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search form elements" 
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg outline-none focus:border-black text-sm"
              />
            </div>
            
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Recommended</h4>
              <button className="w-full flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-lg hover:border-black text-sm text-gray-700 transition-colors opacity-50 cursor-not-allowed">
                <PanelTop className="w-4 h-4 text-gray-500" /> Welcome Screen
              </button>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Connect to apps</h4>
              <button className="w-full flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-lg hover:border-black text-sm text-gray-700 transition-colors mb-2 opacity-50 cursor-not-allowed">
                <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                  <span className="text-[8px] text-white font-bold">hub</span>
                </div>
                Hubspot
              </button>
              <button className="w-full flex items-center gap-3 p-2.5 bg-white border border-gray-200 rounded-lg hover:border-black text-sm text-gray-700 transition-colors mb-4 opacity-50 cursor-not-allowed justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">sf</span>
                  </div>
                  Salesforce
                </div>
                <div className="w-4 h-4 rounded-full border border-emerald-500 text-emerald-500 flex items-center justify-center bg-emerald-50">
                  <span className="text-[10px]">💎</span>
                </div>
              </button>
              <button className="flex items-center gap-2 text-sm text-gray-600 font-medium hover:text-black transition-colors">
                <Grid className="w-4 h-4" /> Browse all apps
              </button>
            </div>
          </div>

          {/* Right Grid */}
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-10">
              
              {categories.map((category) => (
                <div key={category.title}>
                  <h4 className="text-sm font-semibold text-gray-900 mb-4">{category.title}</h4>
                  <div className="flex flex-col gap-1">
                    {category.items.map((item) => (
                      <button
                        key={item.label}
                        onClick={() => !item.disabled && onSelect(item.type as QuestionType)}
                        disabled={item.disabled}
                        className={`flex items-center justify-between p-2 rounded-lg text-sm text-gray-700 transition-colors text-left ${
                          item.disabled 
                            ? "opacity-50 cursor-not-allowed hover:bg-transparent" 
                            : "hover:bg-gray-100 font-medium hover:text-black cursor-pointer"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 flex items-center justify-center rounded bg-gray-50 border border-gray-100 ${!item.disabled && "shadow-sm"}`}>
                            {item.icon}
                          </div>
                          {item.label}
                        </div>
                        {item.pro && (
                          <div className="w-4 h-4 rounded-full border border-emerald-500 text-emerald-500 flex items-center justify-center bg-emerald-50 shrink-0">
                            <span className="text-[10px]">💎</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

