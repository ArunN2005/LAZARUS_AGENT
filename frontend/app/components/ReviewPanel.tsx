'use client';

import { useState } from 'react';
import {
  MessageSquare, RotateCcw, Send, Eye, CheckCircle,
  AlertCircle, ArrowRight, Sparkles, ThumbsUp, ThumbsDown,
  RefreshCcw, GitPullRequest,
} from 'lucide-react';

type ReviewPanelProps = {
  artifactCount: number;
  status: string;
  retryCount: number;
  errors: { attempt: number; type: string; message: string }[];
  onRefine: (feedback: string) => void;
  onDeploy: () => void;
  isDeploying: boolean;
  deployStatus: { status: string; message: string; url?: string } | null;
};

export default function ReviewPanel({
  artifactCount,
  status,
  retryCount,
  errors,
  onRefine,
  onDeploy,
  isDeploying,
  deployStatus,
}: ReviewPanelProps) {
  const [feedback, setFeedback] = useState('');
  const [satisfaction, setSatisfaction] = useState<'good' | 'needs-work' | null>(null);

  const suggestedFeedback = [
    'The preview looks good, but fix the styling',
    'Add error handling and loading states',
    'The API endpoints need authentication',
    'Make the UI more responsive and mobile-friendly',
    'Add proper form validation',
  ];

  return (
    <div className="border-t border-[#3c3c3c] bg-[#1e1e1e]">
      <div className="p-4 max-w-4xl mx-auto space-y-4">

        {/* ── Build Status ──────────────────────────── */}
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold ${
            status === 'Resurrected'
              ? 'bg-[#39ff14]/10 text-[#39ff14] border border-[#39ff14]/30'
              : status === 'Error'
              ? 'bg-red-500/10 text-red-400 border border-red-500/30'
              : 'bg-[#e8ab53]/10 text-[#e8ab53] border border-[#e8ab53]/30'
          }`}>
            {status === 'Resurrected' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {status === 'Resurrected' ? 'BUILD COMPLETE' : status === 'Error' ? 'BUILD FAILED' : 'PARTIAL BUILD'}
          </div>
          <span className="text-[10px] text-[#666]">
            {artifactCount} file{artifactCount !== 1 ? 's' : ''} generated
            {retryCount > 0 ? ` (${retryCount} auto-heal${retryCount > 1 ? 's' : ''})` : ''}
          </span>
          <div className="flex-1" />

          {/* Quick satisfaction */}
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#666]">How does it look?</span>
            <button
              onClick={() => setSatisfaction('good')}
              className={`p-1.5 rounded transition-colors ${
                satisfaction === 'good' ? 'bg-[#39ff14]/20 text-[#39ff14]' : 'text-[#555] hover:text-[#39ff14]'
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSatisfaction('needs-work')}
              className={`p-1.5 rounded transition-colors ${
                satisfaction === 'needs-work' ? 'bg-red-500/20 text-red-400' : 'text-[#555] hover:text-red-400'
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Feedback Area (shown when needs-work or always visible) ── */}
        <div className="bg-[#252526] rounded-lg border border-[#333] p-4">
          <h3 className="text-xs font-bold text-[#007acc] tracking-wider mb-2 flex items-center gap-2">
            <MessageSquare className="w-3.5 h-3.5" />
            {satisfaction === 'good' ? 'ANY FINAL TWEAKS?' : 'WHAT NEEDS TO CHANGE?'}
          </h3>

          {/* Suggested refinements */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {suggestedFeedback.map((s, i) => (
              <button
                key={i}
                onClick={() => setFeedback(s)}
                className="px-2 py-1 rounded-full text-[9px] bg-[#1a1a1a] border border-[#333] text-[#888] hover:border-[#007acc] hover:text-[#007acc] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <textarea
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder="Describe what to improve... The AI will rebuild with your feedback."
              rows={2}
              className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#007acc]/50 resize-none transition-all"
            />
            <button
              onClick={() => { if (feedback.trim()) onRefine(feedback); setFeedback(''); }}
              disabled={!feedback.trim()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-[#007acc] text-white hover:bg-[#0098ff] disabled:opacity-30 disabled:cursor-not-allowed transition-all self-end"
            >
              <RefreshCcw className="w-3.5 h-3.5" />
              Refine
            </button>
          </div>
        </div>

        {/* ── Deploy ──────────────────────────────────── */}
        {satisfaction === 'good' && (
          <div className="flex items-center gap-3">
            <button
              onClick={onDeploy}
              disabled={isDeploying || artifactCount === 0}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                deployStatus?.status === 'success'
                  ? 'bg-[#39ff14]/20 text-[#39ff14] border border-[#39ff14]/30'
                  : 'bg-gradient-to-r from-[#39ff14] to-[#22c55e] text-black hover:shadow-[0_0_30px_rgba(57,255,20,0.3)]'
              } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {deployStatus?.status === 'success' ? (
                <><CheckCircle className="w-4 h-4" /> DEPLOYED SUCCESSFULLY</>
              ) : (
                <><GitPullRequest className="w-4 h-4" /> DEPLOY &amp; CREATE PR</>
              )}
            </button>
            {deployStatus?.url && (
              <a
                href={deployStatus.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 rounded-xl text-sm font-bold border border-[#007acc] text-[#007acc] hover:bg-[#007acc]/10 transition-colors"
              >
                View PR
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
