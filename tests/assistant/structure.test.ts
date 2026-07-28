import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The assistant's guarantee is that it cannot write. Everything below asserts
 * that the guarantee lives in what it is *given* rather than in what it is told,
 * because the second kind survives right up until something in a model's context
 * suggests otherwise — including text read out of a strategy field a user typed
 * into.
 */

function filesUnder(dir: string, ext = '.ts'): string[] {
  let out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out = out.concat(filesUnder(full, ext));
    else if (full.endsWith(ext)) out.push(full);
  }
  return out;
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//'))
    .join('\n');
}

describe('the assistant toolset has exactly one source', () => {
  it('is built by readOnlyToolset and nowhere else', () => {
    const offenders: string[] = [];
    for (const file of [...filesUnder('src'), ...filesUnder('app', '.tsx'), ...filesUnder('app', '.ts')]) {
      if (file.includes('domain/assistant/toolset')) continue;
      const code = stripComments(readFileSync(file, 'utf8'));
      // Only *assembly* is forbidden — an object or array literal, or a call
      // that is not the filter. `toolset: ReadOnlyToolset` in an interface is a
      // type annotation and declares nothing about where the value came from.
      if (/toolset:\s*[[{]/.test(code)) offenders.push(`${file}: literal`);
      for (const [, call] of code.matchAll(/toolset:\s*(\w+)\(/g)) {
        if (call !== 'readOnlyToolset') offenders.push(`${file}: ${call}()`);
      }
    }
    expect(offenders, 'a caller assembling its own toolset would bypass the filter').toEqual([]);
  });

  it('the filter derives from classifyTool rather than a list of names', () => {
    const source = stripComments(readFileSync('src/domain/assistant/toolset.ts', 'utf8'));
    expect(source).toContain('classifyTool');
    // A literal allowlist here would be the exact thing architecture policy P2
    // forbids, and unlike the degraded allowlist it would *grant*.
    expect(source).not.toMatch(/new Set\(\[\s*'[a-z_]+'/);
  });

  it('excludes a tool whose effect is unstated, rather than assuming it reads', () => {
    const source = stripComments(readFileSync('src/domain/assistant/toolset.ts', 'utf8'));
    expect(source).toMatch(/basis !== 'annotations'/);
  });
});

describe('the assistant reaches BattleGrid one way', () => {
  it('the port is given a callTool and nothing else', () => {
    const port = stripComments(readFileSync('src/ports/assistant.ts', 'utf8'));
    // No adapter, no fetch, no token — an implementation cannot reach past what
    // the use case hands it.
    for (const forbidden of ['BattleGridPort', 'accessToken', 'fetch(']) {
      expect(port, `the assistant port must not carry ${forbidden}`).not.toContain(forbidden);
    }
    expect(port).toContain('callTool');
  });

  it('no assistant file imports the BattleGrid adapter', () => {
    const offenders = filesUnder('src')
      .filter((f) => f.includes('assistant'))
      .filter((f) => /from '@\/infrastructure/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

describe('a deployment with no model still boots', () => {
  it('composition falls back rather than requiring a key', () => {
    const source = stripComments(readFileSync('src/composition.ts', 'utf8'));
    // The alternative is that `/assistant` — and, because the composition root
    // is one module, every authenticated route — needs an Anthropic key to
    // serve at all.
    expect(source).toMatch(/config\.anthropicApiKey\s*\?/);
    expect(source).toContain('new NotConfiguredAssistant()');
  });

  it('.env.example does not set the key', () => {
    // scripts/check-serving.sh exports every *uncommented* variable in this
    // file, filling blanks with a random string. An uncommented
    // ANTHROPIC_API_KEY would therefore boot the served application with a
    // garbage key, and the gate that exists to catch a broken boot would be the
    // thing that broke it.
    const example = readFileSync('.env.example', 'utf8');
    expect(example, 'document it commented out, like ALLOW_INSECURE_COOKIES').not.toMatch(
      /^ANTHROPIC_API_KEY=/m,
    );
    expect(example, 'and still document it').toContain('ANTHROPIC_API_KEY');
  });
});

describe('assistant reads are attributable', () => {
  it('the use case marks its calls as the assistant’s', () => {
    const source = stripComments(
      readFileSync('src/application/use-cases/ask-assistant.command.ts', 'utf8'),
    );
    expect(source).toMatch(/actor:\s*ASSISTANT_ACTOR/);
  });

  it('the audit entry carries an actor at every layer', () => {
    // Threaded rather than inferred: an audit row that cannot say who caused it
    // makes the log's central claim weaker precisely where someone is checking.
    expect(readFileSync('src/domain/audit/audit-entry.ts', 'utf8')).toContain('AuditActor');
    expect(readFileSync('src/infrastructure/db/schema/index.ts', 'utf8')).toContain("actor: text('actor')");
    expect(readFileSync('src/infrastructure/battlegrid/call-path.ts', 'utf8')).toMatch(
      /actor: call\.actor \?\? 'user'/,
    );
  });
});
