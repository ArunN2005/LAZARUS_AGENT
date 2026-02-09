import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn
from lazarus_agent import process_resurrection, commit_code, LazarusEngine
import sys
import traceback


class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    """Handle requests in separate threads for concurrent access."""
    daemon_threads = True

# Load .env file
from dotenv import load_dotenv
load_dotenv()

PORT = 8000

class LazarusHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        if parsed.path == '/api/scan':
            try:
                repo_url = params.get('repo_url', [None])[0]

                if not repo_url:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Missing repo_url"}).encode())
                    return

                agent = LazarusEngine()
                files = agent.scan_repository(repo_url)

                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"files": files}).encode())

            except Exception as e:
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())

        elif parsed.path == '/api/analyze':
            try:
                repo_url = params.get('repo_url', [None])[0]
                if not repo_url:
                    self.send_response(400)
                    self.send_header('Content-type', 'application/json')
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.end_headers()
                    self.wfile.write(json.dumps({"error": "Missing repo_url"}).encode())
                    return

                # Use NDJSON streaming for real-time updates
                self.send_response(200)
                self.send_header('Content-Type', 'application/x-ndjson')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('Connection', 'keep-alive')
                self.end_headers()

                def send_chunk(chunk):
                    line = json.dumps(chunk) + "\n"
                    self.wfile.write(line.encode('utf-8'))
                    self.wfile.flush()

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
                    gemini_resp = agent._call_gemini(analysis_prompt)
                    # Clean response - remove markdown code blocks if present
                    cleaned = gemini_resp.strip()
                    if cleaned.startswith('```'):
                        cleaned = cleaned.split('\n', 1)[1] if '\n' in cleaned else cleaned[3:]
                    if cleaned.endswith('```'):
                        cleaned = cleaned[:-3]
                    cleaned = cleaned.strip()

                    recommendations = json.loads(cleaned)
                except Exception as e:
                    print(f"[!] Gemini analysis error: {e}")
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

                send_chunk({"type": "log", "content": "Analysis complete!"})

                # Send full analysis result
                send_chunk({
                    "type": "analysis",
                    "data": {
                        "current_stack": current_stack,
                        "recommendations": recommendations,
                    }
                })

            except Exception as e:
                print(f"[!] Analysis error: {e}")
                traceback.print_exc()
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
        if self.path == '/api/resurrect':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                request_json = json.loads(post_data)
                
                repo_url = request_json.get('repo_url')
                vibe_instructions = request_json.get('vibe_instructions')

                self.send_response(200)
                # Use NDJSON (Newline Delimited JSON) for easy parsing
                self.send_header('Content-Type', 'application/x-ndjson')
                self.send_header('Access-Control-Allow-Origin', '*')
                # Disable buffering
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('Connection', 'keep-alive')
                self.end_headers()

                # Call the generator
                for chunk in process_resurrection(repo_url, vibe_instructions):
                    # Write chunk as JSON line + newline
                    line = json.dumps(chunk) + "\n"
                    self.wfile.write(line.encode('utf-8'))
                    self.wfile.flush()
                
            except Exception as e:
                print(f"[!] Resurrection error: {e}")
                traceback.print_exc()
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

                # Call commit logic
                result = commit_code(repo_url, filename, content)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps(result).encode())

            except Exception as e:
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
    print(f"[*] Lazarus Backend running on port {port}...")
    httpd = server_class(server_address, handler_class)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()

if __name__ == "__main__":
    run()
