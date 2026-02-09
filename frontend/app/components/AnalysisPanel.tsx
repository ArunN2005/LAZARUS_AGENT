'use client';

import {
  ArrowRight, Shield, AlertTriangle, Zap, Database, Server,
  Layout, ChevronRight, TrendingUp, Lock, Globe, FileText,
  Clock, CheckCircle, AlertCircle, BookOpen, Table2,
  Layers, MessageSquare,
} from 'lucide-react';

/* ── Types ─────────────────────────────────────────────────────── */

type Recommendation = {
  category: string;
  current: string;
  recommended: string;
  reason: string;
  priority: string;
  effort: string;
};

type WorkflowStep = {
  step: number;
  title: string;
  description: string;
  status: string;
};

type Drawback = {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
};

type WorkflowRow = {
  phase: string;
  task: string;
  description: string;
  duration: string;
  dependencies: string;
  status: string;
};

type AnalysisData = {
  current_stack: {
    backend_framework: string;
    database: string;
    auth: string;
    frontend_framework: string;
    frontend_styling: string;
    total_files: number;
    code_files_scanned: number;
    api_endpoints: string[];
    env_vars: string[];
    database_schemas: string[];
    must_preserve: string[];
    can_modernize: string[];
  };
  recommendations: {
    summary: string;
    health_score: number;
    project_understanding?: {
      purpose: string;
      architecture: string;
      data_flow: string;
    };
    drawbacks?: Drawback[];
    workflow_table?: WorkflowRow[];
    recommendations: Recommendation[];
    workflow_steps: WorkflowStep[];
    risks: string[];
    estimated_impact: string;
  };
};

/* ── Constants ─────────────────────────────────────────────────── */

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500/30' },
  medium: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  low: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
};

const CATEGORY_ICONS: Record<string, typeof Server> = {
  Backend: Server,
  Frontend: Layout,
  Database: Database,
  Security: Lock,
  Infrastructure: Globe,
  security: Lock,
  architecture: Layers,
  frontend: Layout,
  backend: Server,
  database: Database,
  performance: Zap,
};

const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
};

const EFFORT_LABELS: Record<string, string> = {
  low: 'Quick Win',
  medium: 'Moderate',
  high: 'Major',
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  complete: { bg: 'bg-[#39ff14]/10', text: 'text-[#39ff14]', label: 'DONE' },
  pending: { bg: 'bg-[#555]/20', text: 'text-[#888]', label: 'PENDING' },
  active: { bg: 'bg-[#007acc]/20', text: 'text-[#007acc]', label: 'ACTIVE' },
};

/* ── Sub-components ────────────────────────────────────────────── */

function HealthGauge({ score }: { score: number }) {
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'HEALTHY' : score >= 40 ? 'NEEDS WORK' : 'CRITICAL';
  const circumference = 2 * Math.PI * 54;
  const dash = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-28 h-28">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#2a2a2a" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black" style={{ color }}>{score}</span>
          <span className="text-[8px] tracking-wider text-[#888]">{label}</span>
        </div>
      </div>
    </div>
  );
}

