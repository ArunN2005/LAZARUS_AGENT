import json
import time
import logging
import threading
from collections import deque
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from lazarus_agent import process_resurrection, commit_code, LazarusEngine
import sys
import traceback

# ══════════════════════════════════════════════════════════════
# DETAILED LOGGING SYSTEM
# ══════════════════════════════════════════════════════════════

# Ring buffer for debug logs (last 2000 entries)
debug_log_buffer = deque(maxlen=2000)
debug_log_lock = threading.Lock()

class ColorFormatter(logging.Formatter):
    """Colored terminal output for detailed backend logs."""
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[41m', # Red BG
    }
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

    def format(self, record):
        color = self.COLORS.get(record.levelname, '')
        timestamp = self.formatTime(record, '%H:%M:%S.') + f'{record.msecs:03.0f}'
        module = f'{record.module}:{record.lineno}'
        msg = record.getMessage()
        return f"{self.DIM}[{timestamp}]{self.RESET} {color}{self.BOLD}{record.levelname:<8}{self.RESET} {self.DIM}{module:<25}{self.RESET} {msg}"

def add_debug_log(level: str, category: str, message: str, details: dict = None):
    """Add a structured debug log entry to the ring buffer."""
    entry = {
        "timestamp": time.time(),
        "time_str": time.strftime('%H:%M:%S', time.localtime()) + f'.{int(time.time() * 1000) % 1000:03d}',
        "level": level,
        "category": category,
        "message": message,
        "details": details or {}
    }
    with debug_log_lock:
        debug_log_buffer.append(entry)
    return entry

# Setup root logger
logger = logging.getLogger('lazarus')
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(ColorFormatter())
logger.addHandler(handler)

