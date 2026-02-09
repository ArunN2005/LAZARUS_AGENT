'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bug, X, Trash2, Pause, Play, ChevronDown, ChevronRight,
  AlertCircle, Info, AlertTriangle, Zap, Globe, Cpu, Database,
  Filter, Download, Copy, CheckCircle
} from 'lucide-react';

type DebugLogEntry = {
  timestamp: number;
  time_str: string;
  level: 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category: string;
  message: string;
  details: Record<string, any>;
};

type Props = {
  isOpen: boolean;
  onToggle: () => void;
};

const LEVEL_COLORS: Record<string, { bg: string; text: string; icon: typeof Info }> = {
  DEBUG: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', icon: Bug },
  INFO: { bg: 'bg-green-500/10', text: 'text-green-400', icon: Info },
  WARNING: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', icon: AlertTriangle },
  ERROR: { bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertCircle },
  CRITICAL: { bg: 'bg-red-500/20', text: 'text-red-500', icon: Zap },
};

const CATEGORY_ICONS: Record<string, typeof Globe> = {
  HTTP_REQUEST: Globe,
  HTTP_RESPONSE: Globe,
  GEMINI_API: Cpu,
  SCAN: Database,
  ANALYZE: Database,
  SANDBOX: Zap,
  RESURRECT: Zap,
  RESURRECT_STREAM: Zap,
  RESURRECT_DEBUG: Bug,
  STREAM_CHUNK: ChevronRight,
  COMMIT: Database,
  SERVER: Cpu,
  EXCEPTION: AlertCircle,
};

