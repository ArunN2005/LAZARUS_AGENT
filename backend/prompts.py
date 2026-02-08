"""
Lazarus Engine - PRESERVATION-FIRST Code Generation Prompts
Version 4.0 - Preserve & Enhance (NOT Replace!)

This module contains all prompts used by the Lazarus Engine.
The core philosophy: IF IT WORKS, DON'T BREAK IT.
"""

def get_code_generation_prompt(plan: str, deep_scan_result: dict = None) -> str:
    """
    Returns the PRESERVATION-FIRST code generation prompt.
    Key principle: PRESERVE existing functionality, only MODERNIZE UI.
    """
    
    # Build existing code context if deep scan available
    existing_code_context = ""
    if deep_scan_result:
        files = deep_scan_result.get("files", [])
        tech_stack = deep_scan_result.get("tech_stack", {})
        must_preserve = deep_scan_result.get("must_preserve", [])
        api_endpoints = deep_scan_result.get("api_endpoints", [])
        
        # Build file contents for reference
        for f in files[:25]:  # Limit to avoid token overflow
            existing_code_context += f"""
══════════════════════════════════════════════════════════════
📁 EXISTING FILE: {f['path']}
══════════════════════════════════════════════════════════════
```{f['language']}
{f['content'][:3000]}
```
"""
        
        preservation_rules = f"""
═══════════════════════════════════════════════════════════════════════════════
🔒 PRESERVATION REQUIREMENTS (CRITICAL - DO NOT VIOLATE!)
═══════════════════════════════════════════════════════════════════════════════

DETECTED DATABASE: {tech_stack.get('backend', {}).get('database', 'Unknown')}
>> YOU MUST USE THE SAME DATABASE TYPE! DO NOT SWITCH TO A DIFFERENT DB! <<

DETECTED BACKEND FRAMEWORK: {tech_stack.get('backend', {}).get('framework', 'Unknown')}
>> KEEP THE SAME FRAMEWORK OR A COMPATIBLE UPGRADE <<

DETECTED FRONTEND FRAMEWORK: {tech_stack.get('frontend', {}).get('framework', 'Unknown')}
>> CAN BE UPGRADED TO Next.js 15 <<

MUST PRESERVE (COPY EXACTLY FROM ORIGINAL):
{chr(10).join(['  🔒 ' + item for item in must_preserve[:15]])}

EXISTING API ENDPOINTS (KEEP EXACT SAME PATHS):
{chr(10).join(['  📍 ' + ep for ep in api_endpoints[:15]])}

═══════════════════════════════════════════════════════════════════════════════
📚 EXISTING CODEBASE (USE AS REFERENCE):
═══════════════════════════════════════════════════════════════════════════════
{existing_code_context}
"""
    else:
        preservation_rules = """
[WARNING: No deep scan available. Generate from plan only.]
"""
    
    return f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  LAZARUS ENGINE - PRESERVATION-FIRST CODE GENERATION                        ║
║  VERSION: 4.0 - PRESERVE & ENHANCE (NOT REPLACE!)                           ║
╚══════════════════════════════════════════════════════════════════════════════╝

🎯 THE GOLDEN RULE:
═══════════════════════════════════════════════════════════════════════════════
"IF IT WORKS, DON'T BREAK IT. IF IT'S UGLY, MAKE IT PRETTY. IF IT'S SLOW, MAKE IT FAST."

YOU MUST:
✅ PRESERVE all existing database connections (MongoDB stays MongoDB!)
✅ PRESERVE all existing API endpoints (same paths, same methods)
✅ PRESERVE all existing data schemas and models
✅ PRESERVE all existing business logic
✅ ONLY modernize the UI/UX layer
✅ OPTIMIZE slow code (but output must remain identical)

YOU MUST NOT:
❌ Change database type (MongoDB → SQLite is FORBIDDEN!)
❌ Rename or remove any API endpoints
❌ Change data schemas or models
❌ Remove any existing functionality
❌ Create completely new architecture

═══════════════════════════════════════════════════════════════════════════════
SECTION 1: ARCHITECTURAL PLAN (From Planning Phase)
═══════════════════════════════════════════════════════════════════════════════

{plan}

{preservation_rules}

═══════════════════════════════════════════════════════════════════════════════
SECTION 2: OUTPUT FORMAT (STRICT XML)
═══════════════════════════════════════════════════════════════════════════════

Output ALL files in this exact XML format:
<file path="modernized_stack/folder/filename.ext">
... complete file content ...
</file>

