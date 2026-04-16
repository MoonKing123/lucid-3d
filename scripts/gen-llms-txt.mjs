#!/usr/bin/env node
/**
 * Generate llms.txt — condensed API index for AI consumption.
 *
 * Extracts:
 * - Top-of-file JSDoc block → one-line module description
 * - Every `export (class|function|const|let|var|interface|type|enum) Name` line
 *   + preceding JSDoc first line (if any)
 *
 * Goal: give AI a complete map of what symbols exist in which files.
 * Detailed API (method signatures, parameters) is intentionally omitted —
 * AI should Read the source file when it needs that depth.
 *
 * Output: llms.txt at repo root.
 * Usage: node scripts/gen-llms-txt.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

function* walkTs(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* walkTs(full);
    else if (entry.endsWith('.ts') && !entry.endsWith('.d.ts') && !entry.includes('.test.')) yield full;
  }
}

/** First paragraph of top-of-file JSDoc (if any). */
function extractFileHeader(src) {
  const match = src.match(/^\s*\/\*\*\s*\n([\s\S]*?)\n\s*\*\//);
  if (!match) return '';
  return match[1]
    .split('\n')
    .map(l => l.replace(/^\s*\*\s?/, '').trim())
    .filter(l => l && !l.startsWith('@'))
    .join(' ')
    .trim();
}

/** First non-tag line of a JSDoc block. */
function firstJsdocLine(raw) {
  if (!raw) return '';
  return raw
    .split('\n')
    .map(l => l.replace(/^\s*\*\s?/, '').trim())
    .filter(l => l && !l.startsWith('@'))[0] || '';
}

/**
 * Compact a signature fragment: strip extends/implements into a shorter form.
 * Returns one-line snippet suitable for markdown.
 */
function compactSignature(rest) {
  // Collapse whitespace, drop opening brace/semicolon
  let s = rest.replace(/[{\n].*$/s, '').replace(/\s+/g, ' ').trim();
  // Fix "Xxxextends Yyy" (broken by our regex) — always ensure space before extends/implements
  s = s.replace(/(\w)(extends|implements)/g, '$1 $2');
  return s;
}

/**
 * Match top-level exports only. We prevent matching inside class/function bodies
 * by requiring the match to be preceded by start-of-line (with optional whitespace).
 * Since TS tools rarely nest exports inside blocks at the top level, this is safe.
 */
function extractTopLevelExports(src) {
  const results = [];
  // Anchor at line start. Allow leading whitespace only (not matching inside blocks naively,
  // but at top level `export` is always column 0 in our codebase).
  const re = /^(?:\/\*\*\s*([\s\S]*?)\s*\*\/\s*)?export\s+(?:default\s+)?(?:async\s+)?(class|function|const|let|var|interface|type|enum|abstract\s+class)\s+(\w+)([^\n{;=]*)/gm;
  let m;
  while ((m = re.exec(src)) !== null) {
    const doc = firstJsdocLine(m[1]);
    let kind = m[2];
    if (kind.startsWith('abstract')) kind = 'abstract class';
    const name = m[3];
    const rest = compactSignature(m[4]);
    results.push({ kind, name, rest, doc });
  }
  return results;
}

function formatExport(exp) {
  const sig = `${exp.kind} ${exp.name}${exp.rest ? ' ' + exp.rest : ''}`;
  return exp.doc ? `- \`${sig}\` — ${exp.doc}` : `- \`${sig}\``;
}

function build() {
  const files = [...walkTs(SRC)].sort();
  const lines = [
    '# Lucid-3D API Reference (for AI consumption)',
    '',
    'AI-native 3D game engine. WebGL 1.0, column-major Mat4, zero external dependencies.',
    '',
    `Generated: ${new Date().toISOString().slice(0, 10)} from ${files.length} source files.`,
    'Regenerate: `node scripts/gen-llms-txt.mjs`',
    '',
    'This file is a **symbol index**, not full API docs. For method signatures and',
    'parameter details, read the source file directly (path shown in each section).',
    '',
    '---',
    '',
  ];

  // Group by top-level src/ subdir
  const byDir = new Map();
  for (const f of files) {
    const rel = relative(SRC, f).replace(/\\/g, '/');
    const top = rel.includes('/') ? rel.split('/')[0] : '_root';
    if (!byDir.has(top)) byDir.set(top, []);
    byDir.get(top).push({ rel, full: f });
  }

  const dirOrder = ['core', 'math', 'renderer', 'animation', 'physics', 'navigation', 'audio', 'gameplay', 'ui', 'helpers', 'loader', '_root'];
  const sortedDirs = [...byDir.keys()].sort((a, b) => {
    const ai = dirOrder.indexOf(a);
    const bi = dirOrder.indexOf(b);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  for (const dir of sortedDirs) {
    const title = dir === '_root' ? 'Root (src/)' : `src/${dir}/`;
    lines.push(`## ${title}`, '');
    for (const { rel, full } of byDir.get(dir)) {
      const src = readFileSync(full, 'utf8');
      const header = extractFileHeader(src);
      const exports = extractTopLevelExports(src);
      lines.push(`### \`src/${rel}\``);
      if (header) lines.push(header);
      if (exports.length > 0) {
        for (const exp of exports) lines.push(formatExport(exp));
      } else {
        lines.push('_(no public exports)_');
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

const content = build();
const outPath = join(ROOT, 'llms.txt');
writeFileSync(outPath, content, 'utf8');
console.log(`Generated ${outPath} (${content.length} bytes, ${content.split('\n').length} lines)`);
