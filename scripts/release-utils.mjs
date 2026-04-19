import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ICON_SIZES = [16, 32, 48, 128];

async function readJsonFile(filePath) {
  const content = await readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getErrorMessage(error) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return String(error);
}

export async function readReleaseMetadata({ rootDir = process.cwd() } = {}) {
  const packageJsonPath = path.join(rootDir, 'package.json');
  const manifestPath = path.join(rootDir, 'manifest.json');
  const [packageJson, manifest] = await Promise.all([readJsonFile(packageJsonPath), readJsonFile(manifestPath)]);

  if (typeof packageJson.version !== 'string' || typeof manifest.version !== 'string') {
    throw new Error('package.json and manifest.json must both declare a version string.');
  }

  if (packageJson.version !== manifest.version) {
    throw new Error(
      `Release version mismatch: package.json is ${packageJson.version} but manifest.json is ${manifest.version}.`
    );
  }

  return {
    version: manifest.version,
    zipFileName: `members-only-filter-v${manifest.version}.zip`
  };
}

export async function regenerateIcons({
  rootDir = process.cwd(),
  runCommand = async (command, args) => execFileAsync(command, args),
  warn = console.warn
} = {}) {
  const baseIconPath = path.join(rootDir, 'src/assets/icons/icon-base.svg');
  const outputPaths = ICON_SIZES.map((size) => path.join(rootDir, `src/assets/icons/icon-${size}.png`));

  try {
    await Promise.all(
      ICON_SIZES.map(async (size) => {
        const outputPath = path.join(rootDir, `src/assets/icons/icon-${size}.png`);
        await runCommand('sips', [
          '-s',
          'format',
          'png',
          baseIconPath,
          '--resampleHeightWidth',
          String(size),
          String(size),
          '--out',
          outputPath
        ]);
      })
    );

    return {
      usedFallback: false
    };
  } catch (error) {
    const allPngsExist = (await Promise.all(outputPaths.map((outputPath) => fileExists(outputPath)))).every(Boolean);
    if (!allPngsExist) {
      throw new Error(`Icon regeneration failed and committed PNG fallbacks are missing. ${getErrorMessage(error)}`);
    }

    warn(`Icon regeneration skipped; using committed PNG icons instead. ${getErrorMessage(error)}`);
    return {
      usedFallback: true
    };
  }
}