RULES:
- Each file MUST have COMPLETE content (NO placeholders like "// ..." or "TODO")
- NO markdown code blocks (```) inside the XML
- One continuous stream of <file> elements
- Every file must be immediately runnable

═══════════════════════════════════════════════════════════════════════════════
SECTION 3: BACKEND PRESERVATION RULES
═══════════════════════════════════════════════════════════════════════════════

🔒 DATABASE RULES (CRITICAL!):
- If original uses MongoDB:  USE MONGODB (pymongo/motor)
- If original uses PostgreSQL: USE POSTGRESQL (psycopg2/asyncpg)
- If original uses MySQL: USE MYSQL (pymysql)
- NEVER switch database types!
- COPY the exact connection string pattern from original

📍 API ENDPOINT RULES:
- COPY all existing endpoints with EXACT same paths
- Keep same HTTP methods (GET, POST, PUT, DELETE)
- Keep same request/response schemas
- Add CORS middleware for sandbox compatibility
- Add health check at / if not exists

📋 SCHEMA/MODEL RULES:
- PRESERVE exact field names from original models
- PRESERVE exact data types
- PRESERVE relationships between models
- DO NOT rename fields or change types

BACKEND TEMPLATE (Preserving Original Structure):
```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
# KEEP ORIGINAL DATABASE IMPORTS:
# If MongoDB: from motor.motor_asyncio import AsyncIOMotorClient
# If PostgreSQL: import asyncpg
# If MySQL: import aiomysql

app = FastAPI(
    title="Lazarus Resurrected API",
    description="Modernized by Lazarus Engine - Logic PRESERVED",
    version="2.0.0"
)

# CORS for sandbox
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# COPY DATABASE CONNECTION FROM ORIGINAL
# Do not change the database type or connection pattern!

# Health check
@app.get("/")
def health_check():
    return {{"status": "online", "service": "lazarus-backend"}}

# ========== COPY ALL EXISTING ENDPOINTS FROM ORIGINAL ==========
# Use EXACT same paths and methods!

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

═══════════════════════════════════════════════════════════════════════════════
SECTION 4: FRONTEND MODERNIZATION (CAN CHANGE UI/UX)
═══════════════════════════════════════════════════════════════════════════════

✅ ALLOWED CHANGES:
- Upgrade to Next.js 15 with App Router
- Restyle with Tailwind CSS
- Modernize component structure
- Add animations, better UX
- Improve responsive design

🔒 MUST PRESERVE:
- All existing pages and their PURPOSE
- All API calls (same endpoints as backend)
- All form fields and validations
- All user flows (login, signup, etc.)

FRONTEND STRUCTURE:
modernized_stack/frontend/
├── package.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── app/
    ├── layout.tsx       # MUST import globals.css
    ├── globals.css      # MUST have @tailwind directives
    ├── page.tsx         # Home page
    └── [recreate all pages from original]

═══════════════════════════════════════════════════════════════════════════════
SECTION 5: SANDBOX COMPATIBILITY - FILE PATH RESTRICTIONS
═══════════════════════════════════════════════════════════════════════════════

🚫 FORBIDDEN CHARACTERS IN FILE/FOLDER NAMES:
- NO parentheses: ( )
- NO brackets: [ ] {{ }}
- NO spaces
- NO special chars: $ & * ? ! | ; < > ` ' "

✅ USE ONLY: alphanumeric, hyphens (-), underscores (_), dots (.)

❌ WRONG: app/(auth)/login/page.tsx
✅ CORRECT: app/auth/login/page.tsx

═══════════════════════════════════════════════════════════════════════════════
SECTION 6: TYPESCRIPT SYNTAX RULES
═══════════════════════════════════════════════════════════════════════════════

| WRONG (Python)          | CORRECT (TypeScript)              |
|-------------------------|-----------------------------------|
| name: str               | name: string                      |
| count: int              | count: number                     |
| active: bool            | active: boolean                   |
| items: List[str]        | items: string[]                   |
| data: Dict              | data: Record<string, any>         |
| Optional[str]           | string | null                     |

═══════════════════════════════════════════════════════════════════════════════
SECTION 7: DOCKER COMPOSE
═══════════════════════════════════════════════════════════════════════════════

FILE: modernized_stack/docker-compose.yml

```yaml
version: '3.8'

services:
  backend:
    build: 
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - PYTHONUNBUFFERED=1
      # PRESERVE original environment variables!
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:8000
    depends_on:
      - backend
    restart: unless-stopped
```

═══════════════════════════════════════════════════════════════════════════════
SECTION 8: FINAL CHECKLIST (Verify Before Output)
═══════════════════════════════════════════════════════════════════════════════

🔒 PRESERVATION CHECKLIST:
□ Database type is SAME as original (not switched!)
□ All existing API endpoints preserved with exact paths
□ All data models/schemas preserved with exact fields
□ All existing pages recreated with same functionality

✅ MODERNIZATION CHECKLIST:
□ Backend has CORS middleware
□ Backend has health check at GET /
□ Frontend uses Next.js 15 with App Router
□ Frontend uses Tailwind CSS
□ layout.tsx imports globals.css
□ globals.css has @tailwind directives
□ All config files present (next.config.mjs, tsconfig.json, etc.)

═══════════════════════════════════════════════════════════════════════════════
NOW GENERATE THE COMPLETE FILE STREAM
═══════════════════════════════════════════════════════════════════════════════

Output ALL files now in XML format.
- PRESERVE all existing backend logic and database connections
- MODERNIZE only the UI/UX layer  
- Include EVERY required file with COMPLETE content
- Do not use placeholders
"""
