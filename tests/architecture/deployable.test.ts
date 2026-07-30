import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * What the deployable artifact must and must not carry.
 *
 * These read files rather than building an image, and that limit is the point of
 * stating it: they establish that the *instructions* are right, not that Docker
 * followed them. The image has never been built here — no daemon in this
 * environment — which is filed as `image-never-built`.
 *
 * They are still worth having. Every failure they catch is a silent one: a
 * `.dockerignore` that stops excluding `.env`, a `COPY` dropped from the runtime
 * stage so the gate cannot find the journal it checks against, an entrypoint
 * that stops running the gate at all. None of those break a build. They ship.
 */

const dockerfile = () => readFileSync('Dockerfile', 'utf8');
const dockerignore = () => readFileSync('.dockerignore', 'utf8');
const entrypoint = () => readFileSync('docker-entrypoint.sh', 'utf8');

/** Drop comments, so a scan can forbid a thing while permitting the note saying why. */
const stripComments = (source: string): string =>
  source
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');

describe('the artifact carries no secret', () => {
  it('excludes .env from the build context', () => {
    // The builder stage does `COPY . .`. A developer's local .env is the one
    // file that would turn "contains no credential" into a lie, and it would do
    // so invisibly — the image builds and runs exactly the same.
    const lines = stripComments(dockerignore()).split('\n').map((l) => l.trim());
    expect(lines).toContain('.env');
    expect(lines).toContain('.env.*');
  });

  it('passes no credential in at build time', () => {
    // A build argument holding a placeholder is how a real one ends up in a
    // layer, and layers are pushed to registries.
    const body = stripComments(dockerfile());
    expect(body, 'nothing secret may be an ARG').not.toMatch(
      /ARG\s+(\w*SECRET|\w*KEY|\w*TOKEN|\w*PASSWORD)/i,
    );
    expect(body).not.toMatch(/ENV\s+(TOKEN_ENCRYPTION_KEY|SESSION_SECRET|ANTHROPIC_API_KEY)/);
  });

  it('runs as someone other than root', () => {
    expect(stripComments(dockerfile())).toMatch(/^USER\s+(?!root)/m);
  });
});

describe('the artifact can check the schema it is pointed at', () => {
  it('carries the journal the check compares against', () => {
    // Without this the gate reads no journal, reports it cannot, and refuses —
    // which fails safe, but fails every deploy.
    expect(stripComments(dockerfile())).toMatch(/COPY[^\n]*\/app\/drizzle\s+\.\/drizzle/);
  });

  it('carries both operations', () => {
    const body = stripComments(dockerfile());
    expect(body).toContain('check-schema.mjs');
    expect(body).toContain('migrate.mjs');
  });

  it('carries the migrator the migrate operation imports', () => {
    // `drizzle-orm` is bundled into the server chunks rather than traced into
    // the standalone output, so tools/migrate.mjs has no way to import it
    // unless it is copied explicitly. Dropping this line breaks `migrate` only —
    // serving still works, so nothing else notices until a deploy needs it.
    expect(stripComments(dockerfile())).toMatch(/node_modules\/drizzle-orm/);
  });

  it('references the tools it copies', () => {
    for (const tool of ['tools/check-schema.mjs', 'tools/migrate.mjs']) {
      expect(existsSync(tool), `${tool} must exist to be copied`).toBe(true);
    }
  });
});

describe('serving runs the gate first', () => {
  const body = () => stripComments(entrypoint());

  it('checks the schema before starting the server', () => {
    const source = body();
    const check = source.indexOf('check-schema.mjs');
    const serve = source.indexOf('server.js');
    expect(check, 'the entrypoint must run the gate').toBeGreaterThan(-1);
    expect(serve, 'the entrypoint must start the server').toBeGreaterThan(-1);
    expect(check, 'checking after starting is not a gate').toBeLessThan(serve);
  });

  it('does not serve when the gate fails', () => {
    // `|| exit 1` rather than relying on `set -e` alone: the requirement is that
    // no schema means no serving, and it should be legible on the line that
    // enforces it.
    expect(body()).toMatch(/check-schema\.mjs\s*\|\|\s*exit 1/);
  });

  it('keeps migrating separate from serving', () => {
    // One release step, not one per replica. If `migrate` ever became part of
    // the serve path, N containers would race on one journal.
    const source = body();
    const migrateCase = source.slice(source.indexOf('migrate)'), source.indexOf('serve)'));
    expect(migrateCase).toContain('migrate.mjs');
    expect(migrateCase, 'migrating must not also serve').not.toContain('server.js');
  });

  it('refuses a command it does not recognise', () => {
    expect(body()).toMatch(/exit 2/);
  });
});

describe('the build produces what the runtime stage copies', () => {
  it('asks Next for a standalone build', () => {
    // The runtime stage copies `.next/standalone`. Without this it does not
    // exist, and the image is empty of everything that matters.
    expect(readFileSync('next.config.ts', 'utf8')).toMatch(/output:\s*'standalone'/);
  });

  it('keeps the design tokens in the build context', () => {
    // `prebuild` regenerates app/tokens.css from openspec/design/system.json.
    // Excluding all of openspec/ made `next build` fail inside the image while
    // succeeding everywhere else — the tokens are an input to the build, not
    // documentation.
    const body = dockerignore();
    expect(body).toMatch(/^!openspec\/design\/system\.json$/m);
  });
});