function ProjectNarrative({ understanding, summary }: {
  understanding?: { purpose: string; architecture: string; data_flow: string };
  summary: string;
}) {
  return (
    <div className="bg-[#252526] rounded-lg border border-[#333] p-5">
      <h3 className="text-xs font-bold text-[#007acc] tracking-wider mb-4 flex items-center gap-2">
        <BookOpen className="w-4 h-4" /> PROJECT UNDERSTANDING
      </h3>
      <p className="text-sm text-[#ccc] leading-relaxed mb-4">{summary}</p>
      {understanding && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'PURPOSE', value: understanding.purpose, icon: FileText, color: '#39ff14' },
            { label: 'ARCHITECTURE', value: understanding.architecture, icon: Layers, color: '#007acc' },
            { label: 'DATA FLOW', value: understanding.data_flow, icon: TrendingUp, color: '#ff6b35' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#1a1a1a] rounded-lg p-3 border border-[#333]/50">
              <div className="flex items-center gap-1.5 mb-2">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <span className="text-[9px] tracking-wider font-bold" style={{ color }}>{label}</span>
              </div>
              <p className="text-[11px] text-[#999] leading-relaxed">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WorkflowTable({ rows }: { rows: WorkflowRow[] }) {
  return (
    <div className="bg-[#252526] rounded-lg border border-[#333] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-[#333] bg-[#2a2a2a]">
        <Table2 className="w-4 h-4 text-[#39ff14]" />
        <h3 className="text-xs font-bold text-[#39ff14] tracking-wider">PROJECT WORKFLOW</h3>
        <span className="text-[9px] text-[#666] ml-auto">{rows.length} tasks</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[#333] bg-[#1e1e1e]">
              <th className="text-left px-4 py-2.5 text-[9px] font-bold text-[#007acc] tracking-wider">PHASE</th>
              <th className="text-left px-4 py-2.5 text-[9px] font-bold text-[#007acc] tracking-wider">TASK</th>
              <th className="text-left px-4 py-2.5 text-[9px] font-bold text-[#007acc] tracking-wider hidden lg:table-cell">DESCRIPTION</th>
              <th className="text-left px-4 py-2.5 text-[9px] font-bold text-[#007acc] tracking-wider">DURATION</th>
              <th className="text-left px-4 py-2.5 text-[9px] font-bold text-[#007acc] tracking-wider">DEPENDS ON</th>
              <th className="text-left px-4 py-2.5 text-[9px] font-bold text-[#007acc] tracking-wider">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const st = STATUS_STYLES[row.status] || STATUS_STYLES.pending;
              return (
                <tr key={i} className="border-b border-[#333]/50 hover:bg-[#2a2a2a] transition-colors">
                  <td className="px-4 py-2.5 text-[#c678dd] font-mono font-bold whitespace-nowrap">{row.phase}</td>
                  <td className="px-4 py-2.5 text-[#ccc] font-medium">{row.task}</td>
                  <td className="px-4 py-2.5 text-[#888] hidden lg:table-cell max-w-xs truncate">{row.description}</td>
                  <td className="px-4 py-2.5 text-[#e8ab53] font-mono whitespace-nowrap">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{row.duration}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[#888] font-mono">{row.dependencies}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-bold tracking-wider ${st.bg} ${st.text}`}>
                      {row.status === 'complete' ? <CheckCircle className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
                      {st.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DrawbacksList({ drawbacks }: { drawbacks: Drawback[] }) {
  return (
    <div className="bg-[#252526] rounded-lg border border-[#333] p-5">
      <h3 className="text-xs font-bold text-red-400 tracking-wider mb-4 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" /> ISSUES &amp; DRAWBACKS FOUND
        <span className="ml-auto text-[9px] text-[#666]">{drawbacks.length} issues</span>
      </h3>
      <div className="space-y-2">
        {drawbacks.map((d, i) => {
          const sev = SEVERITY_COLORS[d.severity] || SEVERITY_COLORS.medium;
          const Icon = CATEGORY_ICONS[d.category] || AlertCircle;
          return (
            <div key={i} className={`rounded-lg p-3 border ${sev.border} ${sev.bg} flex items-start gap-3`}>
              <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${sev.text}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#ccc]">{d.title}</span>
                  <span className={`px-1.5 py-0.5 text-[7px] rounded font-bold tracking-wider ${sev.bg} ${sev.text} border ${sev.border}`}>
                    {d.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-[10px] text-[#999] mt-1 leading-relaxed">{d.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WorkflowDiagram({ steps }: { steps: WorkflowStep[] }) {
  return (
    <div className="flex items-start gap-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-start flex-1 min-w-0">
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                step.status === 'complete'
                  ? 'bg-[#39ff14]/20 border-[#39ff14] text-[#39ff14]'
                  : step.status === 'active'
                  ? 'bg-[#007acc]/20 border-[#007acc] text-[#007acc] animate-pulse'
                  : 'bg-[#2a2a2a] border-[#444] text-[#888]'
              }`}
            >
              {step.step}
            </div>
            <div className="mt-1.5 text-center px-1">
              <p className="text-[9px] font-bold text-[#ccc] whitespace-nowrap">{step.title}</p>
            </div>
          </div>
          {i < steps.length - 1 && (
            <div className="flex-1 flex items-center mt-3.5 mx-1 min-w-3">
              <div className={`h-0.5 flex-1 ${step.status === 'complete' ? 'bg-[#39ff14]/50' : 'bg-[#333]'}`} />
              <ChevronRight className={`w-3 h-3 flex-shrink-0 ${step.status === 'complete' ? 'text-[#39ff14]' : 'text-[#444]'}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── Main Component ───────────────────────────────────────────── */

export default function AnalysisPanel({
  analysis,
  onProceed,
}: {
  analysis: AnalysisData;
  onProceed: () => void;
}) {
  const { current_stack, recommendations } = analysis;
  const recs = recommendations.recommendations || [];
  const steps = recommendations.workflow_steps || [];
  const risks = recommendations.risks || [];
  const drawbacks = recommendations.drawbacks || [];
  const workflowTable = recommendations.workflow_table || [];
  const understanding = recommendations.project_understanding;

  return (
    <div className="h-full overflow-auto bg-[#0d0d0d]">
      <div className="max-w-7xl mx-auto p-6 space-y-5">

        {/* ── Header Row ──────────────────────────────── */}
        <div className="flex items-start gap-6">
          <div className="flex-1">
            <h2 className="text-lg font-black text-white tracking-wider flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#007acc]" />
              DEEP ANALYSIS REPORT
            </h2>
            <p className="text-[11px] text-[#666] mt-1">
              Review your project structure and current tech before making any changes
            </p>
          </div>
          <HealthGauge score={recommendations.health_score || 50} />
        </div>

        {/* ── Project Understanding ────────────────────── */}
        <ProjectNarrative understanding={understanding} summary={recommendations.summary} />

        {/* ── Current Tech Stack ──────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
          {[
            { label: 'Backend', value: current_stack.backend_framework, icon: Server, color: '#39ff14' },
            { label: 'Database', value: current_stack.database, icon: Database, color: '#007acc' },
            { label: 'Frontend', value: current_stack.frontend_framework, icon: Layout, color: '#ff6b35' },
            { label: 'Auth', value: current_stack.auth, icon: Lock, color: '#c678dd' },
            { label: 'Styling', value: current_stack.frontend_styling, icon: Globe, color: '#e8ab53' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#252526] rounded-lg p-3 border border-[#333]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <span className="text-[9px] tracking-wider text-[#888] uppercase">{label}</span>
              </div>
              <p className="text-[11px] font-bold text-white truncate">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Stats Row ───────────────────────────────── */}
        <div className="flex gap-3">
          {[
            { label: 'Total Files', value: current_stack.total_files, color: '#39ff14' },
            { label: 'Scanned', value: current_stack.code_files_scanned, color: '#007acc' },
            { label: 'Endpoints', value: current_stack.api_endpoints?.length || 0, color: '#ff6b35' },
            { label: 'Preserve', value: current_stack.must_preserve?.length || 0, color: '#ef4444' },
            { label: 'Modernize', value: current_stack.can_modernize?.length || 0, color: '#22c55e' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex-1 bg-[#252526] rounded-lg p-2.5 border border-[#333] text-center">
              <p className="text-xl font-black" style={{ color }}>{value}</p>
              <p className="text-[8px] text-[#666] tracking-wider mt-0.5">{label.toUpperCase()}</p>
            </div>
          ))}
        </div>

        {/* ── Workflow Table (Google Sheets Style) ──── */}
        {workflowTable.length > 0 && <WorkflowTable rows={workflowTable} />}

        {/* ── Drawbacks & Issues ───────────────────── */}
        {drawbacks.length > 0 && <DrawbacksList drawbacks={drawbacks} />}

        {/* ── Workflow Diagram ─────────────────────── */}
        <div className="bg-[#252526] rounded-lg p-4 border border-[#333]">
          <h3 className="text-xs font-bold text-[#007acc] tracking-wider mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> MIGRATION PIPELINE
          </h3>
          <WorkflowDiagram steps={steps} />
        </div>

        {/* ── Upgrade Recommendations ─────────────── */}
        <div>
          <h3 className="text-xs font-bold text-[#39ff14] tracking-wider mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" /> RECOMMENDED UPGRADES
          </h3>
          <div className="space-y-2">
            {recs.map((rec, i) => {
              const Icon = CATEGORY_ICONS[rec.category] || Server;
              return (
                <div key={i} className="bg-[#252526] rounded-lg p-3 border border-[#333] flex items-center gap-3">
                  <Icon className="w-4 h-4 text-[#888] flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#ccc]">{rec.category}</span>
                      <span className="px-1.5 py-0.5 text-[7px] rounded font-bold" style={{
                        backgroundColor: `${PRIORITY_COLORS[rec.priority]}20`,
                        color: PRIORITY_COLORS[rec.priority],
                      }}>
                        {rec.priority.toUpperCase()}
                      </span>
                      <span className="text-[8px] text-[#666]">{EFFORT_LABELS[rec.effort] || rec.effort}</span>
                    </div>
                    <p className="text-[10px] text-[#888] mt-0.5">{rec.reason}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[8px] text-[#666]">CURRENT</p>
                      <p className="text-[10px] text-red-400 font-mono">{rec.current}</p>
                    </div>
                    <ArrowRight className="w-3 h-3 text-[#39ff14]" />
                    <div className="text-left">
                      <p className="text-[8px] text-[#666]">UPGRADE</p>
                      <p className="text-[10px] text-[#39ff14] font-mono">{rec.recommended}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Risks & API Endpoints ───────────────── */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#252526] rounded-lg p-4 border border-[#333]">
            <h3 className="text-xs font-bold text-red-400 tracking-wider mb-3 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> RISKS
            </h3>
            <ul className="space-y-1.5">
              {risks.map((risk, i) => (
                <li key={i} className="flex items-start gap-2 text-[10px] text-[#888]">
                  <span className="text-red-400 mt-0.5">&#x2022;</span>
                  {risk}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[#252526] rounded-lg p-4 border border-[#333]">
            <h3 className="text-xs font-bold text-[#22c55e] tracking-wider mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> IMPACT
            </h3>
            <p className="text-[10px] text-[#888] mb-3">{recommendations.estimated_impact}</p>
            {(current_stack.api_endpoints?.length || 0) > 0 && (
              <>
                <p className="text-[8px] text-[#666] tracking-wider mb-1">DETECTED ENDPOINTS:</p>
                <div className="flex flex-wrap gap-1">
                  {current_stack.api_endpoints.slice(0, 6).map((ep, i) => (
                    <span key={i} className="px-1.5 py-0.5 text-[8px] bg-[#1a1a1a] text-[#007acc] rounded font-mono">{ep}</span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── CTA: Proceed to Planning ────────────── */}
        <div className="flex justify-center pt-2 pb-6">
          <button
            onClick={onProceed}
            className="group flex items-center gap-3 px-8 py-3.5 rounded-xl text-sm font-bold bg-gradient-to-r from-[#007acc] to-[#005f9e] text-white hover:shadow-[0_0_30px_rgba(0,122,204,0.4)] transition-all"
          >
            <MessageSquare className="w-5 h-5" />
            I UNDERSTAND &mdash; LET&apos;S PLAN THE CHANGES
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
