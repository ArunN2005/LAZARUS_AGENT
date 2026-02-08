"""
Lazarus Engine - ABSOLUTE PRESERVATION Code Generation Prompts
Version 6.0 - COPY EVERYTHING, ENHANCE APPEARANCE ONLY

This module contains all prompts used by the Lazarus Engine.
The core philosophy: COPY ALL ORIGINAL CODE, ONLY CHANGE STYLING.
"""

def get_code_generation_prompt(plan: str, deep_scan_result: dict = None, memory_context: str = "") -> str:
    """
    Returns the ABSOLUTE PRESERVATION code generation prompt.
    Key principle: COPY every line of code, only enhance CSS/styling.
    
    Args:
        plan: The modernization plan
        deep_scan_result: Results from deep scanning the repository
        memory_context: Past resurrection memory for this repository
    """
    
    # Build list of ALL files that MUST be output
    file_list = ""
    existing_code_context = ""
    total_files = 0
    total_endpoints = 0
    
    if deep_scan_result:
        files = deep_scan_result.get("files", [])
        tech_stack = deep_scan_result.get("tech_stack", {})
        must_preserve = deep_scan_result.get("must_preserve", [])
        api_endpoints = deep_scan_result.get("api_endpoints", [])
        total_files = len(files)
        total_endpoints = len(api_endpoints)
        
        # Build MANDATORY file list - ALL files must be output!
        file_list = ""
        for i, f in enumerate(files, 1):
            file_list += f"  {i}. {f['path']}\n"
        
        # Build file contents - COMPLETE, NO TRUNCATION
        for f in files:
            existing_code_context += f"""
████████████████████████████████████████████████████████████████████████████████
█ ORIGINAL FILE #{files.index(f) + 1}: {f['path']}
█ COPY THIS FILE COMPLETELY, ONLY ENHANCE STYLING
████████████████████████████████████████████████████████████████████████████████

```{f['language']}
{f['content']}
```

⚠️ YOU MUST OUTPUT THIS ENTIRE FILE WITH SAME FUNCTIONALITY!
"""
        
        # Build endpoint list
        endpoint_list = ""
        for i, ep in enumerate(api_endpoints, 1):
            endpoint_list += f"  {i}. {ep}\n"
        
        preservation_rules = f"""

████████████████████████████████████████████████████████████████████████████████
█ CRITICAL: ABSOLUTE PRESERVATION REQUIREMENTS
████████████████████████████████████████████████████████████████████████████████

📊 REPOSITORY STATISTICS:
   - Total Files: {total_files}
   - Total API Endpoints: {total_endpoints}

⚠️ YOU MUST OUTPUT ALL {total_files} FILES!
⚠️ YOU MUST PRESERVE ALL {total_endpoints} API ENDPOINTS!

FILES YOU MUST OUTPUT (EVERY SINGLE ONE):
{file_list}

API ENDPOINTS YOU MUST PRESERVE (EVERY SINGLE ONE):
{endpoint_list if endpoint_list else "  [Detect from server files and preserve all]"}

DATABASE: {tech_stack.get('backend', {}).get('database', 'Unknown')}
>> KEEP THE SAME DATABASE! COPY THE EXACT CONNECTION CODE! <<

████████████████████████████████████████████████████████████████████████████████
█ ALL ORIGINAL FILES (COPY EACH ONE COMPLETELY):
████████████████████████████████████████████████████████████████████████████████
{existing_code_context}
"""
    else:
        preservation_rules = """
[WARNING: No deep scan available. Generate from plan only.]
"""
        total_files = 0
    
    return f"""
████████████████████████████████████████████████████████████████████████████████
█  LAZARUS ENGINE - ABSOLUTE PRESERVATION MODE                                █
█  VERSION: 6.0 - COPY EVERYTHING, ENHANCE APPEARANCE ONLY                   █
████████████████████████████████████████████████████████████████████████████████

{memory_context if memory_context else ""}

🚨 CRITICAL INSTRUCTION - READ CAREFULLY:
═══════════════════════════════════════════════════════════════════════════════

YOU ARE NOT CREATING A NEW APPLICATION.
YOU ARE ENHANCING AN EXISTING APPLICATION.

THIS MEANS:
1. COPY every single file from the original repository
2. COPY every single function, endpoint, and feature
3. COPY every single line of business logic
4. ONLY CHANGE: CSS styling, colors, fonts, visual appearance

THE GOLDEN RULE:
"COPY EVERYTHING. CHANGE ONLY HOW IT LOOKS, NOT WHAT IT DOES."

═══════════════════════════════════════════════════════════════════════════════
WHAT "ENHANCEMENT" MEANS (AND DOES NOT MEAN):
═══════════════════════════════════════════════════════════════════════════════

✅ ENHANCEMENT (DO THIS):
- Copy the entire original file
- Keep ALL functions exactly as they are
- Keep ALL API endpoints exactly as they are
- Keep ALL database queries exactly as they are
- ADD modern CSS (better colors, fonts, animations)
- ADD responsive design
- IMPROVE code formatting (var → const, callbacks → async/await)

❌ NOT ENHANCEMENT (DO NOT DO THIS):
- Creating a new file with only some features
- Summarizing the original code
- Removing endpoints because "they're not needed"
- Changing database type
- Changing the framework
- Creating fewer files than the original

═══════════════════════════════════════════════════════════════════════════════
MANDATORY FILE COUNT CHECK:
═══════════════════════════════════════════════════════════════════════════════

ORIGINAL REPOSITORY HAS: {total_files} FILES
YOUR OUTPUT MUST HAVE: {total_files} FILES (OR MORE)

IF YOUR OUTPUT HAS FEWER FILES, YOU HAVE FAILED.

═══════════════════════════════════════════════════════════════════════════════
SECTION 1: MODERNIZATION PLAN
═══════════════════════════════════════════════════════════════════════════════

{plan}

{preservation_rules}

═══════════════════════════════════════════════════════════════════════════════
SECTION 2: OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════════════

Output EVERY file in this exact XML format:

<file path="[EXACT ORIGINAL PATH]">
[COMPLETE ENHANCED FILE CONTENT]
</file>

EXAMPLE - For a file originally at "Home/Home/adminserver.js":

<file path="Home/Home/adminserver.js">
// ENHANCED VERSION - All original functionality preserved
const express = require('express');
const mongoose = require('mongoose');
// ... EVERY SINGLE LINE OF THE ORIGINAL, WITH IMPROVEMENTS ...
</file>

RULES:
- Use EXACT ORIGINAL file paths
- Include COMPLETE file content
- NO placeholders, NO "// ... rest of code ..."
- NO markdown code blocks inside the XML
- EVERY function from original must be present
- EVERY endpoint from original must be present

═══════════════════════════════════════════════════════════════════════════════
SECTION 3: SERVER FILE RULES (CRITICAL!)
═══════════════════════════════════════════════════════════════════════════════

When enhancing server files (server.js, adminserver.js, etc.):

1. COPY EVERY app.get(), app.post(), app.put(), app.delete() from original
2. COPY EVERY route handler function from original
3. COPY EVERY database connection/query from original
4. KEEP the same port numbers
5. KEEP the same middleware
6. You may ADD: better error handling, logging, comments

WRONG (Missing endpoints):
```javascript
app.get('/', (req, res) => res.send('Hello'));
// Only 1 endpoint when original had 20!
```

CORRECT (All endpoints preserved):
```javascript
app.get('/', (req, res) => res.send('Hello'));
app.get('/users', async (req, res) => {{ /* COPY FROM ORIGINAL */ }});
app.post('/login', async (req, res) => {{ /* COPY FROM ORIGINAL */ }});
app.get('/admin', (req, res) => {{ /* COPY FROM ORIGINAL */ }});
// ... ALL 20 endpoints from original!
```

═══════════════════════════════════════════════════════════════════════════════
SECTION 4: HTML FILE RULES
═══════════════════════════════════════════════════════════════════════════════

When enhancing HTML files:

1. COPY every single element from the original
2. KEEP all form fields, buttons, inputs
3. KEEP all JavaScript in <script> tags
4. KEEP all event handlers
5. ENHANCE: Add modern CSS classes, better styling
6. ENHANCE: Add responsive meta tags
7. ENHANCE: Link to modern CSS file

═══════════════════════════════════════════════════════════════════════════════
SECTION 5: CSS ENHANCEMENT
═══════════════════════════════════════════════════════════════════════════════

CREATE OR ENHANCE a modern CSS file with:
- CSS variables for theming
- Dark mode support
- Modern color palette (not basic red/blue/green)
- Smooth transitions and animations
- Glassmorphism effects
- Modern fonts (Inter, Roboto, etc.)
- Responsive breakpoints

═══════════════════════════════════════════════════════════════════════════════
SECTION 6: PERFORMANCE OPTIMIZATION (STRICT OUTPUT PRESERVATION)
═══════════════════════════════════════════════════════════════════════════════

You MAY optimize slow code for better performance, BUT:

🔴 THE GOLDEN RULE: OUTPUT MUST REMAIN IDENTICAL!
If a function returns [1, 2, 3] before optimization, it MUST return [1, 2, 3] after.

ALLOWED OPTIMIZATIONS:
✅ Replace nested loops with single-pass algorithms
✅ Add caching for repeated expensive operations
✅ Use Map/Set instead of arrays for lookups
✅ Replace synchronous I/O with async where safe
✅ Batch database queries instead of N+1 queries
✅ Use pagination for large data fetches
✅ Add indexes hint in comments for databases
✅ Replace string concatenation with template literals
✅ Use array methods (map, filter, reduce) instead of for loops

NOT ALLOWED:
❌ Changing what data is returned
❌ Changing the order of returned data (unless explicitly unordered)
❌ Removing any functionality
❌ Changing API response structure
❌ Changing database schema

EXAMPLE - Before (Slow):
```javascript
// O(n²) - Slow for large arrays
function findDuplicates(arr) {{
  const duplicates = [];
  for (let i = 0; i < arr.length; i++) {{
    for (let j = i + 1; j < arr.length; j++) {{
      if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {{
        duplicates.push(arr[i]);
      }}
    }}
  }}
  return duplicates;
}}
```

EXAMPLE - After (Optimized, SAME OUTPUT):
```javascript
// O(n) - Optimized with Set
function findDuplicates(arr) {{
  const seen = new Set();
  const duplicates = new Set();
  for (const item of arr) {{
    if (seen.has(item)) {{
      duplicates.add(item);
    }} else {{
      seen.add(item);
    }}
  }}
  return [...duplicates]; // SAME OUTPUT as before!
}}
```

═══════════════════════════════════════════════════════════════════════════════
FINAL VERIFICATION BEFORE OUTPUT:
═══════════════════════════════════════════════════════════════════════════════

Before generating output, verify:
□ You are outputting ALL {total_files} files
□ Every server file has ALL original endpoints
□ Every HTML file has ALL original elements
□ Every file uses its ORIGINAL path
□ No functionality has been removed
□ Only styling/appearance has been changed
□ Optimizations preserve exact output behavior

═══════════════════════════════════════════════════════════════════════════════
NOW GENERATE ALL {total_files} ENHANCED FILES
═══════════════════════════════════════════════════════════════════════════════

Output every single file now.
Copy all functionality.
Enhance only appearance.
"""
