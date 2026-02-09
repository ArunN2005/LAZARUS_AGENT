'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Play, GitPullRequest, CheckCircle, Cpu, ShieldAlert,
  FolderTree, Terminal as TerminalIcon, Eye,
  Loader2, AlertCircle, Search, ArrowRight, Zap,
  BarChart3, Bug,
} from 'lucide-react';
import FileTree, { FileEntry } from './components/FileTree';
import SyntaxHighlighter from './components/SyntaxHighlighter';
import Logo3D from './components/Logo3D';
import AnalysisPanel from './components/AnalysisPanel';
import PlanningPanel from './components/PlanningPanel';
import ReviewPanel from './components/ReviewPanel';
import DebugPanel from './components/DebugPanel';

type Artifact = { filename: string; content: string };

type Phase = 'logo' | 'input' | 'analyzing' | 'analysis' | 'planning' | 'building' | 'results';

// ── Debug Toggle Button (fixed position) ────────────────────────────
function DebugToggleButton({ showDebug, onToggle }: { showDebug: boolean; onToggle: () => void }) {
  if (showDebug) return null; // Hidden when panel is open
  return (
    <button
      onClick={onToggle}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-mono tracking-wider
        bg-[#1a1a1a]/90 border border-[#f0883e]/30 text-[#f0883e] backdrop-blur-sm
        hover:bg-[#f0883e]/10 hover:border-[#f0883e]/60 hover:shadow-[0_0_20px_rgba(240,136,62,0.15)]
        transition-all duration-200 group"
      title="Toggle Debug Developer Logs"
    >
      <Bug className="w-4 h-4 group-hover:animate-pulse" />
      <span className="hidden sm:inline">DEBUG LOGS</span>
    </button>
  );
}

export default function Home() {
  // ── Phase control ──────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('logo');

  // ── Core state ─────────────────────────────────────────────────
  const [repoUrl, setRepoUrl] = useState('');
  const [instructions, setInstructions] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [preview, setPreview] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const [isDeploying, setIsDeploying] = useState(false);
  const [deployStatus, setDeployStatus] = useState<{ status: string; message: string; url?: string } | null>(null);

  const [repoFiles, setRepoFiles] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const [rightTab, setRightTab] = useState<'code' | 'terminal' | 'preview'>('code');

  const [fileContentCache, setFileContentCache] = useState<Record<string, string>>({});
  const [isFetchingFile, setIsFetchingFile] = useState(false);
  const fetchedFilesRef = useRef<Set<string>>(new Set());

  // ── Analysis state ─────────────────────────────────────────────
  const [analysisData, setAnalysisData] = useState<any>(null);
  const [analysisLogs, setAnalysisLogs] = useState<string[]>([]);

  // ── Build result state ─────────────────────────────────────────
  const [buildStatus, setBuildStatus] = useState('');
  const [buildRetryCount, setBuildRetryCount] = useState(0);
  const [buildErrors, setBuildErrors] = useState<{ attempt: number; type: string; message: string }[]>([]);
  const [iterationCount, setIterationCount] = useState(0);

  // ── Debug panel state ──────────────────────────────────────────
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => { document.documentElement.classList.add('dark'); }, []);

  // ── SCAN + ANALYZE (no instructions asked) ─────────────────────
  const scanAndAnalyze = useCallback(async () => {
    if (!repoUrl) return;
    setPhase('analyzing');
    setIsScanning(true);
    setScanError(null);
    setRepoFiles([]);
    setHasScanned(false);
    setArtifacts([]);
    setSelectedFile(null);
    setFileContentCache({});
    fetchedFilesRef.current.clear();
    setAnalysisData(null);
    setAnalysisLogs([]);

    try {
      const response = await fetch(`http://localhost:8000/api/analyze?repo_url=${encodeURIComponent(repoUrl)}`);
      if (!response.ok) throw new Error(`Analysis failed: ${response.statusText}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No stream');

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.type === 'log') {
              setAnalysisLogs(prev => [...prev, chunk.content]);
            } else if (chunk.type === 'files') {
              setRepoFiles(chunk.data || []);
              setHasScanned(true);
            } else if (chunk.type === 'analysis') {
              setAnalysisData(chunk.data);
              setPhase('analysis');
            } else if (chunk.type === 'error') {
              setScanError(chunk.content || 'Analysis failed');
              setPhase('input');
            }
          } catch { /* skip bad lines */ }
        }
        buffer = lines[lines.length - 1];
      }
    } catch (e: any) {
      setScanError(e.message || 'Analysis failed');
      setPhase('input');
    } finally {
      setIsScanning(false);
    }
  }, [repoUrl]);

  // ── START BUILD (called from PlanningPanel) ────────────────────
  const startBuild = useCallback(async (
    selectedDrawbacks: string[],
    selectedRecs: string[],
    userInstructions: string,
  ) => {
    if (!repoUrl) return;

    // Build combined instructions from the planning phase
    const parts: string[] = [];
    if (selectedDrawbacks.length > 0) {
      parts.push(`FIX THESE ISSUES:\n${selectedDrawbacks.map(d => `- ${d}`).join('\n')}`);
    }
    if (selectedRecs.length > 0) {
      parts.push(`APPLY THESE UPGRADES:\n${selectedRecs.map(r => `- ${r}`).join('\n')}`);
    }
    if (userInstructions) {
      parts.push(`SPECIFIC INSTRUCTIONS:\n${userInstructions}`);
    }
    const combinedInstructions = parts.join('\n\n');
    setInstructions(combinedInstructions);

    // Start building
    setPhase('building');
    setIsLoading(true);
    setLogs([`[*] Iteration ${iterationCount + 1} — Connecting to Lazarus Engine...`]);
    setArtifacts([]);
    setSelectedFile(null);
    setPreview('');
    setDeployStatus(null);
    setBuildStatus('');
    setBuildRetryCount(0);
    setBuildErrors([]);
    setRightTab('terminal');

    try {
      const response = await fetch('http://localhost:8000/api/resurrect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl, vibe_instructions: combinedInstructions }),
      });
      if (!response.ok) throw new Error(`Failed: ${response.statusText}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('No stream');

      let buffer = '';
      setLogs([]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          try {
            const chunk = JSON.parse(line);
            if (chunk.type === 'log') {
              setLogs(prev => [...prev, chunk.content]);
            } else if (chunk.type === 'repo_files') {
              setRepoFiles(chunk.files || []);
              setHasScanned(true);
            } else if (chunk.type === 'result') {
              const res = chunk.data;
              setArtifacts(res.artifacts || []);
              setPreview(res.preview || '');
              setBuildStatus(res.status || 'Unknown');
              setBuildRetryCount(res.retry_count || 0);
              setBuildErrors(res.errors || []);
              if (res.artifacts?.length) {
                setSelectedFile(res.artifacts[0].filename);
                setRightTab('code');
              }
              if (res.preview) setRightTab('preview');
              setIsLoading(false);
              setIterationCount(prev => prev + 1);
              setPhase('results');
            }
          } catch { /* skip */ }
        }
        buffer = lines[lines.length - 1];
      }
      setIsLoading(false);
      if (phase === 'building') setPhase('results');
    } catch (error) {
      setLogs(prev => [...prev, `[ERROR] ${error}`]);
      setIsLoading(false);
    }
  }, [repoUrl, iterationCount, phase]);

  // ── REFINE (called from ReviewPanel) ───────────────────────────
  const handleRefine = useCallback((feedback: string) => {
    // Re-run build with the feedback appended
    startBuild([], [], `${instructions}\n\nUSER FEEDBACK FROM PREVIOUS BUILD:\n${feedback}`);
  }, [instructions, startBuild]);

  // ── DEPLOY ─────────────────────────────────────────────────────
  const deployCode = async () => {
    if (artifacts.length === 0 || !repoUrl) return;
    setIsDeploying(true);
    setDeployStatus(null);
    try {
      let lastUrl = '';
      for (const file of artifacts) {
        const response = await fetch('http://localhost:8000/api/commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repo_url: repoUrl, filename: file.filename, content: file.content }),
        });
        const data = await response.json();
        if (data.status !== 'success') throw new Error(`Failed: ${file.filename}`);
        lastUrl = data.commit_url;
      }
      setDeployStatus({ status: 'success', message: 'MIGRATION COMPLETE', url: lastUrl });
    } catch (error: any) {
      setDeployStatus({ status: 'error', message: error.message || 'Deploy failed' });
    } finally {
      setIsDeploying(false);
    }
  };

  // ── Combined file entries ──────────────────────────────────────
  const allFileEntries: FileEntry[] = useMemo(() => {
    const artifactPaths = new Set(artifacts.map(a => a.filename));
    const entries: FileEntry[] = [];
    for (const path of repoFiles) {
      if (!artifactPaths.has(path)) entries.push({ path, isNew: false });
    }
    for (const a of artifacts) {
      entries.push({ path: a.filename, isNew: true, content: a.content });
    }
    return entries;
  }, [repoFiles, artifacts]);

  // ── Fetch content for existing repo files ──────────────────────
  useEffect(() => {
    if (!selectedFile || !repoUrl) return;
    if (artifacts.find(a => a.filename === selectedFile)) return;
    if (fetchedFilesRef.current.has(selectedFile)) return;

    fetchedFilesRef.current.add(selectedFile);
    setIsFetchingFile(true);

    const controller = new AbortController();

    fetch(
      `http://localhost:8000/api/file-content?repo_url=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(selectedFile)}`,
      { signal: controller.signal }
    )
      .then(resp => {
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return resp.json();
      })
      .then(data => {
        setFileContentCache(prev => ({
          ...prev,
          [selectedFile]: data.content || `// Empty file: ${selectedFile}`,
        }));
      })
      .catch(e => {
        if (e.name !== 'AbortError') {
          console.error('Failed to fetch file content:', e);
          setFileContentCache(prev => ({
            ...prev,
            [selectedFile]: `// Error loading file: ${selectedFile}\n// ${e.message}`,
          }));
        }
      })
      .finally(() => {
        setIsFetchingFile(false);
      });

    return () => controller.abort();
  }, [selectedFile, repoUrl, artifacts]);

  const displayContent = selectedFile
    ? artifacts.find(a => a.filename === selectedFile)?.content || fileContentCache[selectedFile] || ''
    : '';

  // ══════════════════════════════════════════════════════════════
  // PHASE 1: LOGO ANIMATION
  // ══════════════════════════════════════════════════════════════
  if (phase === 'logo') {
    return (
      <>
        <Logo3D onComplete={() => setPhase('input')} />
        {/* Debug toggle - always available */}
        <DebugToggleButton showDebug={showDebug} onToggle={() => setShowDebug(v => !v)} />
        <DebugPanel isOpen={showDebug} onToggle={() => setShowDebug(false)} />
      </>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 2: INPUT — Just repo URL, no instructions
  // ══════════════════════════════════════════════════════════════
  if (phase === 'input') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(rgba(57,255,20,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(57,255,20,0.5) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
        }} />

        <div className="relative z-10 flex flex-col items-center max-w-2xl w-full px-8">
          <div className="mb-10 flex flex-col items-center">
            <div className="flex items-center gap-3 mb-2">
              <Cpu className="w-10 h-10 text-[#39ff14]" />
              <h1 className="text-4xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-[#39ff14] via-[#007acc] to-[#c678dd]">
                LAZARUS
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#39ff14]/50" />
              <span className="text-[10px] tracking-[0.4em] text-[#39ff14]/60 uppercase">Resurrection Engine</span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#39ff14]/50" />
            </div>
          </div>

          <div className="w-full space-y-4">
            <div className="relative">
              <input
                type="text"
                value={repoUrl}
                onChange={e => setRepoUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && scanAndAnalyze()}
                placeholder="Paste your GitHub repository URL..."
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-xl px-5 py-4 text-lg text-white placeholder-[#555] focus:outline-none focus:border-[#39ff14]/50 focus:shadow-[0_0_20px_rgba(57,255,20,0.1)] transition-all"
                autoFocus
              />
              {scanError && (
                <p className="absolute -bottom-6 left-0 text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {scanError}
                </p>
              )}
            </div>

            <button
              onClick={scanAndAnalyze}
              disabled={!repoUrl || isScanning}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl text-lg font-bold bg-gradient-to-r from-[#39ff14] to-[#22c55e] text-black hover:shadow-[0_0_40px_rgba(57,255,20,0.3)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {isScanning ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Analyzing...</>
              ) : (
                <><Search className="w-5 h-5" /> Analyze Repository</>
              )}
            </button>

            <p className="text-center text-[11px] text-[#555] mt-2">
              We&apos;ll deeply analyze your project first &mdash; no changes until you decide.
            </p>
          </div>

          <div className="flex gap-4 mt-10">
            {[
              { icon: BarChart3, label: 'Deep Analysis', color: '#007acc' },
              { icon: Zap, label: 'AI-Powered', color: '#39ff14' },
              { icon: ShieldAlert, label: 'You Decide', color: '#ff6b35' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-2 text-[11px] tracking-wider" style={{ color }}>
                <Icon className="w-4 h-4" />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Debug toggle */}
        <DebugToggleButton showDebug={showDebug} onToggle={() => setShowDebug(v => !v)} />
        <DebugPanel isOpen={showDebug} onToggle={() => setShowDebug(false)} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 3: ANALYZING — Loading with live logs
  // ══════════════════════════════════════════════════════════════
  if (phase === 'analyzing') {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(rgba(0,122,204,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(0,122,204,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        <div className="relative z-10 flex flex-col items-center max-w-xl w-full px-8">
          <div className="relative w-32 h-32 mb-8">
            <div className="absolute inset-0 border-2 border-[#007acc]/30 rounded-full" />
            <div className="absolute inset-3 border-2 border-[#007acc]/20 rounded-full" />
            <div className="absolute inset-6 border-2 border-[#007acc]/10 rounded-full" />
            <div className="absolute inset-0 rounded-full animate-spin" style={{ animationDuration: '3s' }}>
              <div className="w-1/2 h-full origin-right" style={{
                background: 'conic-gradient(from 0deg, transparent, rgba(0,122,204,0.4))',
                borderRadius: '50% 0 0 50%',
              }} />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-[#007acc]" />
            </div>
          </div>

          <h2 className="text-xl font-bold tracking-wider mb-2">DEEP ANALYSIS IN PROGRESS</h2>
          <p className="text-sm text-[#666] mb-6">Scanning repository and detecting tech stack...</p>

          <div className="w-full bg-[#1a1a1a] rounded-lg border border-[#333] p-4 max-h-60 overflow-auto">
            {analysisLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                {i === analysisLogs.length - 1 ? (
                  <Loader2 className="w-3 h-3 animate-spin text-[#007acc] flex-shrink-0" />
                ) : (
                  <CheckCircle className="w-3 h-3 text-[#39ff14] flex-shrink-0" />
                )}
                <span className="text-xs text-[#888] font-mono">{log}</span>
              </div>
            ))}
            {analysisLogs.length === 0 && (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="w-3 h-3 animate-spin text-[#007acc]" />
                <span className="text-xs text-[#888] font-mono">Connecting to analysis engine...</span>
              </div>
            )}
          </div>
        </div>

        {/* Debug toggle */}
        <DebugToggleButton showDebug={showDebug} onToggle={() => setShowDebug(v => !v)} />
        <DebugPanel isOpen={showDebug} onToggle={() => setShowDebug(false)} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 4: ANALYSIS — Show deep analysis (user reviews before acting)
  // ══════════════════════════════════════════════════════════════
  if (phase === 'analysis' && analysisData) {
    return (
      <div className="h-screen flex flex-col bg-[#0a0a0a]">
        <div className="flex items-center gap-3 px-5 py-3 bg-[#1a1a1a] border-b border-[#333] flex-shrink-0">
          <Cpu className="w-5 h-5 text-[#39ff14]" />
          <span className="text-[#39ff14] font-bold text-sm tracking-wider">LAZARUS</span>
          <div className="h-4 w-px bg-[#333] mx-2" />
          <span className="text-xs text-[#888] truncate flex-1">{repoUrl}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[#39ff14] tracking-wider">{repoFiles.length} FILES</span>
            <span className="text-[10px] text-[#007acc]">ANALYZED</span>
          </div>
        </div>
        <AnalysisPanel
          analysis={analysisData}
          onProceed={() => setPhase('planning')}
        />
        {/* Debug toggle */}
        <DebugToggleButton showDebug={showDebug} onToggle={() => setShowDebug(v => !v)} />
        <DebugPanel isOpen={showDebug} onToggle={() => setShowDebug(false)} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 5: PLANNING — User picks what to fix + writes instructions
  // ══════════════════════════════════════════════════════════════
  if (phase === 'planning' && analysisData) {
    const drawbacks = analysisData.recommendations?.drawbacks || [];
    const recs = analysisData.recommendations?.recommendations || [];

    return (
      <div className="h-screen flex flex-col bg-[#0a0a0a]">
        <div className="flex items-center gap-3 px-5 py-3 bg-[#1a1a1a] border-b border-[#333] flex-shrink-0">
          <Cpu className="w-5 h-5 text-[#39ff14]" />
          <span className="text-[#39ff14] font-bold text-sm tracking-wider">LAZARUS</span>
          <div className="h-4 w-px bg-[#333] mx-2" />
          <span className="text-xs text-[#888] truncate flex-1">{repoUrl}</span>
          <span className="text-[10px] text-[#e8ab53] tracking-wider">PLANNING</span>
        </div>
        <PlanningPanel
          drawbacks={drawbacks}
          recommendations={recs}
          onStartBuild={startBuild}
          onBack={() => setPhase('analysis')}
        />
        {/* Debug toggle */}
        <DebugToggleButton showDebug={showDebug} onToggle={() => setShowDebug(v => !v)} />
        <DebugPanel isOpen={showDebug} onToggle={() => setShowDebug(false)} />
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // PHASE 6 & 7: BUILDING / RESULTS — VS Code Layout
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-[#cccccc] font-mono overflow-hidden">

      {/* ═══ TOP BAR ═══════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#323233] border-b border-[#3c3c3c] flex-shrink-0">
        <div className="flex items-center gap-2 mr-4 cursor-pointer" onClick={() => setPhase('input')}>
          <Cpu className="w-5 h-5 text-[#39ff14]" />
          <span className="text-[#39ff14] font-bold text-sm tracking-wider">LAZARUS</span>
        </div>

        <div className="flex-1 flex items-center gap-2 max-w-xl">
          <input
            type="text"
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            placeholder="GitHub repo URL..."
            className="flex-1 bg-[#3c3c3c] border border-[#555] rounded px-3 py-1.5 text-sm text-white placeholder-[#888] focus:outline-none focus:border-[#007acc] transition-colors"
          />
          {analysisData && (
            <button
              onClick={() => setPhase('analysis')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-medium border border-[#007acc] text-[#007acc] hover:bg-[#007acc]/10 transition-colors"
            >
              <BarChart3 className="w-3 h-3" />
              Analysis
            </button>
          )}
          {analysisData && (
            <button
              onClick={() => setPhase('planning')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-medium border border-[#e8ab53] text-[#e8ab53] hover:bg-[#e8ab53]/10 transition-colors"
            >
              <Zap className="w-3 h-3" />
              Plan
            </button>
          )}
        </div>

        {iterationCount > 0 && (
          <span className="text-[9px] text-[#c678dd] tracking-wider border border-[#c678dd]/30 px-2 py-1 rounded">
            Iteration {iterationCount}
          </span>
        )}

        <button
          onClick={deployCode}
          disabled={isDeploying || artifacts.length === 0}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border transition-all
            ${deployStatus?.status === 'success'
              ? 'border-green-500 text-green-400 bg-green-500/10'
              : 'border-[#555] text-[#ccc] hover:bg-[#3c3c3c] disabled:opacity-30 disabled:cursor-not-allowed'}
          `}
        >
          {deployStatus?.status === 'success' ? <CheckCircle className="w-3.5 h-3.5" /> : <GitPullRequest className="w-3.5 h-3.5" />}
          {deployStatus?.status === 'success' ? 'Done' : 'Deploy'}
        </button>

        {deployStatus?.url && (
          <a href={deployStatus.url} target="_blank" className="text-[10px] text-[#007acc] underline">PR</a>
        )}

        <div className="flex items-center gap-2 ml-auto text-[10px]">
          {hasScanned && <span className="text-[#73c991]">{repoFiles.length} files</span>}
          {isLoading && <Loader2 className="w-3 h-3 animate-spin text-[#39ff14]" />}
          <span className="text-[#39ff14]">ONLINE</span>
        </div>
      </div>

      {/* ═══ MAIN AREA ═══════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: FILE TREE ──────────────────────────────────── */}
        <div className="w-64 flex-shrink-0 border-r border-[#3c3c3c] flex flex-col bg-[#252526]">
          <FileTree
            files={allFileEntries}
            selectedFile={selectedFile}
            onSelectFile={(path) => { setSelectedFile(path); setRightTab('code'); }}
          />
        </div>

        {/* ── RIGHT: CODE / TERMINAL / PREVIEW ─────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Tab bar */}
          <div className="flex items-center bg-[#252526] border-b border-[#3c3c3c] flex-shrink-0">
            {([
              { key: 'code' as const, label: selectedFile ? selectedFile.split('/').pop()! : 'Code', icon: null },
              { key: 'terminal' as const, label: 'Terminal', icon: TerminalIcon },
              { key: 'preview' as const, label: 'Preview', icon: Eye },
            ] as const).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setRightTab(key)}
                className={`flex items-center gap-1.5 px-4 py-2 text-[12px] border-r border-[#3c3c3c] transition-colors
                  ${rightTab === key
                    ? 'bg-[#1e1e1e] text-white border-b-2 border-b-[#007acc]'
                    : 'bg-[#2d2d2d] text-[#888] hover:text-[#ccc]'}
                `}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span className="truncate max-w-[150px]">{label}</span>
                {key === 'code' && selectedFile && artifacts.find(a => a.filename === selectedFile) && (
                  <span className="w-2 h-2 rounded-full bg-[#e8ab53] ml-1" title="Modified" />
                )}
                {key === 'code' && selectedFile && isFetchingFile && (
                  <Loader2 className="w-3 h-3 animate-spin text-[#007acc] ml-1" />
                )}
                {key === 'terminal' && isLoading && (
                  <Loader2 className="w-3 h-3 animate-spin text-[#39ff14] ml-1" />
                )}
              </button>
            ))}

            {rightTab === 'code' && selectedFile && (
              <span className="ml-3 text-[11px] text-[#888] truncate">{selectedFile}</span>
            )}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto bg-[#1e1e1e]">

            {/* CODE VIEW */}
            {rightTab === 'code' && (
              isFetchingFile ? (
                <div className="flex flex-col items-center justify-center h-full text-[#6b6b6b]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#007acc] mb-3" />
                  <p className="text-sm">Loading {selectedFile?.split('/').pop()}...</p>
                </div>
              ) : displayContent ? (
                <SyntaxHighlighter code={displayContent} filename={selectedFile || 'file.txt'} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-[#6b6b6b]">
                  {hasScanned ? (
                    <>
                      <FolderTree className="w-12 h-12 mb-3 opacity-30" />
                      <p className="text-sm">Select a file from the explorer</p>
                    </>
                  ) : (
                    <>
                      <Cpu className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-sm text-[#39ff14]/50">Waiting for build...</p>
                    </>
                  )}
                </div>
              )
            )}

            {/* TERMINAL VIEW */}
            {rightTab === 'terminal' && (
              <div className="p-4 font-mono text-sm space-y-2">
                {logs.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-[#6b6b6b]">
                    <span>{isLoading ? 'Processing...' : 'No output yet.'}</span>
                  </div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 mt-0.5">
                        {i === logs.length - 1 && isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#39ff14]" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-[#39ff14]" />
                        )}
                      </span>
                      <span className="text-[#d4d4d4]">{log}</span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* PREVIEW VIEW */}
            {rightTab === 'preview' && (
              preview ? (
                <iframe srcDoc={preview} className="w-full h-full border-none bg-white" title="Preview" />
              ) : (
                <div className="flex items-center justify-center h-full text-[#6b6b6b]">
                  No preview available
                </div>
              )
            )}
          </div>

          {/* ── Review Panel (only shown when results phase) ────── */}
          {phase === 'results' && !isLoading && (
            <ReviewPanel
              artifactCount={artifacts.length}
              status={buildStatus}
              retryCount={buildRetryCount}
              errors={buildErrors}
              onRefine={handleRefine}
              onDeploy={deployCode}
              isDeploying={isDeploying}
              deployStatus={deployStatus}
            />
          )}

          {/* Bottom status bar */}
          <div className="flex items-center justify-between px-4 py-1 bg-[#007acc] text-white text-[11px] flex-shrink-0">
            <div className="flex items-center gap-3">
              <span>LAZARUS ENGINE</span>
              {hasScanned && <span>{repoFiles.length} files</span>}
              {artifacts.length > 0 && <span>{artifacts.length} modified</span>}
              {iterationCount > 0 && <span>Iteration {iterationCount}</span>}
            </div>
            <div className="flex items-center gap-3">
              {isLoading && <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Building...</span>}
              <span>
                {phase === 'building' ? 'BUILDING...' : phase === 'results' ? 'REVIEW & REFINE' : ''}
              </span>
              <span>v11.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Debug toggle */}
      <DebugToggleButton showDebug={showDebug} onToggle={() => setShowDebug(v => !v)} />
      <DebugPanel isOpen={showDebug} onToggle={() => setShowDebug(false)} />
    </div>
  );
}
