import { execa } from 'execa';
import fs from 'fs';
import { rmSync } from 'fs';
import path from 'path';

/**
 * Options for cloning a Git repository.
 */
interface CloneOptions {
  /**
   * Git repository URL.
   * @example "https://github.com/thaitype/kubricate.git"
   */
  repoUrl: string;

  /**
   * Branch name to clone.
   * @example "main"
   */
  branch: string;

  /**
   * Target directory to clone into. Defaults to repo name if not provided.
   * @example ".vitepress/cache/kubricate"
   */
  targetDir?: string;

  /**
   * If true, forcibly removes the existing target directory before cloning.
   * @default false
   */
  force?: boolean;
}

/**
 * Clone a Git repository at a specific branch.
 *
 * - Skips cloning if the target directory exists, unless `force` is true.
 * - Removes the directory if `force` is true.
 *
 * @param {CloneOptions} options - Options for cloning.
 * @returns {Promise<void>}
 */
async function cloneRepo(options: CloneOptions): Promise<void> {
  const { repoUrl, branch, targetDir, force = false } = options;

  const repoName = repoUrl.split('/').pop()?.replace(/\.git$/, '') ?? 'repo';
  const dir = targetDir || repoName;

  // If target directory exists and force is false, skip cloning
  if (fs.existsSync(dir)) {
    if (!force) {
      console.log(`⚠️ Skipped: Directory '${dir}' already exists.`);
      return;
    } else {
      console.log(`🧨 Removing existing directory '${dir}'...`);
      rmSync(dir, { recursive: true, force: true });
    }
  }

  try {
    console.log(`📥 Cloning ${repoUrl} at branch '${branch}' into '${dir}'...`);
    await execa('git', ['clone', '--branch', branch, '--single-branch', repoUrl, dir], {
      stdio: 'inherit',
    });
    console.log('✅ Clone completed.');
  } catch (error) {
    console.error('❌ Failed to clone repository:', error);
    process.exit(1);
  }
}

/**
 * Run `pnpm install` inside the given directory.
 *
 * @param {string} dir - The target directory where dependencies should be installed.
 * @returns {Promise<void>}
 */
export async function installDependencies(dir: string): Promise<void> {
  console.log(`📦 Installing dependencies in ${dir}...`);
  try {
    await execa('pnpm', ['install'], {
      cwd: path.resolve(dir),
      stdio: 'inherit',
    });
    console.log('✅ Dependencies installed.');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error);
    process.exit(1);
  }
}

/**
 * Run `pnpm build` inside the given directory.
 *
 * @param {string} dir - The target directory where the build command should run.
 * @returns {Promise<void>}
 */
export async function buildProject(dir: string): Promise<void> {
  console.log(`🏗️  Building project in ${dir}...`);
  try {
    await execa('pnpm', ['build'], {
      cwd: path.resolve(dir),
      stdio: 'inherit',
    });
    console.log('✅ Project built successfully.');
  } catch (error) {
    console.error('❌ Failed to build project:', error);
    process.exit(1);
  }
}


async function main() {

  const cacheDir = '.vitepress/cache';
  const targetDir = path.join(cacheDir, 'kubricate');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  await cloneRepo({
    repoUrl: 'https://github.com/thaitype/kubricate.git',
    branch: 'main',
    targetDir,
    force: false,
  });

  await installDependencies(targetDir);
  await buildProject(targetDir);
}

main()
  .then(() => {
    console.log('✅ All tasks completed successfully.');
  })
  .catch((error) => {
    console.error('❌ An error occurred:', error);
    process.exit(1);
  });