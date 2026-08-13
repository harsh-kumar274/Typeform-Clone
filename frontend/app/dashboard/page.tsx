"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { formsApi } from "@/lib/api/forms";
import { useToast } from "@/components/shared/Toast";
import Modal from "@/components/shared/Modal";
import type { FormListItem } from "@/lib/types";
import { 
  ChevronDown, HelpCircle, Grid, LayoutList, Search, 
  Plus, MoreHorizontal, MessageSquare, Sparkles, UserPlus, 
  Settings, Copy, Trash2, BarChart2, Edit2, Play, Users, 
  Workflow, FileText, Blocks, ArrowRight
} from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [forms, setForms] = useState<FormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FormListItem | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);

  // Dropdown for the `...` menu
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadForms = useCallback(async () => {
    try {
      const data = await formsApi.list();
      setForms(data);
    } catch (e) {
      showToast("Failed to load forms", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const form = await formsApi.create(newTitle.trim());
      showToast("Form created!");
      setCreateModalOpen(false);
      setNewTitle("");
      router.push(`/builder/${form.id}`);
    } catch {
      showToast("Failed to create form", "error");
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (form: FormListItem) => {
    setOpenMenuId(null);
    try {
      await formsApi.duplicate(form.id);
      showToast("Form duplicated!");
      loadForms();
    } catch {
      showToast("Failed to duplicate", "error");
    }
  };

  const handleTogglePublish = async (form: FormListItem) => {
    setOpenMenuId(null);
    try {
      if (form.status === "published") {
        await formsApi.unpublish(form.id);
        showToast("Form unpublished");
      } else {
        await formsApi.publish(form.id);
        showToast("Form published!");
      }
      loadForms();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Action failed";
      showToast(msg, "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await formsApi.delete(deleteTarget.id);
      showToast("Form deleted");
      setDeleteModalOpen(false);
      setDeleteTarget(null);
      loadForms();
    } catch {
      showToast("Failed to delete", "error");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans text-sm text-gray-800">
      {/* Top Nav */}
      <header className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 hover:bg-gray-100 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-gray-200">
              <div className="w-7 h-7 bg-purple-500 text-white rounded-full flex items-center justify-center font-semibold text-xs">
                H
              </div>
              <span className="font-medium text-sm">harshkumarthakur274</span>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
              <Blocks className="w-4 h-4" /> Integrations
            </button>
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
              <Sparkles className="w-4 h-4" /> Brand kit
            </button>
            <button className="text-gray-500 hover:text-gray-900">
              <HelpCircle className="w-5 h-5" />
            </button>
            <button className="w-8 h-8 bg-purple-200 text-purple-700 rounded-full flex items-center justify-center font-semibold text-xs ml-2">
              HJ
            </button>
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center justify-between border border-emerald-200 bg-emerald-50/50 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2 text-emerald-800">
              <Sparkles className="w-4 h-4" />
              <span>You can collect <strong>10 form responses</strong> this month for free.</span>
              <button className="bg-emerald-800 text-white px-3 py-1 rounded text-xs font-semibold hover:bg-emerald-900 ml-2">
                Get more responses
              </button>
            </div>
            <button className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
        </div>
      </div>

      {/* Secondary Nav */}
      <div className="bg-white border-b border-gray-200 px-8">
        <div className="flex gap-8 max-w-[1400px] mx-auto">
          <button className="flex items-center gap-2 py-4 border-b-2 border-black text-black font-semibold">
            <MessageSquare className="w-4 h-4" /> Forms
          </button>
          <button className="flex items-center gap-2 py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-900 font-medium">
            <Users className="w-4 h-4" /> Contacts
          </button>
          <button className="flex items-center gap-2 py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-900 font-medium">
            <Workflow className="w-4 h-4" /> Automations
          </button>
          <button className="flex items-center gap-2 py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-900 font-medium">
            <FileText className="w-4 h-4" /> Pages <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded ml-1">Beta</span>
          </button>
          <button className="flex items-center gap-2 py-4 border-b-2 border-transparent text-gray-500 hover:text-gray-900 font-medium">
            <Search className="w-4 h-4" /> Research Flow <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded ml-1">Demo</span>
          </button>
        </div>
      </div>

      <div className="flex flex-1 max-w-[1400px] w-full mx-auto">
        {/* Sidebar */}
        <aside className="w-64 border-r border-gray-200 bg-white flex flex-col">
          <div className="p-6 pb-4">
            <button 
              onClick={() => setCreateModalOpen(true)}
              className="w-full bg-[#35313a] text-white rounded-lg py-2.5 font-medium flex items-center justify-center gap-2 hover:bg-black transition-colors"
            >
              <Plus className="w-4 h-4" /> Create form
            </button>
          </div>

          <div className="px-6 mb-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search" 
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-transparent hover:border-gray-300 focus:border-black focus:bg-white rounded-md outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="px-4 flex-1">
            <div className="flex items-center justify-between px-2 py-1.5 mb-2 group cursor-pointer hover:bg-gray-50 rounded">
              <div className="flex items-center gap-2 font-medium text-gray-900">
                <Grid className="w-4 h-4 text-gray-400" /> Workspaces
              </div>
              <button className="w-6 h-6 border border-gray-200 rounded flex items-center justify-center text-gray-500 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Plus className="w-3 h-3" />
              </button>
            </div>

            <div className="mb-1">
              <div className="flex items-center justify-between px-2 py-1.5 cursor-pointer text-gray-600 font-medium hover:bg-gray-50 rounded">
                Private
                <ChevronDown className="w-4 h-4" />
              </div>
              <div className="ml-2 mt-1">
                <div className="flex items-center justify-between px-2 py-2 cursor-pointer bg-gray-100 rounded text-gray-900 font-medium">
                  My workspace
                  <span className="text-gray-500 text-xs">1</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-200 bg-white">
            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Responses collected</div>
            <div className="w-full bg-gray-200 h-1 rounded-full mb-2 overflow-hidden">
              <div className="bg-gray-400 w-0 h-full"></div>
            </div>
            <div className="text-xs font-medium text-gray-900 mb-4">0 / 10</div>
            <button className="border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-gray-50 w-full text-left">
              Increase response limit
            </button>
          </div>

          <div className="p-4 bg-[#fafafa]">
            <div className="border border-purple-200 rounded-lg bg-white shadow-sm flex items-center p-2 cursor-text group">
              <Sparkles className="w-4 h-4 text-purple-500 mr-2" />
              <input 
                type="text" 
                placeholder="Ask Typeform AI"
                className="w-full text-sm outline-none placeholder-gray-400"
              />
              <button className="w-6 h-6 rounded bg-gray-100 text-gray-400 flex items-center justify-center opacity-50 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 bg-[#fafafa]">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-light text-gray-900">My workspace</h1>
              <button className="text-gray-400 hover:text-gray-600 px-1">
                <MoreHorizontal className="w-5 h-5" />
              </button>
              <button className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm font-medium border border-gray-200 rounded-full px-3 py-1 bg-white ml-2">
                <UserPlus className="w-4 h-4" /> Invite
              </button>
              <button className="w-7 h-7 border border-emerald-200 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 ml-1">
                <Sparkles className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 text-gray-600 font-medium text-sm border border-gray-200 bg-white rounded-md px-3 py-1.5">
                <Search className="w-4 h-4" /> Date created <ChevronDown className="w-4 h-4" />
              </button>
              <div className="flex border border-gray-200 rounded-md bg-white overflow-hidden p-0.5">
                <button className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded text-gray-900 font-medium text-sm">
                  <LayoutList className="w-4 h-4" /> List
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1 text-gray-500 hover:text-gray-900 font-medium text-sm">
                  <Grid className="w-4 h-4" /> Grid
                </button>
              </div>
            </div>
          </div>

          {/* AI Banner */}
          <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-5 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="text-gray-700">
                Create an Evaluate applicants' skills and knowledge relevant to your marketing roles.
                <button className="block mt-3 border border-gray-200 text-gray-700 font-medium text-xs px-3 py-1.5 rounded hover:bg-gray-50">
                  Use this form
                </button>
              </div>
            </div>
            <button className="text-gray-400 hover:text-gray-600 self-start">✕</button>
          </div>

          {/* List Table Header */}
          <div className="grid grid-cols-12 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-4">
            <div className="col-span-6"></div>
            <div className="col-span-2 text-center">Responses</div>
            <div className="col-span-1 text-center">Completed</div>
            <div className="col-span-2 text-center">Updated</div>
            <div className="col-span-1 text-center">Integrations</div>
          </div>

          {/* Form List */}
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
            </div>
          ) : forms.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No forms yet</h3>
              <p className="text-gray-500 mb-6">Create a form to start collecting responses.</p>
              <button 
                onClick={() => setCreateModalOpen(true)}
                className="bg-black text-white px-4 py-2 rounded-lg font-medium"
              >
                Create form
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
              {forms.map((form, idx) => (
                <div 
                  key={form.id} 
                  className={`grid grid-cols-12 items-center p-4 hover:bg-gray-50 transition-colors cursor-pointer relative ${
                    idx !== forms.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                  onClick={() => router.push(`/builder/${form.id}`)}
                >
                  <div className="col-span-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/80 shrink-0" />
                    <div>
                      <div className="font-semibold text-gray-900">{form.title}</div>
                      {form.status === "draft" && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mt-1">Draft</div>
                      )}
                      {form.status === "published" && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mt-1">Published</div>
                      )}
                    </div>
                  </div>
                  <div className="col-span-2 text-center text-gray-500 text-sm">
                    {form.response_count > 0 ? form.response_count : "-"}
                  </div>
                  <div className="col-span-1 text-center text-gray-500 text-sm">-</div>
                  <div className="col-span-2 text-center text-gray-500 text-sm">{formatDate(form.updated_at)}</div>
                  <div className="col-span-1 flex items-center justify-center text-gray-400 gap-2">
                    <Blocks className="w-4 h-4" />
                    
                    {/* Actions Menu Trigger */}
                    <div className="relative ml-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === form.id ? null : form.id);
                        }}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuId === form.id && (
                        <div 
                          ref={menuRef}
                          className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50 text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button 
                            onClick={() => router.push(`/builder/${form.id}`)}
                            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Edit2 className="w-4 h-4" /> Edit
                          </button>
                          
                          {form.status === "published" && (
                            <button 
                              onClick={() => router.push(`/forms/${form.id}/responses`)}
                              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <BarChart2 className="w-4 h-4" /> Results
                            </button>
                          )}

                          <button 
                            onClick={() => handleTogglePublish(form)}
                            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Play className="w-4 h-4" /> {form.status === "published" ? "Unpublish" : "Publish"}
                          </button>
                          
                          <button 
                            onClick={() => handleDuplicate(form)}
                            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" /> Duplicate
                          </button>
                          
                          <div className="h-px bg-gray-100 my-1" />
                          
                          <button 
                            onClick={() => {
                              setDeleteTarget(form);
                              setDeleteModalOpen(true);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Create Modal */}
      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create a new form">
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-600">
            Form title
          </label>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g., Customer Feedback Survey"
            className="w-full border-b-2 border-gray-200 focus:border-black bg-transparent py-2 px-0 text-lg outline-none transition-colors mb-6"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newTitle.trim() || creating}
              className="bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {creating ? "Creating..." : "Continue"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete form">
        <p className="mb-6 text-gray-600">
          Are you sure you want to delete <strong>&quot;{deleteTarget?.title}&quot;</strong>? This action cannot be undone and will remove all responses.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setDeleteModalOpen(false)}
            className="px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors bg-red-500 hover:bg-red-600"
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  );
}