# Suppress noisy libraries
logging.getLogger('urllib3').setLevel(logging.WARNING)
logging.getLogger('requests').setLevel(logging.WARNING)


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in separate threads for concurrent access."""
    daemon_threads = True

# Load .env file
from dotenv import load_dotenv
load_dotenv()

PORT = 8000

class LazarusHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        """Override default logging to use our detailed logger."""
        logger.info(f"HTTP {args[0]}" if args else format)

    def _log_request_start(self, method: str):
        """Log incoming request with full details."""
        client_ip = self.client_address[0]
        content_length = self.headers.get('Content-Length', '0')
        content_type = self.headers.get('Content-Type', 'none')
        logger.info(f"{'━'*60}")
        logger.info(f"⟶  {method} {self.path}")
        logger.debug(f"   Client: {client_ip} | Content-Length: {content_length} | Content-Type: {content_type}")
        add_debug_log('INFO', 'HTTP_REQUEST', f'{method} {self.path}', {
            'client_ip': client_ip,
            'content_length': content_length,
            'content_type': content_type,
            'method': method,
            'path': self.path,
        })

    def _log_response(self, status_code: int, body_size: int = 0, extra: str = ''):
        """Log outgoing response."""
        logger.info(f"⟵  Response: {status_code} | Size: {body_size} bytes {extra}")
        add_debug_log('INFO', 'HTTP_RESPONSE', f'Status {status_code}', {
            'status_code': status_code,
            'body_size': body_size,
            'extra': extra,
        })

    def _log_error(self, error: Exception, context: str = ''):
        """Log errors with full traceback."""
        tb = traceback.format_exc()
        logger.error(f"❌ ERROR in {context}: {error}")
        logger.debug(f"   Traceback:\n{tb}")
        add_debug_log('ERROR', 'EXCEPTION', str(error), {
            'context': context,
            'traceback': tb,
            'error_type': type(error).__name__,
        })

    def do_OPTIONS(self):
        self._log_request_start('OPTIONS')
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self._log_response(200)

    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        self._log_request_start('GET')
        request_start = time.time()

        # ── Debug Logs API ──────────────────────────────────────────
        if parsed.path == '/api/debug-logs':
            try:
                since = float(params.get('since', ['0'])[0])
                with debug_log_lock:
                    logs = [e for e in debug_log_buffer if e['timestamp'] > since]
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = json.dumps({"logs": logs, "server_time": time.time()})
                self.wfile.write(response_data.encode())
            except Exception as e:
                self._log_error(e, '/api/debug-logs')
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return

        if parsed.path == '/api/scan':
            try:
                repo_url = params.get('repo_url', [None])[0]
                logger.info(f"📂 Scan requested for: {repo_url}")
                add_debug_log('INFO', 'SCAN', f'Repository scan started', {'repo_url': repo_url})

                if not repo_url:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Missing repo_url"}).encode())
                    self._log_response(400, extra='Missing repo_url')
                    return

                agent = LazarusEngine()
                files = agent.scan_repository(repo_url)
                elapsed = time.time() - request_start

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                response_data = json.dumps({"files": files})
                self.wfile.write(response_data.encode())
                logger.info(f"✅ Scan complete: {len(files)} files found in {elapsed:.2f}s")
                add_debug_log('INFO', 'SCAN', f'Scan complete: {len(files)} files', {'file_count': len(files), 'elapsed_ms': round(elapsed * 1000)})
                self._log_response(200, len(response_data), f'| {len(files)} files | {elapsed:.2f}s')

            except Exception as e:
                self._log_error(e, '/api/scan')
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
                self._log_response(500, extra=str(e))

        elif parsed.path == '/api/analyze':
            try:
                repo_url = params.get('repo_url', [None])[0]
                logger.info(f"🔬 Deep analysis requested for: {repo_url}")
                add_debug_log('INFO', 'ANALYZE', 'Deep analysis started', {'repo_url': repo_url})

                if not repo_url:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Missing repo_url"}).encode())
                    self._log_response(400, extra='Missing repo_url')
                    return

                # Use NDJSON streaming for real-time updates
                self.send_response(200)
                self.send_header('Content-Type', 'application/x-ndjson')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('Connection', 'keep-alive')
                self.end_headers()

                chunk_count = 0
                def send_chunk(chunk):
                    nonlocal chunk_count
                    chunk_count += 1
                    line = json.dumps(chunk) + "\n"
                    self.wfile.write(line.encode('utf-8'))
                    self.wfile.flush()
                    # Log every chunk sent
                    logger.debug(f"   📤 Stream chunk #{chunk_count}: type={chunk.get('type', '?')} | size={len(line)} bytes")
                    add_debug_log('DEBUG', 'STREAM_CHUNK', f'Chunk #{chunk_count} sent', {
                        'chunk_type': chunk.get('type', 'unknown'),
                        'chunk_size': len(line),
                        'content_preview': str(chunk.get('content', chunk.get('data', '')))[:200]
                    })

                send_chunk({"type": "log", "content": "Initializing deep scan engine..."})

                agent = LazarusEngine()

                # Step 1: Get file list
                send_chunk({"type": "log", "content": "Fetching repository structure..."})
                files = agent.scan_repository(repo_url)
                send_chunk({"type": "files", "data": files})
                send_chunk({"type": "log", "content": f"Found {len(files)} files in repository"})

                # Step 2: Deep scan to detect tech stack
                send_chunk({"type": "log", "content": "Running deep analysis on codebase..."})
                deep = agent.scan_repository_deep(repo_url)
                tech_stack = deep.get("tech_stack", {})
                must_preserve = deep.get("must_preserve", [])
                can_modernize = deep.get("can_modernize", [])
                api_endpoints = deep.get("api_endpoints", [])
                env_vars = deep.get("env_vars", [])
                db_schemas = deep.get("database_schemas", [])
                total_files_scanned = len(deep.get("files", []))

                send_chunk({"type": "log", "content": f"Deep scanned {total_files_scanned} code files"})

                # Build current stack info
                current_stack = {
                    "backend_framework": tech_stack.get("backend", {}).get("framework") or "Unknown",
                    "database": tech_stack.get("backend", {}).get("database") or "Not detected",
                    "auth": tech_stack.get("backend", {}).get("auth") or "Not detected",
                    "frontend_framework": tech_stack.get("frontend", {}).get("framework") or "Not detected",
                    "frontend_styling": tech_stack.get("frontend", {}).get("styling") or "Not detected",
                    "total_files": len(files),
                    "code_files_scanned": total_files_scanned,
                    "api_endpoints": api_endpoints[:20],
                    "env_vars": list(set(env_vars))[:15],
                    "database_schemas": db_schemas[:10],
                    "must_preserve": must_preserve[:15],
                    "can_modernize": can_modernize[:15],
                }

                send_chunk({"type": "log", "content": "Detected tech stack, generating recommendations..."})

                # Step 3: Use Gemini to get upgrade recommendations
                analysis_prompt = f"""Analyze this legacy repository tech stack and provide a comprehensive project understanding and modernization plan.

