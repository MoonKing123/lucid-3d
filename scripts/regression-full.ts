/**
 * KR3: 全量回归编排器 —— 解析截图结果、生成 REPORT.md、自动开 broken issue
 *
 * 用法：
 *   tsx scripts/regression-full.ts --phase 57
 *
 * 纯函数（供单元测试 import）：parseRegressionResults / generateReport
 */

import { execSync, spawnSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

const VALID_DEMOS = ['runner-3d', 'action-rpg', 'action-rpg-v2', 'br-12p', 'slg-3d', 'tower-defense-3d'] as const;
type DemoName = (typeof VALID_DEMOS)[number];

export interface DemoResult {
  status: 'pass' | 'broken';
  screenshots?: string[];
  error?: string;
}

export interface BrokenIssue {
  demo: string;
  issue: number;
}

export interface ReportOpts {
  results: Record<string, DemoResult>;
  brokenIssues: BrokenIssue[];
  phase?: number;
}

// ——— 纯函数（供测试 import）———

export function parseRegressionResults(stdout: string): Record<string, DemoResult> {
  return JSON.parse(stdout) as Record<string, DemoResult>;
}

export function generateReport(opts: ReportOpts): string {
  const { results, brokenIssues, phase = 57 } = opts;

  const date = new Date().toISOString().slice(0, 10);

  const rows = VALID_DEMOS.map((demo) => {
    const r = results[demo];
    if (!r) return `| ${demo} | ⏭️ skipped | - | - |`;
    const statusIcon = r.status === 'pass' ? '✅ pass' : '❌ broken';
    const screenshots = r.status === 'pass' ? `[4 张](./phase-${phase}/${demo}/)` : '-';
    const failReason = r.status === 'broken' ? (r.error?.split('\n')[0]?.slice(0, 80) ?? 'unknown error') : '-';
    return `| ${demo} | ${statusIcon} | ${screenshots} | ${failReason} |`;
  }).join('\n');

  const passCount = Object.values(results).filter((r) => r.status === 'pass').length;
  const totalCount = Object.values(results).length;
  const brokenLinks = brokenIssues.map((b) => `#${b.issue}`).join(', ');
  const brokenNote =
    brokenIssues.length > 0
      ? `**${brokenIssues.length} broken** 已自动开 fix issue：${brokenLinks}`
      : '所有 example 通过';

  const thumbnails = VALID_DEMOS.filter((demo) => results[demo]?.status === 'pass')
    .map(
      (demo) =>
        `### ${demo}\n\n` +
        `![0s](./phase-${phase}/${demo}/0s.png) ` +
        `![5s](./phase-${phase}/${demo}/5s.png) ` +
        `![15s](./phase-${phase}/${demo}/15s.png) ` +
        `![30s](./phase-${phase}/${demo}/30s.png)`,
    )
    .join('\n\n');

  return `# Lucid-3D 回归视觉证据报告

**生成时间**: ${date}
**生成方式**: \`tsx scripts/regression-screenshot.ts --demo all\`
**Phase 58 KR3**

## 总览

| Example | 状态 | 截图 | 失败原因 |
|---------|------|------|----------|
${rows}

**${passCount}/${totalCount}** examples 通过。${brokenNote}

## 截图缩略图

${thumbnails}

## 已上传评论的 issue 清单（KR4 完成后填）

（待 KR4 完成后更新）
`;
}

// ——— 运行时逻辑 ———

function createBrokenIssue(demo: string, error: string, phase: number): number {
  const body = [
    `## regression-broken: \`${demo}\` Phase ${phase} KR3`,
    '',
    `**触发命令**: \`tsx scripts/regression-screenshot.ts --demo ${demo} --phase ${phase}\``,
    '',
    `**时间戳**: ${new Date().toISOString()}`,
    '',
    '**错误栈**:',
    '```',
    error.slice(0, 3000),
    '```',
    '',
    '**本地复现**:',
    '```bash',
    `tsx scripts/regression-screenshot.ts --demo ${demo} --phase ${phase}`,
    '```',
  ].join('\n');

  const result = spawnSync(
    'gh',
    [
      'issue',
      'create',
      '--repo',
      'MoonKing123/lucid-3d',
      '--title',
      `regression-broken: ${demo} Phase ${phase} KR3 跑不起来`,
      '--label',
      'regression-broken',
      '--body',
      body,
    ],
    { encoding: 'utf-8' },
  );

  if (result.status !== 0) {
    process.stderr.write(`创建 issue 失败: ${result.stderr}\n`);
    return -1;
  }

  const match = result.stdout.match(/(\d+)\s*$/);
  if (match) return Number(match[1]);

  const urlMatch = result.stdout.match(/\/issues\/(\d+)/);
  return urlMatch ? Number(urlMatch[1]) : -1;
}

async function main() {
  const args = process.argv.slice(2);
  const phaseIdx = args.indexOf('--phase');
  const phase = phaseIdx !== -1 ? Number(args[phaseIdx + 1]) : 57;

  process.stderr.write(`[KR3] 启动全量回归 phase-${phase}...\n`);

  let stdout: string;
  try {
    stdout = execSync(
      `npx tsx scripts/regression-screenshot.ts --demo all --phase ${phase}`,
      { encoding: 'utf-8', cwd: PROJECT_ROOT, timeout: 300_000, maxBuffer: 10 * 1024 * 1024 },
    );
  } catch (e: unknown) {
    const err = e as { stdout?: string; stderr?: string; message?: string };
    stdout = err.stdout ?? '{}';
    process.stderr.write(`截图命令部分失败: ${err.stderr ?? err.message}\n`);
  }

  const results = parseRegressionResults(stdout || '{}');
  process.stderr.write(`[KR3] 截图完成，结果:\n${JSON.stringify(results, null, 2)}\n`);

  const brokenIssues: BrokenIssue[] = [];
  for (const [demo, result] of Object.entries(results)) {
    if (result.status === 'broken') {
      process.stderr.write(`[KR3] ${demo} broken，创建 issue...\n`);
      const issueNum = createBrokenIssue(demo, result.error ?? 'unknown', phase);
      if (issueNum > 0) {
        brokenIssues.push({ demo, issue: issueNum });
        process.stderr.write(`[KR3] ${demo} → issue #${issueNum}\n`);
      }
    }
  }

  const report = generateReport({ results: results as Record<string, DemoResult>, brokenIssues, phase });

  const reportDir = join(PROJECT_ROOT, 'docs', 'regression');
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, 'REPORT.md');
  writeFileSync(reportPath, report, 'utf-8');
  process.stderr.write(`[KR3] REPORT.md 已写入: ${reportPath}\n`);

  process.stdout.write(JSON.stringify(results, null, 2) + '\n');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    process.stderr.write(err.stack ?? err.message);
    process.exit(1);
  });
}
