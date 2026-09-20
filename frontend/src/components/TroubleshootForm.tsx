import React, { useState, useEffect } from "react";
import { Send, FileText, MessageSquareText, ShieldAlert } from "lucide-react";
import { TroubleshootRequest } from "../types";

interface TroubleshootFormProps {
  initialValues?: TroubleshootRequest;
  onSubmit: (request: TroubleshootRequest) => void;
  isLoading: boolean;
}

export const TroubleshootForm: React.FC<TroubleshootFormProps> = ({
  initialValues,
  onSubmit,
  isLoading,
}) => {
  const [query, setQuery] = useState(initialValues?.query || "");
  const [title, setTitle] = useState(initialValues?.siis_response?.title || "");
  const [content, setContent] = useState(initialValues?.siis_response?.content || "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialValues) {
      setQuery(initialValues.query || "");
      setTitle(initialValues.siis_response?.title || "");
      setContent(initialValues.siis_response?.content || "");
      setError(null);
    }
  }, [initialValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setError("User complaint query is required.");
      return;
    }
    if (!title.trim() || !content.trim()) {
      setError("SIIS Knowledge Article Title and Content are required.");
      return;
    }
    setError(null);
    onSubmit({
      query: query.trim(),
      siis_response: {
        title: title.trim(),
        content: content.trim(),
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#1C2541] rounded-2xl p-6 border border-slate-700/60 shadow-xl space-y-5"
    >
      <div className="flex items-center justify-between border-b border-slate-700/50 pb-3">
        <h2 className="font-semibold text-lg text-white flex items-center gap-2">
          <MessageSquareText className="w-5 h-5 text-cyan-400" />
          <span>Troubleshooting Request Payload</span>
        </h2>
        <span className="text-xs text-slate-400 font-mono">POST /api/troubleshoot</span>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Query input */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
          User Device Complaint / Query <span className="text-cyan-400">*</span>
        </label>
        <textarea
          rows={3}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe the device symptom (e.g. My Samsung A11 tablet screen flashes and goes completely blank...)"
          className="w-full px-4 py-3 rounded-xl bg-[#0B132B] border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
        />
      </div>

      {/* SIIS Article Inputs */}
      <div className="space-y-4 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <FileText className="w-4 h-4 text-cyan-400" />
          <span>SIIS Knowledge Store Article Payload</span>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Article Title <span className="text-cyan-400">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Email server not responding on Samsung phone or tablet"
            className="w-full px-4 py-2.5 rounded-xl bg-[#0B132B] border border-slate-700 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Article Content <span className="text-cyan-400">*</span>
          </label>
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste raw SIIS article text containing troubleshooting steps..."
            className="w-full px-4 py-3 rounded-xl bg-[#0B132B] border border-slate-700 text-slate-100 placeholder-slate-500 text-xs font-mono leading-relaxed focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-colors"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className={`w-full py-3.5 px-6 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
          isLoading
            ? "bg-slate-700 text-slate-400 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-blue-500/20 hover:shadow-cyan-500/30"
        }`}
      >
        <Send className="w-4 h-4" />
        <span>{isLoading ? "Processing Guided Troubleshooting..." : "Execute Guided Troubleshooting"}</span>
      </button>
    </form>
  );
};
