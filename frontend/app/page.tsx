'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Play, GitPullRequest, CheckCircle, Cpu, ShieldAlert,
  Sun, Moon, FolderTree, Terminal as TerminalIcon, Eye,
  Loader2, AlertCircle, Search,
} from 'lucide-react';
import FileTree, { FileEntry } from './components/FileTree';
import SyntaxHighlighter from './components/SyntaxHighlighter';

type Artifact = { filename: string; content: string };

export default function Home() {
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

  // Right panel tabs
  const [rightTab, setRightTab] = useState<'code' | 'terminal' | 'preview'>('code');

  // Cache for fetched file contents (existing repo files)
  const [fileContentCache, setFileContentCache] = useState<Record<string, string>>({});
  const [isFetchingFile, setIsFetchingFile] = useState(false);

  const [isDarkMode] = useState(true);

  useEffect(() => { document.documentElement.classList.add('dark'); }, []);

  // ── SCAN REPO ──────────────────────────────────────────────────
  const scanRepo = useCallback(async () => {
    if (!repoUrl) return;
    setIsScanning(true);
    setScanError(null);
    setRepoFiles([]);
    setHasScanned(false);
    setArtifacts([]);
    setSelectedFile(null);
    setFileContentCache({});

    try {
      const resp = await fetch(`http://localhost:8000/api/scan?repo_url=${encodeURIComponent(repoUrl)}`);
      if (!resp.ok) throw new Error(`Scan failed: ${resp.statusText}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.error);
      setRepoFiles(data.files || []);
      setHasScanned(true);
    } catch (e: any) {
      setScanError(e.message || 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  }, [repoUrl]);

  // ── INITIALIZE PROTOCOL ────────────────────────────────────────
  const initializeProtocol = async () => {
    if (!repoUrl) return;
    setIsLoading(true);
    setLogs(['[*] Connecting to Lazarus Engine...']);
    setArtifacts([]);
    setSelectedFile(null);
    setPreview('');
    setDeployStatus(null);
    setRightTab('terminal');

    try {
      const response = await fetch('http://localhost:8000/api/resurrect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo_url: repoUrl, vibe_instructions: instructions }),
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
              if (res.artifacts?.length) {
                setSelectedFile(res.artifacts[0].filename);
                setRightTab('code');
              }
              if (res.preview) setRightTab('preview');
              setIsLoading(false);
            }
          } catch { /* skip */ }
        }
        buffer = lines[lines.length - 1];
      }
    } catch (error) {
      setLogs(prev => [...prev, `[ERROR] ${error}`]);
      setIsLoading(false);
    }
  };

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

  const selectedContent = artifacts.find(a => a.filename === selectedFile)?.content || '';

  // Fetch content for existing repo files when selected
  useEffect(() => {
    if (!selectedFile || !repoUrl) return;
    // If it's an artifact (modified file), content already available
    if (artifacts.find(a => a.filename === selectedFile)) return;
    // If already cached, no need to fetch
    if (fileContentCache[selectedFile]) return;

    const fetchContent = async () => {
      setIsFetchingFile(true);
      try {
        const resp = await fetch(
          `http://localhost:8000/api/file-content?repo_url=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(selectedFile)}`
        );
        if (!resp.ok) throw new Error('Failed to fetch');
        const data = await resp.json();
        if (data.content) {
          setFileContentCache(prev => ({ ...prev, [selectedFile]: data.content }));
        }
      } catch (e) {
        console.error('Failed to fetch file content:', e);
        setFileContentCache(prev => ({ ...prev, [selectedFile]: `// Error loading file: ${selectedFile}` }));
      } finally {
        setIsFetchingFile(false);
      }
    };
    fetchContent();
  }, [selectedFile, repoUrl, artifacts, fileContentCache]);

  // Resolved content: artifact content > cached content
  const displayContent = selectedFile
    ? artifacts.find(a => a.filename === selectedFile)?.content || fileContentCache[selectedFile] || ''
    : '';

  // ── RENDER ─────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e] text-[#cccccc] font-mono overflow-hidden">

      {/* ═══ TOP BAR ═══════════════════════════════════════════════ */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#323233] border-b border-[#3c3c3c] flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-4">
          <Cpu className="w-5 h-5 text-[#39ff14]" />
          <span className="text-[#39ff14] font-bold text-sm tracking-wider">LAZARUS</span>
        </div>

        {/* Repo URL */}
        <div className="flex-1 flex items-center gap-2 max-w-2xl">
          <input
            type="text"
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && scanRepo()}
            placeholder="Enter GitHub repo URL..."
            className="flex-1 bg-[#3c3c3c] border border-[#555] rounded px-3 py-1.5 text-sm text-white placeholder-[#888] focus:outline-none focus:border-[#007acc] transition-colors"
          />
          <button
            onClick={scanRepo}
            disabled={isScanning || !repoUrl}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium bg-[#0e639c] text-white hover:bg-[#1177bb] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            {isScanning ? 'Scanning...' : 'Scan'}
          </button>
        </div>

        {/* Instructions */}
        <input
          type="text"
          value={instructions}
          onChange={e => setInstructions(e.target.value)}
          placeholder="Migration instructions..."
          className="w-64 bg-[#3c3c3c] border border-[#555] rounded px-3 py-1.5 text-sm text-white placeholder-[#888] focus:outline-none focus:border-[#007acc] transition-colors"
        />

        {/* Action buttons */}
        <button
          onClick={initializeProtocol}
          disabled={isLoading || !repoUrl}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-bold bg-[#39ff14] text-black hover:bg-[#2ecc0f] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          {isLoading ? 'Running...' : 'Run'}
        </button>

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
          <a href={deployStatus.url} target="_blank" className="text-[10px] text-[#007acc] underline">PR Link</a>
        )}

        {/* Status */}
        <div className="flex items-center gap-2 ml-auto text-[10px]">
          {scanError && <span className="flex items-center gap-1 text-red-400"><AlertCircle className="w-3 h-3" />{scanError}</span>}
          {hasScanned && <span className="text-[#73c991]">{repoFiles.length} files</span>}
          <span className="text-[#39ff14]">ONLINE</span>
        </div>
      </div>

      {/* ═══ MAIN AREA: FILE TREE + RIGHT PANEL ════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: FILE TREE (VS Code sidebar) ──────────────────── */}
        <div className="w-64 flex-shrink-0 border-r border-[#3c3c3c] flex flex-col bg-[#252526]">
          <FileTree
            files={allFileEntries}
            selectedFile={selectedFile}
            onSelectFile={(path) => { setSelectedFile(path); setRightTab('code'); }}
          />
        </div>

        {/* ── RIGHT: CODE / TERMINAL / PREVIEW ───────────────────── */}
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

            {/* File breadcrumb */}
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
                      <p className="text-[11px] mt-1 opacity-50">Modified files will show content after processing</p>
                    </>
                  ) : (
                    <>
                      <Cpu className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-sm text-[#39ff14]/50">Enter a repo URL and click Scan</p>
                      <p className="text-[11px] mt-1 opacity-40">Files will appear in the left panel</p>
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
                    <span>No output yet. Click Run to start.</span>
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

          {/* Bottom status bar */}
          <div className="flex items-center justify-between px-4 py-1 bg-[#007acc] text-white text-[11px] flex-shrink-0">
            <div className="flex items-center gap-3">
              <span>LAZARUS ENGINE</span>
              {hasScanned && <span>{repoFiles.length} files</span>}
              {artifacts.length > 0 && <span>{artifacts.length} modified</span>}
            </div>
            <div className="flex items-center gap-3">
              {isLoading && <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Processing...</span>}
              <span>v9.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
