import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from lazarus_agent import process_resurrection, commit_code, LazarusEngine
import sys

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
                # Can't send 500 if headers already sent, but we try
                print(f"Error: {e}")
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

def run(server_class=HTTPServer, handler_class=LazarusHandler, port=PORT):
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
