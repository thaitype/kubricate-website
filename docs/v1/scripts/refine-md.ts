import { promises as fs } from 'fs';
import path from 'path';

const GENERATED_MARKER = '<!-- @generated -->';
export const TYPEDOC_SITEBAR_JSON = 'typedoc-sidebar.json';
export const KUBRICATE_TARGET_PATH = '.vitepress/cache/kubricate';

interface PackageInfo {
  name: string;
  packageDir?: string;
  fullName?: string;
  version?: string;
  description: string;
  /**
   * Target readme file path to modify result from typedoc
   */
  target?: {
    path: string;
    content: string;
  };
}

let packageInfo: PackageInfo[] = [
  {
    name: 'kubricate',
    description: 'CLI for configuration and manifest generation',
  },
  {
    name: 'core',
    description: 'Core framework for creating and managing stacks',
  },
  {
    name: 'plugin-env',
    description: 'Secret connector for `.env` and environment variables',
  },
  {
    name: 'plugin-kubernetes',
    description: 'Kubernetes connectors',
  },
  {
    name: 'stacks',
    description: 'Official reusable stack definitions',
  },
  {
    name: 'toolkit',
    description: 'Utility functions for custom stack authors',
  },
];

packageInfo = packageInfo.map(pkg => ({
  ...pkg,
  packageDir: path.join(KUBRICATE_TARGET_PATH, `packages/${pkg.name}`),
}));

async function getPackageInfo(pkg: PackageInfo): Promise<PackageInfo> {
  if (!pkg.packageDir) {
    throw new Error(`Package directory is not defined for package ${pkg.name}`);
  }
  const packageJsonPath = path.join(pkg.packageDir, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
  return {
    ...pkg,
    fullName: packageJson.name,
    version: packageJson.version,
  };
}

function processTarget(pkg: PackageInfo): PackageInfo {
  const { fullName: projectName } = pkg;
  const linkLine = `[All Packages](../index.md) / ${projectName}`;
  const newHeader = `# ${projectName} Documentation`;
  const description = `\n\n${pkg.description}`;
  const content = `${GENERATED_MARKER}\n\n${linkLine}\n\n${newHeader}${description}\n\n`;
  return {
    ...pkg,
    target: {
      path: `api/${pkg.name}`,
      // typedocSidebarPath: `api/${pkg.name}/${TYPEDOC_SITEBAR_JSON}`,
      // readmePath: `api/${pkg.name}/index.md`,
      content,
    },
  };
}

async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Helper to safely escape package name for RegExp
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function updateMarkdownHeaders(pkg: PackageInfo) {
  if (!pkg.target) {
    throw new Error(`Target info is missing for package ${pkg.name}`);
  }

  const filepath = path.join(pkg.target.path, 'index.md');
  const fullPath = path.resolve(filepath);
  const dir = path.dirname(fullPath);

  try {
    const fileExists = await checkFileExists(fullPath);

    if (!fileExists) {
      // 🏗️ Ensure directory exists before writing file
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, pkg.target.content, 'utf8');
      console.log(`🆕 Created new ${filepath}`);
      return;
    }

    const content = await fs.readFile(fullPath, 'utf8');

    // Check if the file already contains the generated marker and the content
    // If so, skip the update
    if (content.includes(GENERATED_MARKER) && content.includes(pkg.target.content.trim())) {
      console.log(`⏭️  Skipped (already up-to-date): ${filepath}`);
      return;
    }

    const updatedContent = content.replace(
      new RegExp(`^#\\s+${escapeRegExp(pkg.fullName!)}\\s*`, 'm'),
      pkg.target.content.trim()
    );

    await fs.writeFile(fullPath, updatedContent, 'utf8');
    console.log(`✅ Updated header in ${filepath}`);
  } catch (err) {
    throw new Error(`Failed to process ${filepath}: ${err}`);
  }
}


async function generateMockSidebarJson(pkg: PackageInfo) {
  console.log('Mock mode: skipping package info retrieval');
  console.log('Creating typedoc sidebar JSON file');

  if (!pkg.target) {
    throw new Error(`Target readme path is not defined for package ${pkg.name}`);
  }
  const filepath = path.join(pkg.target.path, TYPEDOC_SITEBAR_JSON);
  try {
    // 🏗️ Ensure directory exists before writing file
    const dir = path.dirname(filepath);
    await fs.mkdir(dir, { recursive: true });
    const fullPath = path.resolve(filepath);
    const mockSideBarJson =
      [
        {
          "text": "Home",
          "link": `${pkg.target.path}/`,
          "collapsed": false
        }
      ];
    await fs.writeFile(fullPath, JSON.stringify(mockSideBarJson), 'utf8');
    console.log(`✅ Created ${filepath}`);
  } catch (err) {
    throw new Error(`Failed to create ${filepath}: ${err}`);
  }
}

function parseArguments(argv: string[]) {
  const args = argv.slice(2);
  const options = {
    mock: false,
    clean: false,
  };
  args.forEach(arg => {
    if (arg === '--mock') {
      options.mock = true;
    }
    if (arg === '--clean') {
      options.clean = true;
    }
  });
  return options;
}

async function main() {
  const options = parseArguments(process.argv);
  const isMock = options.mock;
  const isClean = options.clean;

  let resolvedPackageInfo = await Promise.all(packageInfo.map(getPackageInfo));
  resolvedPackageInfo = resolvedPackageInfo.map(processTarget);

  if (isClean) {
    console.log('Cleaning up generated files...');

    for (const pkg of resolvedPackageInfo) {
      if (!pkg.target) {
        throw new Error(`Target is not defined for package ${pkg.name}`);
      }
      const packageDir = pkg.target.path;
      await fs.rm(packageDir, { recursive: true, force: true });
      console.log(`✅ Cleaned up ${packageDir}`);
    }
    return;
  }

  for (const pkg of resolvedPackageInfo) {
    if (isMock) {
      await generateMockSidebarJson(pkg);
    }
    await updateMarkdownHeaders(pkg);
  }
}

main();

