"""
Lazarus Engine - TRUE PRESERVATION-FIRST Code Generation Prompts
Version 5.0 - PRESERVE ORIGINAL FILES, ENHANCE IN-PLACE

This module contains all prompts used by the Lazarus Engine.
The core philosophy: OUTPUT ALL ORIGINAL FILES WITH ENHANCEMENTS.
"""

def get_code_generation_prompt(plan: str, deep_scan_result: dict = None) -> str:
    """
    Returns the TRUE PRESERVATION-FIRST code generation prompt.
    Key principle: OUTPUT ALL ORIGINAL FILES with UI enhancements.
    """
    
    # Build list of ALL files that MUST be output
    file_list = ""
    existing_code_context = ""
    total_files = 0
    
    if deep_scan_result:
        files = deep_scan_result.get("files", [])
        tech_stack = deep_scan_result.get("tech_stack", {})
        must_preserve = deep_scan_result.get("must_preserve", [])
        api_endpoints = deep_scan_result.get("api_endpoints", [])
        total_files = len(files)
        
        # Build MANDATORY file list - ALL files must be output!
        file_list = "YOU MUST OUTPUT ALL OF THESE FILES (ENHANCED):\n"
        for f in files:
            file_list += f"  📁 {f['path']}\n"
        
        # Build file contents for reference
        for f in files:
            existing_code_context += f"""
══════════════════════════════════════════════════════════════
📁 ORIGINAL FILE: {f['path']}
══════════════════════════════════════════════════════════════
```{f['language']}
{f['content']}
```
"""
        
        preservation_rules = f"""
═══════════════════════════════════════════════════════════════════════════════
🔒 PRESERVATION REQUIREMENTS (CRITICAL!)
═══════════════════════════════════════════════════════════════════════════════

TOTAL FILES IN ORIGINAL REPOSITORY: {total_files}
>>> YOU MUST OUTPUT ALL {total_files} FILES! <<<

{file_list}

DETECTED DATABASE: {tech_stack.get('backend', {}).get('database', 'Unknown')}
>> KEEP THE SAME DATABASE TYPE! DO NOT SWITCH TO A DIFFERENT DB! <<

DETECTED BACKEND FRAMEWORK: {tech_stack.get('backend', {}).get('framework', 'Unknown')}
>> KEEP THE SAME FRAMEWORK! <<

DETECTED FRONTEND FRAMEWORK: {tech_stack.get('frontend', {}).get('framework', 'Unknown')}
>> ENHANCE IN-PLACE - DO NOT REPLACE WITH A DIFFERENT FRAMEWORK! <<

MUST PRESERVE (COPY FROM ORIGINALS):
{chr(10).join(['  🔒 ' + item for item in must_preserve[:20]])}

EXISTING API ENDPOINTS (KEEP EXACT SAME PATHS):
{chr(10).join(['  📍 ' + ep for ep in api_endpoints[:20]])}

═══════════════════════════════════════════════════════════════════════════════
📚 ALL ORIGINAL FILES (ENHANCE THESE, KEEP SAME PATHS):
═══════════════════════════════════════════════════════════════════════════════
{existing_code_context}
"""
    else:
        preservation_rules = """
[WARNING: No deep scan available. Generate from plan only.]
"""
        total_files = 0
    
    return f"""
╔══════════════════════════════════════════════════════════════════════════════╗
║  LAZARUS ENGINE - TRUE PRESERVATION-FIRST CODE GENERATION                   ║
║  VERSION: 5.0 - PRESERVE ALL ORIGINAL FILES, ENHANCE IN-PLACE              ║
╚══════════════════════════════════════════════════════════════════════════════╝

🎯 THE GOLDEN RULE:
═══════════════════════════════════════════════════════════════════════════════
"IF IT WORKS, DON'T BREAK IT. IF IT'S UGLY, MAKE IT PRETTY. IF IT'S SLOW, MAKE IT FAST."

⚠️ CRITICAL REQUIREMENT:
═══════════════════════════════════════════════════════════════════════════════
THE ORIGINAL REPOSITORY HAS {total_files} FILES.
YOU MUST OUTPUT ALL {total_files} FILES WITH ENHANCEMENTS!

DO NOT create a new structure like "modernized_stack/".
DO NOT replace original files with Next.js/React if original was HTML.
DO output EVERY original file with the SAME PATH but ENHANCED content.

WHAT "ENHANCEMENT" MEANS:
✅ Better CSS styling (modern, glassmorphism, dark mode)
✅ Better HTML structure (semantic tags, accessibility)
✅ Better JavaScript (ES6+, cleaner code)
✅ Same functionality, prettier appearance
✅ Same database connections, same API endpoints
✅ Same file paths!

YOU MUST NOT:
❌ Change database type (MongoDB → SQLite is FORBIDDEN!)
❌ Change framework (Express → FastAPI is FORBIDDEN for JS projects!)
❌ Rename or remove any files
❌ Create new folder structure like "modernized_stack/"
❌ Replace HTML files with React/Next.js components
❌ Remove any existing functionality

═══════════════════════════════════════════════════════════════════════════════
SECTION 1: ARCHITECTURAL PLAN
═══════════════════════════════════════════════════════════════════════════════

{plan}

{preservation_rules}

═══════════════════════════════════════════════════════════════════════════════
SECTION 2: OUTPUT FORMAT (STRICT XML)
═══════════════════════════════════════════════════════════════════════════════

Output ALL files using the ORIGINAL file paths in this exact XML format:

<file path="Home/Home/admin.html">
... enhanced file content ...
</file>

<file path="Home/Home/adminserver.js">
... enhanced file content ...
</file>

RULES:
- Use the EXACT SAME file paths as the original files!
- Output ALL {total_files} files from the original repository
- Each file MUST have COMPLETE content (NO placeholders like "// ..." or "TODO")
- NO markdown code blocks (```) inside the XML
- One continuous stream of <file> elements
- Every file must be immediately runnable

═══════════════════════════════════════════════════════════════════════════════
SECTION 3: HTML FILE ENHANCEMENT RULES
═══════════════════════════════════════════════════════════════════════════════

For HTML files, ENHANCE by:
1. Add a modern CSS stylesheet link (create a new modern.css if needed)
2. Improve the existing HTML structure (semantic tags)
3. Keep ALL existing JavaScript functionality
4. Keep ALL form fields, buttons, and interactions
5. Keep ALL API calls and backend connections
6. Modernize colors, fonts, and layout

EXAMPLE ENHANCEMENT:
Original: <div class="container"> → Enhanced: <main class="container glass-panel">
Original: Old inline styles → Enhanced: Modern CSS classes
Original: Old fonts → Enhanced: Modern Google Fonts (Inter, Roboto)

═══════════════════════════════════════════════════════════════════════════════
SECTION 4: JAVASCRIPT/NODE.JS FILE ENHANCEMENT RULES
═══════════════════════════════════════════════════════════════════════════════

For .js files (server, utilities, etc.):
1. KEEP the exact same database connection (MongoDB stays MongoDB!)
2. KEEP the exact same API endpoints
3. KEEP the exact same route handlers
4. Can improve code style (var → const/let)
5. Can add error handling
6. Can add logging
7. MUST NOT change core functionality

═══════════════════════════════════════════════════════════════════════════════
SECTION 5: ADD THESE NEW FILES (OPTIONAL ENHANCEMENTS)
═══════════════════════════════════════════════════════════════════════════════

You MAY add these new files to enhance the project:
- modern.css (or enhance existing CSS files)
- package.json (if not exists, or enhance existing)

But the PRIORITY is outputting ALL original files with enhancements.

═══════════════════════════════════════════════════════════════════════════════
SECTION 6: FINAL CHECKLIST (Verify Before Output)
═══════════════════════════════════════════════════════════════════════════════

🔒 PRESERVATION CHECKLIST:
□ All {total_files} original files are included in output
□ All files use their ORIGINAL paths (not modernized_stack/)
□ Database type is SAME as original
□ All existing API endpoints preserved with exact paths
□ All existing functionality preserved
□ No files were renamed or deleted

✅ ENHANCEMENT CHECKLIST:
□ CSS is modernized (dark mode, glassmorphism, better colors)
□ HTML is semantic and accessible
□ JavaScript uses modern syntax (ES6+)
□ All forms and interactions still work

═══════════════════════════════════════════════════════════════════════════════
NOW GENERATE ALL {total_files} FILES
═══════════════════════════════════════════════════════════════════════════════

Output ALL files now in XML format.
Use ORIGINAL file paths.
PRESERVE all functionality.
ENHANCE only the appearance/style.
Include EVERY file with COMPLETE content.
"""
