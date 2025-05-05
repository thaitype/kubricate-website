import { promises as fs } from 'fs';
import path from 'path';

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
    readmePath: string;
    typedocSidebarPath: string;
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
  const newHeader = `# ${projectName} API Documentation`;
  const description = `\n\n${pkg.description}`;
  const content = `${linkLine}\n\n${newHeader}${description}\n\n`;
  return {
    ...pkg,
    target: {
      typedocSidebarPath: `api/${pkg.name}/${TYPEDOC_SITEBAR_JSON}`,
      readmePath: `api/${pkg.name}/index.md`,
      content,
    },
  };
}

async function updateMarkdownHeaders(pkg: PackageInfo) {
  if (!pkg.target) {
    throw new Error(`Target readme path is not defined for package ${pkg.name}`);
  }
  if (!pkg.target.readmePath) {
    throw new Error(`Target readme path is not defined for package ${pkg.name}`);
  }
  if (!pkg.target.content) {
    throw new Error(`Target content is not defined for package ${pkg.name}`);
  }
  const filepath = pkg.target.readmePath;
  try {
    const fullPath = path.resolve(filepath);
    const content = await fs.readFile(fullPath, 'utf8');

    const updatedContent = content.replace(/^# Documentation\s*/m, pkg.target.content);

    await fs.writeFile(fullPath, updatedContent, 'utf8');
    console.log(`✅ Updated header in ${filepath}`);
  } catch (err) {
    console.error(`❌ Failed to update ${filepath}:`, err);
  }
}

async function generateMockSidebarJson(pkg: PackageInfo) {
  console.log('Mock mode: skipping package info retrieval');
  console.log('Creating typedoc sidebar JSON file');

  if (!pkg.target) {
    throw new Error(`Target readme path is not defined for package ${pkg.name}`);
  }
  if (!pkg.target.typedocSidebarPath) {
    throw new Error(`Target typedoc sidebar path is not defined for package ${pkg.name}`);
  }
  const filepath = pkg.target.typedocSidebarPath;
  try {
    const fullPath = path.resolve(filepath);
    await fs.writeFile(fullPath, JSON.stringify([]), 'utf8');
    console.log(`✅ Created ${filepath}`);
  } catch (err) {
    console.error(`❌ Failed to create ${filepath}:`, err);
  }
}

function parseArguments(argv: string[]) {
  const args = argv.slice(2);
  const options = {
    mock: false,
  };
  args.forEach(arg => {
    if (arg === '--mock') {
      options.mock = true;
    }
  });
  return options;
}

async function main() {
  const options = parseArguments(process.argv);
  const isMock = options.mock;

  let resolvedPackageInfo = await Promise.all(packageInfo.map(getPackageInfo));
  resolvedPackageInfo = resolvedPackageInfo.map(processTarget);

  for (const pkg of resolvedPackageInfo) {
    if (isMock) {
      await generateMockSidebarJson(pkg);
    }
    await updateMarkdownHeaders(pkg);
  }
}

main();