CURRENT TECH STACK DETECTED:
- Backend Framework: {current_stack['backend_framework']}
- Database: {current_stack['database']}
- Authentication: {current_stack['auth']}
- Frontend Framework: {current_stack['frontend_framework']}
- Frontend Styling: {current_stack['frontend_styling']}
- Total Files: {current_stack['total_files']}
- API Endpoints Found: {len(api_endpoints)}
- Database Schemas: {len(db_schemas)}

API ENDPOINTS: {json.dumps(api_endpoints[:10])}
MUST PRESERVE: {json.dumps(must_preserve[:10])}
CAN MODERNIZE: {json.dumps(can_modernize[:10])}

Respond in this EXACT JSON format (no markdown, no code blocks, just raw JSON):
{{
  "summary": "A 3-4 sentence narrative explaining what this project does, how it's structured, and what its purpose is. Write it like you're explaining the project to someone who has never seen it.",
  "health_score": 65,
  "project_understanding": {{
    "purpose": "What the project is built for (1-2 sentences)",
    "architecture": "How the codebase is organized (1-2 sentences)",
    "data_flow": "How data moves through the system (1-2 sentences)"
  }},
  "drawbacks": [
    {{
      "id": "d1",
      "title": "Short title of the issue",
      "description": "Detailed explanation of why this is a problem",
      "severity": "critical",
      "category": "security"
    }}
  ],
  "workflow_table": [
    {{
      "phase": "Phase 1 - Analysis",
      "task": "Task name",
      "description": "What this task involves",
      "duration": "2 hours",
      "dependencies": "None",
      "status": "complete"
    }}
  ],
  "recommendations": [
    {{
      "category": "Backend",
      "current": "Current tech",
      "recommended": "New tech",
      "reason": "Why upgrade",
      "priority": "high",
      "effort": "medium"
    }}
  ],
  "workflow_steps": [
    {{
      "step": 1,
      "title": "Step title",
      "description": "What happens in this step",
      "status": "pending"
    }}
  ],
  "risks": ["Risk 1", "Risk 2"],
  "estimated_impact": "Impact description"
}}"""

                try:
                    logger.info("🤖 Calling Gemini API for analysis recommendations...")
                    add_debug_log('INFO', 'GEMINI_API', 'Calling Gemini for analysis', {'prompt_length': len(analysis_prompt)})
                    gemini_start = time.time()

                    gemini_resp = agent._call_gemini(analysis_prompt)
                    gemini_elapsed = time.time() - gemini_start
                    logger.info(f"🤖 Gemini responded in {gemini_elapsed:.2f}s | Response length: {len(gemini_resp)} chars")
                    add_debug_log('INFO', 'GEMINI_API', f'Gemini response received', {
                        'elapsed_ms': round(gemini_elapsed * 1000),
                        'response_length': len(gemini_resp),
                        'response_preview': gemini_resp[:300]
                    })

                    # Clean response - remove markdown code blocks if present
                    cleaned = gemini_resp.strip()
                    if cleaned.startswith('```'):
                        cleaned = cleaned.split('\n', 1)[1] if '\n' in cleaned else cleaned[3:]
                    if cleaned.endswith('```'):
                        cleaned = cleaned[:-3]
                    cleaned = cleaned.strip()

                    recommendations = json.loads(cleaned)
                    logger.info(f"✅ Analysis JSON parsed successfully. Keys: {list(recommendations.keys())}")
                    add_debug_log('INFO', 'ANALYZE', 'Analysis JSON parsed', {'keys': list(recommendations.keys())})
                except Exception as e:
                    logger.error(f"❌ Gemini analysis error: {e}")
                    add_debug_log('ERROR', 'GEMINI_API', f'Gemini analysis failed: {e}', {'traceback': traceback.format_exc()})
                    recommendations = {
                        "summary": f"Repository uses {current_stack['backend_framework']} backend with {current_stack['database']} database and {current_stack['frontend_framework']} frontend. The codebase contains {current_stack['total_files']} files with {len(api_endpoints)} API endpoints.",
                        "health_score": 50,
                        "project_understanding": {
                            "purpose": f"A web application using {current_stack['backend_framework']} for backend logic.",
                            "architecture": f"Backend: {current_stack['backend_framework']}, Frontend: {current_stack['frontend_framework'] or 'Not detected'}, Database: {current_stack['database']}.",
                            "data_flow": "Standard request-response pattern through API endpoints."
                        },
                        "drawbacks": [
                            {"id": "d1", "title": "Legacy Framework", "description": f"Using {current_stack['backend_framework']} which may lack modern async capabilities and community support.", "severity": "high", "category": "architecture"},
                            {"id": "d2", "title": "No Modern Frontend", "description": f"Frontend uses {current_stack['frontend_framework'] or 'basic HTML/JS'} without component-based architecture.", "severity": "medium", "category": "frontend"},
                            {"id": "d3", "title": "Security Review Needed", "description": f"Auth mechanism: {current_stack['auth']}. Needs evaluation for modern security standards.", "severity": "high", "category": "security"},
                        ],
                        "workflow_table": [
                            {"phase": "Phase 1 - Discovery", "task": "Deep Scan & Analysis", "description": "Scan all files, detect tech stack, identify dependencies", "duration": "Complete", "dependencies": "None", "status": "complete"},
                            {"phase": "Phase 2 - Planning", "task": "Migration Strategy", "description": "Define what to preserve, what to modernize, and migration order", "duration": "~5 min", "dependencies": "Phase 1", "status": "pending"},
                            {"phase": "Phase 3 - Backend", "task": "Backend Modernization", "description": "Upgrade backend framework while preserving API contracts", "duration": "~15 min", "dependencies": "Phase 2", "status": "pending"},
                            {"phase": "Phase 4 - Frontend", "task": "Frontend Rebuild", "description": "Modernize UI with component-based framework", "duration": "~15 min", "dependencies": "Phase 3", "status": "pending"},
                            {"phase": "Phase 5 - Testing", "task": "Sandbox Validation", "description": "Test all endpoints and UI in isolated sandbox", "duration": "~5 min", "dependencies": "Phase 4", "status": "pending"},
                            {"phase": "Phase 6 - Deploy", "task": "Create PR & Deploy", "description": "Commit changes and create pull request", "duration": "~2 min", "dependencies": "Phase 5", "status": "pending"},
                        ],
                        "recommendations": [
                            {"category": "Backend", "current": current_stack['backend_framework'], "recommended": "FastAPI / Next.js API Routes", "reason": "Modern async support, better performance", "priority": "high", "effort": "medium"},
                            {"category": "Frontend", "current": current_stack['frontend_framework'] or "Legacy HTML/JS", "recommended": "React / Next.js", "reason": "Component-based, SSR support", "priority": "high", "effort": "high"},
                            {"category": "Database", "current": current_stack['database'], "recommended": "Keep current + add Prisma ORM", "reason": "Type-safe queries, auto migrations", "priority": "medium", "effort": "medium"},
                        ],
                        "workflow_steps": [
                            {"step": 1, "title": "Deep Scan", "description": "Analyze all files and dependencies", "status": "complete"},
                            {"step": 2, "title": "Plan Migration", "description": "Create preservation-first migration plan", "status": "pending"},
                            {"step": 3, "title": "Modernize Code", "description": "Upgrade tech stack while preserving functionality", "status": "pending"},
                            {"step": 4, "title": "Test & Validate", "description": "Run in sandbox to verify everything works", "status": "pending"},
                            {"step": 5, "title": "Deploy", "description": "Commit changes and create PR", "status": "pending"},
                        ],
                        "risks": ["Data loss if schemas are modified incorrectly", "API breaking changes"],
                        "estimated_impact": "Significant performance and maintainability improvements"
                    }

                elapsed = time.time() - request_start
                send_chunk({"type": "log", "content": f"Analysis complete! ({elapsed:.1f}s)"})
                logger.info(f"✅ Full analysis complete in {elapsed:.2f}s | Chunks sent: {chunk_count}")
                add_debug_log('INFO', 'ANALYZE', f'Analysis complete', {'elapsed_ms': round(elapsed * 1000), 'chunks_sent': chunk_count})

                # Send full analysis result
                send_chunk({
                    "type": "analysis",
                    "data": {
                        "current_stack": current_stack,
                        "recommendations": recommendations,
                    }
                })

            except Exception as e:
                self._log_error(e, '/api/analyze')
                try:
                    # Try sending error as a chunk (headers may already be sent)
                    error_line = json.dumps({"type": "error", "content": str(e)}) + "\n"
                    self.wfile.write(error_line.encode('utf-8'))
                    self.wfile.flush()
                except Exception:
                    # Headers not yet sent, send normal error response
                    try:
                        self.send_response(500)
                        self.send_header('Content-type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(json.dumps({"error": str(e)}).encode())
                    except Exception:
                        pass

        elif parsed.path == '/api/file-content':
            try:
                import re, requests, base64, os
                repo_url = params.get('repo_url', [None])[0]
                file_path = params.get('path', [None])[0]

                if not repo_url or not file_path:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Missing repo_url or path"}).encode())
                    return

                match = re.search(r"github\.com/([^/]+)/([^/.]+)", repo_url)
                if not match:
                    raise ValueError("Invalid GitHub URL")

                owner, repo_name = match.groups()
                headers = {"Accept": "application/vnd.github.v3+json"}
                github_token = os.environ.get("GITHUB_TOKEN", "")
                if github_token:
                    headers["Authorization"] = f"token {github_token}"

                api_url = f"https://api.github.com/repos/{owner}/{repo_name}/contents/{file_path}"
                resp = requests.get(api_url, headers=headers)

                if resp.status_code != 200:
                    raise ValueError(f"GitHub API error: {resp.status_code}")

                data = resp.json()
                content = base64.b64decode(data.get("content", "")).decode("utf-8", errors="replace")

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"content": content, "path": file_path}).encode())

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())

        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        self._log_request_start('POST')
        request_start = time.time()

        if self.path == '/api/resurrect':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                request_json = json.loads(post_data)
                
                repo_url = request_json.get('repo_url')
                vibe_instructions = request_json.get('vibe_instructions')

                logger.info(f"🧬 RESURRECTION STARTED for: {repo_url}")
                logger.info(f"   Instructions: {(vibe_instructions or 'None')[:200]}")
                add_debug_log('INFO', 'RESURRECT', 'Resurrection started', {
                    'repo_url': repo_url,
                    'instructions_length': len(vibe_instructions or ''),
                    'instructions_preview': (vibe_instructions or '')[:500],
                })

                self.send_response(200)
                # Use NDJSON (Newline Delimited JSON) for easy parsing
                self.send_header('Content-Type', 'application/x-ndjson')
                self.send_header('Access-Control-Allow-Origin', '*')
                # Disable buffering
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('Connection', 'keep-alive')
                self.end_headers()

                # Call the generator with detailed logging
                chunk_count = 0
                for chunk in process_resurrection(repo_url, vibe_instructions):
                    chunk_count += 1
                    # Write chunk as JSON line + newline
                    line = json.dumps(chunk) + "\n"
                    self.wfile.write(line.encode('utf-8'))
                    self.wfile.flush()

                    chunk_type = chunk.get('type', 'unknown')
                    if chunk_type == 'log':
                        logger.info(f"   📤 Stream log: {chunk.get('content', '')[:120]}")
                    elif chunk_type == 'debug':
                        logger.debug(f"   🔍 Debug: {chunk.get('content', '')[:200]}")
                    elif chunk_type == 'result':
                        result_data = chunk.get('data', {})
                        logger.info(f"   📦 Result: status={result_data.get('status')} | artifacts={len(result_data.get('artifacts', []))} | retries={result_data.get('retry_count', 0)}")
                    
                    add_debug_log('DEBUG', 'RESURRECT_STREAM', f'Chunk #{chunk_count}: {chunk_type}', {
                        'chunk_type': chunk_type,
                        'chunk_size': len(line),
                        'content_preview': str(chunk.get('content', chunk.get('data', '')))[:300]
                    })

                elapsed = time.time() - request_start
                logger.info(f"🏁 RESURRECTION COMPLETE in {elapsed:.1f}s | {chunk_count} chunks streamed")
                add_debug_log('INFO', 'RESURRECT', f'Resurrection complete', {'elapsed_ms': round(elapsed * 1000), 'chunks': chunk_count})
                
            except Exception as e:
                self._log_error(e, '/api/resurrect')
                try:
                    error_line = json.dumps({"type": "log", "content": f"[ERROR] {str(e)}"}) + "\n"
                    self.wfile.write(error_line.encode('utf-8'))
                    self.wfile.flush()
                    # Send a result with error status so frontend can exit loading state
                    result_line = json.dumps({"type": "result", "data": {"logs": str(e), "artifacts": [], "preview": "", "status": "Error", "retry_count": 0, "errors": [{"attempt": 1, "type": "EXCEPTION", "message": str(e)}]}}) + "\n"
                    self.wfile.write(result_line.encode('utf-8'))
                    self.wfile.flush()
                except Exception:
                    pass

        elif self.path == '/api/commit':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                request_json = json.loads(post_data)
                
                repo_url = request_json.get('repo_url')
                filename = request_json.get('filename')
                content = request_json.get('content')

                logger.info(f"📝 Committing file: {filename} to {repo_url}")
                add_debug_log('INFO', 'COMMIT', f'Committing {filename}', {'repo_url': repo_url, 'filename': filename, 'content_length': len(content or '')})

                # Call commit logic
                result = commit_code(repo_url, filename, content)
                
                logger.info(f"   Commit result: {result.get('status', 'unknown')}")
                add_debug_log('INFO', 'COMMIT', f'Commit result: {result.get("status")}', result)

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())
                self._log_response(200)

            except Exception as e:
                self._log_error(e, '/api/commit')
                self.send_error(500, str(e))
        
        elif self.path == '/api/create-pr':
            try:
                from lazarus_agent import commit_all_files
                
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                request_json = json.loads(post_data)
                
                repo_url = request_json.get('repo_url')
                files = request_json.get('files')  # list of {"filename": str, "content": str}
                
                if not files or not repo_url:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"status": "error", "message": "Missing repo_url or files"}).encode())
                    return

                # Commit all files and create PR
                result = commit_all_files(repo_url, files)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode())
        
        else:
            self.send_response(404)
            self.end_headers()

def run(server_class=ThreadingHTTPServer, handler_class=LazarusHandler, port=PORT):
    server_address = ('', port)
    logger.info(f"{'═'*60}")
    logger.info(f"🧬 LAZARUS BACKEND v11.0 — DETAILED LOGGING ENABLED")
    logger.info(f"{'═'*60}")
    logger.info(f"   Port:      {port}")
    logger.info(f"   Debug Logs: http://localhost:{port}/api/debug-logs")
    logger.info(f"   Endpoints:  /api/scan, /api/analyze, /api/resurrect, /api/commit, /api/create-pr")
    logger.info(f"{'═'*60}")
    add_debug_log('INFO', 'SERVER', 'Lazarus backend started', {'port': port})
    httpd = server_class(server_address, handler_class)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("Server shutting down...")
    httpd.server_close()

if __name__ == "__main__":
    run()
