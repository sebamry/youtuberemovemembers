import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, test } from 'vitest';

const rootDir = process.cwd();

describe('public repo CI configuration', () => {
  test('includes collaborator-facing CI and maintenance files', () => {
    expect(existsSync(path.join(rootDir, '.github/workflows/ci.yml'))).toBe(true);
    expect(existsSync(path.join(rootDir, '.github/dependabot.yml'))).toBe(true);
    expect(existsSync(path.join(rootDir, '.nvmrc'))).toBe(true);
    expect(existsSync(path.join(rootDir, 'CONTRIBUTING.md'))).toBe(true);
  });

  test('keeps CI workflow aligned with a contributor-local verify command', () => {
    const workflow = readFileSync(path.join(rootDir, '.github/workflows/ci.yml'), 'utf8');
    const contributing = readFileSync(path.join(rootDir, 'CONTRIBUTING.md'), 'utf8');
    const dependabot = readFileSync(path.join(rootDir, '.github/dependabot.yml'), 'utf8');

    expect(workflow).toContain('permissions:');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('concurrency:');
    expect(workflow).toContain('actions/checkout@v6');
    expect(workflow).toContain('actions/setup-node@v6');
    expect(workflow).toContain('node-version-file: .nvmrc');
    expect(workflow).toContain("cache: 'npm'");
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm run verify');

    expect(contributing).toContain('npm ci');
    expect(contributing).toContain('npm run verify');

    expect(dependabot).toContain('package-ecosystem: "npm"');
    expect(dependabot).toContain('package-ecosystem: "github-actions"');
  });
});
