import React, { useState, useEffect } from "react";
import { Send, FileText, MessageSquareText, ShieldAlert, ChevronDown, ChevronUp } from "lucide-react";
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
  const [showAdvancedSIIS, setShowAdvancedSIIS] = useState(false);
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
      setError("Please describe the problem you are experiencing with your device.");
      return;
    }
    // If title or content are empty, provide friendly defaults for raw queries
    const finalTitle = title.trim() || "Samsung Device Troubleshooting Guidance";
    const finalContent = content.trim() || `General troubleshooting steps for: ${query.trim()}`;

    setError(null);
    onSubmit({
      query: query.trim(),
      siis_response: {
        title: finalTitle,
        content: finalContent,
      },
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-[#1C2541] rounded-2xl p-5 sm:p-6 border border-slate-200 dark:border-slate-700/60 shadow-xl space-y-5"
    >
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/50 pb-3">
        <h2 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquareText className="w-5 h-5 text-cyan-500" />
          <span>Describe Device Problem</span>
        </h2>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
          Guided Engine
        </span>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-500/40 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Problem Description TextArea */}
      <div className="space-y-1.5">
        <label htmlFor="troubleshoot-query" className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Device Problem / Symptom <span className="text-cyan-500">*</span>
        </label>
        <textarea
          id="troubleshoot-query"
          rows={4}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Describe what's wrong with your Samsung device (e.g. My screen keeps flickering whenever I open Gmail)..."
          className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-[#0B132B] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-sm focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-colors resize-none"
        />
      </div>

      {/* Collapsible SIIS Article Details (Advanced / Evaluation context) */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
        <button
          type="button"
          onClick={() => setShowAdvancedSIIS((prev) => !prev)}
          className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-900/50 hover:bg-slate-200 dark:hover:bg-slate-800 text-left transition-colors text-xs font-medium text-slate-700 dark:text-slate-300"
          aria-expanded={showAdvancedSIIS}
        >
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-500" />
            <span>Grounding Knowledge Article (SIIS)</span>
            {title && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-cyan-600 dark:text-cyan-400 font-mono truncate max-w-[150px]">
                {title}
              </span>
            )}
          </div>
          {showAdvancedSIIS ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showAdvancedSIIS && (
          <div className="space-y-4 pt-4 px-1 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Article Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Blank or black display on a Samsung phone"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-[#0B132B] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Article Text Content
              </label>
              <textarea
                rows={4}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Raw SIIS article text containing troubleshooting steps..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#0B132B] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 text-xs font-mono leading-relaxed focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg ${
          isLoading || !query.trim()
            ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-blue-500/20 hover:shadow-cyan-500/30 active:scale-[0.98]"
        }`}
      >
        <Send className="w-4 h-4" />
        <span>{isLoading ? "Analyzing & Building Fix Steps..." : "Start Guided Fix"}</span>
      </button>
    </form>
  );
};