export default function DebugPanel({ isOpen, onToggle }: Props) {
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [levelFilter, setLevelFilter] = useState<Set<string>>(new Set(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']));
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const sinceRef = useRef<number>(0);
  const pollIntervalRef = useRef<number | null>(null);
  const autoScrollRef = useRef(true);

  // Poll for debug logs from backend
  const fetchLogs = useCallback(async () => {
    if (isPaused) return;
    try {
      const resp = await fetch(`http://localhost:8000/api/debug-logs?since=${sinceRef.current}`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.logs && data.logs.length > 0) {
        setLogs(prev => {
          const combined = [...prev, ...data.logs];
          // Keep last 2000 entries
          return combined.slice(-2000);
        });
        sinceRef.current = data.server_time;
      }
    } catch {
      // Backend not reachable, skip
    }
  }, [isPaused]);

  // Start/stop polling
  useEffect(() => {
    if (isOpen) {
      fetchLogs(); // immediate fetch
      const id = window.setInterval(fetchLogs, 1000);
      pollIntervalRef.current = id;
      return () => window.clearInterval(id);
    } else {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    }
  }, [isOpen, fetchLogs]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScrollRef.current && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Handle scroll - disable auto-scroll if user scrolls up
  const handleScroll = () => {
    if (!logContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    autoScrollRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  const toggleRow = (idx: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleLevel = (level: string) => {
    setLevelFilter(prev => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  };

  const clearLogs = () => {
    setLogs([]);
    sinceRef.current = Date.now() / 1000;
  };

  const exportLogs = () => {
    const text = filteredLogs.map(l =>
      `[${l.time_str}] ${l.level} [${l.category}] ${l.message}${Object.keys(l.details).length > 0 ? '\n  ' + JSON.stringify(l.details, null, 2) : ''}`
    ).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lazarus-debug-${new Date().toISOString().slice(0, 19)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyLogs = () => {
    const text = filteredLogs.map(l =>
      `[${l.time_str}] ${l.level} [${l.category}] ${l.message}`
    ).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Get unique categories
  const categories = ['ALL', ...Array.from(new Set(logs.map(l => l.category)))];

  // Filter logs
  const filteredLogs = logs.filter(l => {
    if (!levelFilter.has(l.level)) return false;
    if (categoryFilter !== 'ALL' && l.category !== categoryFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return l.message.toLowerCase().includes(q) ||
        l.category.toLowerCase().includes(q) ||
        JSON.stringify(l.details).toLowerCase().includes(q);
    }
    return true;
  });

  // Count by level
  const counts = {
    DEBUG: logs.filter(l => l.level === 'DEBUG').length,
    INFO: logs.filter(l => l.level === 'INFO').length,
    WARNING: logs.filter(l => l.level === 'WARNING').length,
    ERROR: logs.filter(l => l.level === 'ERROR').length,
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0d1117]/98 backdrop-blur-sm">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#161b22] border-b border-[#30363d] flex-shrink-0">
        <Bug className="w-4 h-4 text-[#f0883e]" />
        <span className="text-sm font-bold text-[#f0883e] tracking-wider">DEBUG DEVELOPER LOGS</span>

        <div className="flex items-center gap-1.5 ml-4">
          {Object.entries(counts).map(([level, count]) => {
            const style = LEVEL_COLORS[level];
            return (
              <button
                key={level}
                onClick={() => toggleLevel(level)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                  levelFilter.has(level)
                    ? `${style.bg} ${style.text} border border-current/30`
                    : 'text-[#484f58] border border-transparent'
                }`}
              >
                {level} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search logs..."
          className="w-48 bg-[#0d1117] border border-[#30363d] rounded px-2 py-1 text-xs text-[#c9d1d9] placeholder-[#484f58] focus:outline-none focus:border-[#f0883e]/50"
        />

        {/* Actions */}
        <button onClick={() => setShowFilters(!showFilters)} className="p-1.5 hover:bg-[#30363d] rounded transition-colors" title="Filters">
          <Filter className="w-3.5 h-3.5 text-[#8b949e]" />
        </button>
        <button onClick={() => setIsPaused(!isPaused)} className="p-1.5 hover:bg-[#30363d] rounded transition-colors" title={isPaused ? 'Resume' : 'Pause'}>
          {isPaused ? <Play className="w-3.5 h-3.5 text-green-400" /> : <Pause className="w-3.5 h-3.5 text-[#8b949e]" />}
        </button>
        <button onClick={copyLogs} className="p-1.5 hover:bg-[#30363d] rounded transition-colors" title="Copy logs">
          {copied ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-[#8b949e]" />}
        </button>
        <button onClick={exportLogs} className="p-1.5 hover:bg-[#30363d] rounded transition-colors" title="Export logs">
          <Download className="w-3.5 h-3.5 text-[#8b949e]" />
        </button>
        <button onClick={clearLogs} className="p-1.5 hover:bg-[#30363d] rounded transition-colors" title="Clear">
          <Trash2 className="w-3.5 h-3.5 text-[#8b949e]" />
        </button>
        <button onClick={onToggle} className="p-1.5 hover:bg-[#30363d] rounded transition-colors ml-2" title="Close">
          <X className="w-4 h-4 text-[#8b949e]" />
        </button>
      </div>

      {/* ── Category Filter Bar ─────────────────────────────────── */}
      {showFilters && (
        <div className="flex items-center gap-1 px-4 py-1.5 bg-[#161b22] border-b border-[#30363d] overflow-x-auto flex-shrink-0">
          <span className="text-[10px] text-[#484f58] mr-2">CATEGORY:</span>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                categoryFilter === cat
                  ? 'bg-[#f0883e]/20 text-[#f0883e] border border-[#f0883e]/30'
                  : 'text-[#8b949e] hover:text-[#c9d1d9] border border-transparent'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* ── Log Entries ─────────────────────────────────────────── */}
      <div
        ref={logContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto font-mono text-[12px]"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#484f58]">
            <Bug className="w-10 h-10 mb-3 opacity-30" />
            <p>No debug logs yet. Interact with the application to see logs here.</p>
            <p className="text-[10px] mt-1">Logs are pulled from http://localhost:8000/api/debug-logs</p>
          </div>
        ) : (
          <table className="w-full">
            <tbody>
              {filteredLogs.map((log, idx) => {
                const style = LEVEL_COLORS[log.level] || LEVEL_COLORS.INFO;
                const Icon = style.icon;
                const CatIcon = CATEGORY_ICONS[log.category] || Info;
                const isExpanded = expandedRows.has(idx);
                const hasDetails = Object.keys(log.details).length > 0;

                return (
                  <tr
                    key={idx}
                    className="border-b border-[#21262d] hover:bg-[#161b22] cursor-pointer group"
                    onClick={() => hasDetails && toggleRow(idx)}
                  >
                    <td className="w-0">
                      <div className={`flex flex-col ${isExpanded ? '' : ''}`}>
                        {/* Main row */}
                        <div className="flex items-center gap-2 px-3 py-1">
                          {/* Timestamp */}
                          <span className="text-[#484f58] w-[85px] flex-shrink-0">{log.time_str}</span>

                          {/* Level badge */}
                          <span className={`flex items-center gap-1 w-[70px] flex-shrink-0 ${style.text}`}>
                            <Icon className="w-3 h-3" />
                            <span className="text-[10px] font-bold">{log.level}</span>
                          </span>

                          {/* Category */}
                          <span className="flex items-center gap-1 w-[140px] flex-shrink-0 text-[#8b949e]">
                            <CatIcon className="w-3 h-3 opacity-50" />
                            <span className="text-[10px] truncate">{log.category}</span>
                          </span>

                          {/* Message */}
                          <span className="text-[#c9d1d9] flex-1 truncate">{log.message}</span>

                          {/* Expand indicator */}
                          {hasDetails && (
                            <span className="text-[#484f58] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </span>
                          )}
                        </div>

                        {/* Expanded details */}
                        {isExpanded && hasDetails && (
                          <div className="px-3 pb-2 ml-[85px]">
                            <div className="bg-[#0d1117] border border-[#30363d] rounded p-3 text-[11px]">
                              {Object.entries(log.details).map(([key, value]) => (
                                <div key={key} className="flex gap-2 py-0.5">
                                  <span className="text-[#f0883e] flex-shrink-0 min-w-[120px]">{key}:</span>
                                  <span className="text-[#8b949e] break-all whitespace-pre-wrap">
                                    {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Status Bar ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-1 bg-[#161b22] border-t border-[#30363d] text-[10px] text-[#484f58] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span>{filteredLogs.length} / {logs.length} entries</span>
          {isPaused && <span className="text-yellow-400 flex items-center gap-1"><Pause className="w-3 h-3" /> PAUSED</span>}
          {!isPaused && <span className="text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> LIVE</span>}
        </div>
        <div className="flex items-center gap-3">
          <span>Polling: 1s</span>
          <span>Buffer: 2000 max</span>
        </div>
      </div>
    </div>
  );
}
