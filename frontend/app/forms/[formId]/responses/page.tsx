"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { resultsApi } from "@/lib/api/responses";
import { formsApi } from "@/lib/api/forms";
import type { Form, FormStats, PaginatedResponses } from "@/lib/types";
import { useToast } from "@/components/shared/Toast";
import Modal from "@/components/shared/Modal";

export default function ResultsPage() {
  const params = useParams();
  const formId = parseInt(params.formId as string);
  const router = useRouter();
  const { showToast } = useToast();

  const [form, setForm] = useState<Form | null>(null);
  const [stats, setStats] = useState<FormStats | null>(null);
  const [responses, setResponses] = useState<PaginatedResponses | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<"summary" | "individual">("summary");
  const [page, setPage] = useState(1);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeResponseId, setActiveResponseId] = useState<number | null>(null);
  const [responseDetail, setResponseDetail] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    try {
      // Use the forms GET endpoint to get title
      const formData = await formsApi.get(formId);
      setForm(formData);
      
      const statsData = await resultsApi.getStats(formId);
      setStats(statsData);

      const respData = await resultsApi.listResponses(formId, page, 20);
      setResponses(respData);
    } catch {
      showToast("Failed to load results", "error");
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }, [formId, page, showToast, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = () => {
    window.location.href = resultsApi.exportCsv(formId);
  };

  const handleViewDetail = async (id: number) => {
    try {
      const detail = await resultsApi.getResponse(id);
      setResponseDetail(detail);
      setActiveResponseId(id);
      setDetailModalOpen(true);
    } catch {
      showToast("Failed to load response details", "error");
    }
  };

  if (loading || !form || !stats || !responses) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-[var(--tf-border)] flex items-center justify-between px-6 bg-white z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push("/dashboard")}
            className="text-[var(--tf-muted)] hover:text-black font-medium transition-colors"
          >
            ← Dashboard
          </button>
          <div className="w-px h-6 bg-[var(--tf-border)]" />
          <h1 className="font-semibold text-lg">{form.title}</h1>
          <span className="text-[var(--tf-muted)]">— Results</span>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => router.push(`/builder/${formId}`)}
            className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Builder
          </button>
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-[var(--tf-accent)] text-white rounded-lg text-sm font-medium hover:bg-black transition-colors flex items-center gap-2"
          >
            Download CSV ⬇
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-[var(--tf-border)] px-6 pt-4">
        <div className="flex gap-8 max-w-5xl mx-auto">
          <button
            className={`pb-4 px-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "summary" 
                ? "border-[var(--tf-accent)] text-[var(--tf-accent)]" 
                : "border-transparent text-[var(--tf-muted)] hover:text-black"
            }`}
            onClick={() => setActiveTab("summary")}
          >
            Summary
          </button>
          <button
            className={`pb-4 px-2 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "individual" 
                ? "border-[var(--tf-accent)] text-[var(--tf-accent)]" 
                : "border-transparent text-[var(--tf-muted)] hover:text-black"
            }`}
            onClick={() => setActiveTab("individual")}
          >
            Individual Responses ({stats.total_responses})
          </button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
          {activeTab === "summary" ? (
            <div className="flex flex-col gap-8">
              {/* Big Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-[var(--tf-border)] shadow-sm">
                  <div className="text-[var(--tf-text-secondary)] text-sm font-semibold mb-2">Total Responses</div>
                  <div className="text-4xl font-bold">{stats.total_responses}</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-[var(--tf-border)] shadow-sm">
                  <div className="text-[var(--tf-text-secondary)] text-sm font-semibold mb-2">Completion Rate</div>
                  <div className="text-4xl font-bold">{stats.completion_rate}%</div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-[var(--tf-border)] shadow-sm">
                  <div className="text-[var(--tf-text-secondary)] text-sm font-semibold mb-2">Total Sessions</div>
                  <div className="text-4xl font-bold">{stats.total_sessions}</div>
                </div>
              </div>

              {/* Question by Question stats */}
              {stats.questions.map((q, index) => (
                <div key={q.question_id} className="bg-white p-8 rounded-2xl border border-[var(--tf-border)] shadow-sm">
                  <div className="flex items-start gap-4 mb-6">
                    <div className="w-8 h-8 shrink-0 rounded bg-[var(--tf-bg-subtle)] flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-1">{q.title}</h3>
                      <div className="text-sm text-[var(--tf-muted)] uppercase tracking-wider font-semibold">
                        {q.type.replace("_", " ")} • {q.response_count} responses
                      </div>
                    </div>
                  </div>

                  <div className="pl-12">
                    {/* Choices / Dropdown / Yes_No */}
                    {q.options && (
                      <div className="flex flex-col gap-3">
                        {q.options.map((opt, i) => (
                          <div key={i} className="flex flex-col gap-1">
                            <div className="flex justify-between text-sm font-medium">
                              <span>{opt.label}</span>
                              <span className="text-[var(--tf-muted)]">{opt.count} ({opt.percentage}%)</span>
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[var(--tf-accent)] rounded-full transition-all duration-1000"
                                style={{ width: `${opt.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Number / Rating */}
                    {q.average !== undefined && q.average !== null && (
                      <div>
                        <div className="flex items-center gap-8 mb-6">
                          <div>
                            <div className="text-xs text-[var(--tf-muted)] uppercase tracking-wider font-bold mb-1">Average</div>
                            <div className="text-2xl font-bold">{q.average}</div>
                          </div>
                          <div>
                            <div className="text-xs text-[var(--tf-muted)] uppercase tracking-wider font-bold mb-1">Min</div>
                            <div className="text-2xl font-bold">{q.min}</div>
                          </div>
                          <div>
                            <div className="text-xs text-[var(--tf-muted)] uppercase tracking-wider font-bold mb-1">Max</div>
                            <div className="text-2xl font-bold">{q.max}</div>
                          </div>
                        </div>
                        {q.distribution && q.distribution.length > 0 && (
                          <div className="flex items-end gap-2 h-32 mt-4 pt-4 border-t border-[var(--tf-border)]">
                            {q.distribution.map((bucket, i) => {
                              const maxCount = Math.max(...q.distribution!.map(b => b.count), 1);
                              const height = (bucket.count / maxCount) * 100;
                              return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                  <div className="text-xs font-semibold text-[var(--tf-muted)]">{bucket.count}</div>
                                  <div className="w-full bg-[var(--tf-accent)] rounded-t-sm" style={{ height: `${height}%` }} />
                                  <div className="text-xs font-medium text-center truncate w-full">
                                    {bucket.value || bucket.range}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text / Sample Answers */}
                    {q.sample_answers && (
                      <div className="flex flex-col gap-3">
                        {q.sample_answers.map((ans, i) => (
                          <div key={i} className="p-4 bg-gray-50 rounded-lg text-sm border border-[var(--tf-border)]">
                            {ans}
                          </div>
                        ))}
                        {q.response_count > q.sample_answers.length && (
                          <div className="text-sm font-medium text-[var(--tf-accent-blue)]">
                            View {q.response_count - q.sample_answers.length} more in individual responses...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[var(--tf-border)] shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-[var(--tf-border)]">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Response ID</th>
                    <th className="px-6 py-4 font-semibold">Submitted</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold w-1/2">Preview</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--tf-border)]">
                  {responses.items.map(resp => (
                    <tr key={resp.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-[var(--tf-muted)]">#{resp.id}</td>
                      <td className="px-6 py-4">
                        {resp.submitted_at ? new Date(resp.submitted_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-6 py-4">
                        {resp.is_complete ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-[#e8f5e9] text-[#2e7d32]">
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                            Partial
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 truncate max-w-[200px] text-[var(--tf-text-secondary)]">
                        {resp.answer_preview || "No answers yet"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleViewDetail(resp.id)}
                          className="text-[var(--tf-accent-blue)] font-semibold hover:underline"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                  {responses.items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-[var(--tf-muted)]">
                        No responses yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {responses.pages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--tf-border)] bg-gray-50">
                  <button 
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="px-4 py-2 border rounded font-medium disabled:opacity-50 bg-white"
                  >
                    Previous
                  </button>
                  <span className="text-sm font-medium">Page {page} of {responses.pages}</span>
                  <button 
                    disabled={page === responses.pages}
                    onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 border rounded font-medium disabled:opacity-50 bg-white"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Response Detail Modal */}
      <Modal open={detailModalOpen} onClose={() => setDetailModalOpen(false)} title={`Response #${activeResponseId}`}>
        {responseDetail ? (
          <div className="flex flex-col gap-6 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex justify-between text-sm text-[var(--tf-muted)] bg-gray-50 p-4 rounded-lg">
              <div><strong>Started:</strong> {new Date(responseDetail.started_at).toLocaleString()}</div>
              <div><strong>Submitted:</strong> {responseDetail.submitted_at ? new Date(responseDetail.submitted_at).toLocaleString() : "Partial (Not submitted)"}</div>
            </div>

            <div className="flex flex-col gap-4">
              {responseDetail.answers.map((ans: any, i: number) => (
                <div key={ans.id} className="border-b border-[var(--tf-border)] pb-4 last:border-0">
                  <div className="text-sm font-medium mb-2">{i + 1}. {ans.question_title}</div>
                  <div className="bg-gray-50 p-3 rounded text-[var(--tf-text)]">
                    {ans.value_text || <span className="text-gray-400 italic">Skipped</span>}
                  </div>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setDetailModalOpen(false)}
              className="mt-4 tf-ok-button w-full justify-center"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="py-8 text-center">Loading details...</div>
        )}
      </Modal>
    </div>
  );
}
