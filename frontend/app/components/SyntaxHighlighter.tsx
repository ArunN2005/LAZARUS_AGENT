'use client';

import React from 'react';

// Simple syntax highlighting rules (no external dependency)
type TokenType = 'keyword' | 'string' | 'comment' | 'number' | 'decorator' | 'type' | 'function' | 'operator' | 'bracket' | 'default';

const TOKEN_COLORS: Record<TokenType, string> = {
  keyword:   '#569CD6',
  string:    '#CE9178',
  comment:   '#6A9955',
  number:    '#B5CEA8',
  decorator: '#DCDCAA',
  type:      '#4EC9B0',
  function:  '#DCDCAA',
  operator:  '#D4D4D4',
  bracket:   '#FFD700',
  default:   '#D4D4D4',
};

// Language keywords
const KEYWORDS_JS = new Set([
  'import', 'export', 'from', 'default', 'const', 'let', 'var', 'function', 'return',
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'continue',
  'try', 'catch', 'finally', 'throw', 'new', 'delete', 'typeof', 'instanceof',
  'class', 'extends', 'super', 'this', 'async', 'await', 'yield',
  'true', 'false', 'null', 'undefined', 'void', 'of', 'in', 'as', 'type', 'interface',
  'enum', 'implements', 'readonly', 'public', 'private', 'protected', 'static',
]);

const KEYWORDS_PY = new Set([
  'import', 'from', 'def', 'class', 'return', 'if', 'elif', 'else', 'for',
  'while', 'try', 'except', 'finally', 'raise', 'with', 'as', 'pass',
  'break', 'continue', 'and', 'or', 'not', 'is', 'in', 'lambda', 'yield',
  'True', 'False', 'None', 'self', 'async', 'await', 'global', 'nonlocal',
  'del', 'assert',
]);

type Token = { text: string; type: TokenType };

function getLanguage(filename: string): 'js' | 'py' | 'html' | 'css' | 'json' | 'other' {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['js', 'jsx', 'ts', 'tsx', 'mjs'].includes(ext)) return 'js';
  if (['py', 'pyw'].includes(ext)) return 'py';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'css' || ext === 'scss' || ext === 'sass') return 'css';
  if (ext === 'json') return 'json';
  return 'other';
}

function tokenizeLine(line: string, lang: 'js' | 'py' | 'html' | 'css' | 'json' | 'other'): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const keywords = lang === 'py' ? KEYWORDS_PY : KEYWORDS_JS;

  while (i < line.length) {
    // Comments
    if (lang === 'py' && line[i] === '#') {
      tokens.push({ text: line.slice(i), type: 'comment' });
      return tokens;
    }
    if ((lang === 'js' || lang === 'css' || lang === 'json') && line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ text: line.slice(i), type: 'comment' });
      return tokens;
    }
    if (lang === 'html' && line.slice(i, i + 4) === '<!--') {
      const end = line.indexOf('-->', i + 4);
      if (end !== -1) {
        tokens.push({ text: line.slice(i, end + 3), type: 'comment' });
        i = end + 3;
        continue;
      } else {
        tokens.push({ text: line.slice(i), type: 'comment' });
        return tokens;
      }
    }

    // Strings
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === '\\') j++; // skip escaped
        j++;
      }
      tokens.push({ text: line.slice(i, j + 1), type: 'string' });
      i = j + 1;
      continue;
    }

    // Python decorator
    if (lang === 'py' && line[i] === '@' && (i === 0 || /\s/.test(line[i - 1]))) {
      let j = i + 1;
      while (j < line.length && /[\w.]/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), type: 'decorator' });
      i = j;
      continue;
    }

    // Numbers
    if (/\d/.test(line[i]) && (i === 0 || !/[\w]/.test(line[i - 1]))) {
      let j = i;
      while (j < line.length && /[\d.xXa-fA-F_eE]/.test(line[j])) j++;
      tokens.push({ text: line.slice(i, j), type: 'number' });
      i = j;
      continue;
    }

    // Brackets
    if ('()[]{}' .includes(line[i])) {
      tokens.push({ text: line[i], type: 'bracket' });
      i++;
      continue;
    }

    // Operators
    if ('=><+-*/%!&|^~?:;,.'.includes(line[i])) {
      tokens.push({ text: line[i], type: 'operator' });
      i++;
      continue;
    }

    // Words (keywords, identifiers)
    if (/[\w$]/.test(line[i])) {
      let j = i;
      while (j < line.length && /[\w$]/.test(line[j])) j++;
      const word = line.slice(i, j);

      if (keywords.has(word)) {
        tokens.push({ text: word, type: 'keyword' });
      } else if (/^[A-Z]/.test(word) && word.length > 1) {
        tokens.push({ text: word, type: 'type' });
      } else if (j < line.length && line[j] === '(') {
        tokens.push({ text: word, type: 'function' });
      } else {
        tokens.push({ text: word, type: 'default' });
      }
      i = j;
      continue;
    }

    // Whitespace and other chars
    tokens.push({ text: line[i], type: 'default' });
    i++;
  }

  return tokens;
}

export default function SyntaxHighlighter({ code, filename }: { code: string; filename: string }) {
  const lang = getLanguage(filename);
  const lines = code.split('\n');

  return (
    <pre className="text-[13px] leading-[20px] p-0 m-0">
      {lines.map((line, i) => {
        const tokens = tokenizeLine(line, lang);
        return (
          <div key={i} className="flex hover:bg-[#2a2d2e] group">
            <span className="inline-block w-14 text-right pr-4 select-none text-[#858585] flex-shrink-0 bg-[#1e1e1e] group-hover:bg-[#2a2d2e]">
              {i + 1}
            </span>
            <code className="whitespace-pre">
              {tokens.map((token, t) => (
                <span key={t} style={{ color: TOKEN_COLORS[token.type] }}>
                  {token.text}
                </span>
              ))}
            </code>
          </div>
        );
      })}
    </pre>
  );
}
