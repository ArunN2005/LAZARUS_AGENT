'use client';

import { useState } from 'react';
import {
  ArrowRight, AlertTriangle, Zap, CheckSquare, Square,
  MessageSquare, Wrench, Send, Sparkles, RotateCcw,
  Lightbulb, ChevronDown, ChevronUp,
} from 'lucide-react';

type Drawback = {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
};

type Recommendation = {
  category: string;
  current: string;
  recommended: string;
  reason: string;
  priority: string;
  effort: string;
};

type PlanningPanelProps = {
  drawbacks: Drawback[];
  recommendations: Recommendation[];
  onStartBuild: (selectedDrawbacks: string[], selectedRecs: string[], instructions: string) => void;
  onBack: () => void;
};

const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-red-400',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-blue-400',
};

export default function PlanningPanel({
  drawbacks,
  recommendations,
  onStartBuild,
  onBack,
}: PlanningPanelProps) {
  const [selectedDrawbacks, setSelectedDrawbacks] = useState<Set<string>>(new Set());
  const [selectedRecs, setSelectedRecs] = useState<Set<string>>(new Set());
  const [instructions, setInstructions] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(true);

  const toggleDrawback = (id: string) => {
    setSelectedDrawbacks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleRec = (category: string) => {
    setSelectedRecs(prev => {
      const next = new Set(prev);
      next.has(category) ? next.delete(category) : next.add(category);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedDrawbacks(new Set(drawbacks.map(d => d.id)));
    setSelectedRecs(new Set(recommendations.map(r => r.category)));
  };

  const selectNone = () => {
    setSelectedDrawbacks(new Set());
    setSelectedRecs(new Set());
  };

  const totalSelected = selectedDrawbacks.size + selectedRecs.size;

  const handleStart = () => {
    // Build context from selections
    const drawbackTexts = drawbacks
      .filter(d => selectedDrawbacks.has(d.id))
      .map(d => d.title);
    const recTexts = recommendations
      .filter(r => selectedRecs.has(r.category))
      .map(r => `Upgrade ${r.category} from ${r.current} to ${r.recommended}`);

    onStartBuild(drawbackTexts, recTexts, instructions);
  };

  // Suggested prompts based on selections
  const suggestedPrompts = [
    'Modernize the tech stack while keeping all existing functionality',
    'Fix security issues first, then upgrade the framework',
    'Keep the database schema, modernize everything else',
    'Make it production-ready with proper error handling and tests',
    'Convert to a modern full-stack TypeScript application',
  ];

  return (
    <div className="h-full overflow-auto bg-[#0d0d0d]">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* ── Header ──────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-[10px] text-[#888] hover:text-[#ccc] transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Back to Analysis
            </button>
          </div>
          <h2 className="text-lg font-black text-white tracking-wider flex items-center gap-3">
            <Wrench className="w-5 h-5 text-[#39ff14]" />
            PLAN YOUR CHANGES
          </h2>
          <p className="text-[11px] text-[#666] mt-1">
            Select the issues to fix and upgrades to apply. Then describe any specific requirements.
          </p>
        </div>

        {/* ── Quick Actions ───────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            onClick={selectAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold bg-[#252526] border border-[#333] text-[#39ff14] hover:bg-[#2a2a2a] transition-colors"
          >
            <CheckSquare className="w-3 h-3" /> Select All
          </button>
          <button
            onClick={selectNone}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold bg-[#252526] border border-[#333] text-[#888] hover:bg-[#2a2a2a] transition-colors"
          >
            <Square className="w-3 h-3" /> Clear
          </button>
          <span className="text-[10px] text-[#666] ml-auto">
            {totalSelected} item{totalSelected !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* ── Issues to Fix ───────────────────────────── */}
        {drawbacks.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-red-400 tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> ISSUES TO FIX
            </h3>
            <div className="space-y-1.5">
              {drawbacks.map((d) => {
                const selected = selectedDrawbacks.has(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => toggleDrawback(d.id)}
                    className={`w-full text-left rounded-lg p-3 border transition-all flex items-start gap-3 ${
                      selected
                        ? 'bg-[#39ff14]/5 border-[#39ff14]/30'
                        : 'bg-[#252526] border-[#333] hover:border-[#555]'
                    }`}
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {selected ? (
                        <CheckSquare className="w-4 h-4 text-[#39ff14]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#555]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${SEVERITY_DOT[d.severity] || 'bg-gray-400'}`} />
                        <span className="text-xs font-bold text-[#ccc]">{d.title}</span>
                        <span className="text-[8px] text-[#666] uppercase">{d.severity}</span>
                      </div>
                      <p className="text-[10px] text-[#888] mt-1">{d.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Upgrades to Apply ───────────────────────── */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-[#39ff14] tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4" /> UPGRADES TO APPLY
          </h3>
          <div className="space-y-1.5">
            {recommendations.map((rec) => {
              const selected = selectedRecs.has(rec.category);
              return (
                <button
                  key={rec.category}
                  onClick={() => toggleRec(rec.category)}
                  className={`w-full text-left rounded-lg p-3 border transition-all flex items-start gap-3 ${
                    selected
                      ? 'bg-[#007acc]/5 border-[#007acc]/30'
                      : 'bg-[#252526] border-[#333] hover:border-[#555]'
                  }`}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {selected ? (
                      <CheckSquare className="w-4 h-4 text-[#007acc]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#555]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#ccc]">{rec.category}</span>
                      <span className="text-[10px] text-red-400 font-mono line-through">{rec.current}</span>
                      <ArrowRight className="w-3 h-3 text-[#39ff14]" />
                      <span className="text-[10px] text-[#39ff14] font-mono">{rec.recommended}</span>
                    </div>
                    <p className="text-[10px] text-[#888] mt-1">{rec.reason}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Suggested Prompts ────────────────────────── */}
        <div>
          <button
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="flex items-center gap-2 text-xs font-bold text-[#e8ab53] tracking-wider mb-2"
          >
            <Lightbulb className="w-4 h-4" />
            SUGGESTED INSTRUCTIONS
            {showSuggestions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showSuggestions && (
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => setInstructions(prompt)}
                  className="px-3 py-1.5 rounded-full text-[10px] bg-[#252526] border border-[#333] text-[#888] hover:border-[#e8ab53] hover:text-[#e8ab53] transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Custom Instructions ─────────────────────── */}
        <div className="bg-[#252526] rounded-lg border border-[#333] p-4">
          <h3 className="text-xs font-bold text-[#007acc] tracking-wider mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> YOUR SPECIFIC INSTRUCTIONS
          </h3>
          <textarea
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            placeholder="Describe exactly what you want changed... (e.g., 'Modernize the backend to FastAPI, keep the same database schema, add JWT auth, and rebuild the frontend in Next.js with Tailwind')"
            rows={4}
            className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-4 py-3 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#007acc]/50 resize-none transition-all"
          />
        </div>

        {/* ── Summary & Start ─────────────────────────── */}
        <div className="bg-[#1a1a1a] rounded-xl border border-[#333] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-bold text-white tracking-wider">BUILD PLAN SUMMARY</h3>
              <p className="text-[10px] text-[#666] mt-0.5">
                {selectedDrawbacks.size} issue{selectedDrawbacks.size !== 1 ? 's' : ''} to fix,{' '}
                {selectedRecs.size} upgrade{selectedRecs.size !== 1 ? 's' : ''} to apply
                {instructions ? ', with custom instructions' : ''}
              </p>
            </div>
            <Sparkles className="w-5 h-5 text-[#39ff14]" />
          </div>

          {totalSelected === 0 && !instructions ? (
            <p className="text-[11px] text-[#555] italic mb-4">
              Select at least one issue or upgrade, or write custom instructions to proceed.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {drawbacks
                .filter(d => selectedDrawbacks.has(d.id))
                .map(d => (
                  <span key={d.id} className="px-2 py-1 rounded text-[9px] bg-red-500/10 text-red-400 border border-red-500/20">
                    Fix: {d.title}
                  </span>
                ))}
              {recommendations
                .filter(r => selectedRecs.has(r.category))
                .map(r => (
                  <span key={r.category} className="px-2 py-1 rounded text-[9px] bg-[#007acc]/10 text-[#007acc] border border-[#007acc]/20">
                    Upgrade: {r.category}
                  </span>
                ))}
              {instructions && (
                <span className="px-2 py-1 rounded text-[9px] bg-[#e8ab53]/10 text-[#e8ab53] border border-[#e8ab53]/20">
                  + Custom instructions
                </span>
              )}
            </div>
          )}

          <button
            onClick={handleStart}
            disabled={totalSelected === 0 && !instructions}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#39ff14] to-[#22c55e] text-black hover:shadow-[0_0_40px_rgba(57,255,20,0.3)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <Send className="w-5 h-5" />
            START BUILDING
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
