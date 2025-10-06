import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import inquirer from "inquirer";

export async function cleanWorkspace() {
  const cwd = process.cwd();
  const workspaceDir = path.join(cwd, "workspace");

  console.log(chalk.blue("Cleaning Bedrock Workspace..."));
  console.log("");

  // Check if workspace exists
  if (!fs.existsSync(workspaceDir)) {
    console.log(chalk.red("Error: No workspace found in current directory."));
    console.log(chalk.gray("Run 'bedrock-workspace init' first to initialize a workspace."));
    return;
  }

  // Define cleanable items
  const cleanableItems = [
    {
      name: 'Node modules',
      path: path.join(workspaceDir, 'node_modules'),
      description: 'Dependencies cache (can be restored with npm install)',
      size: await getDirectorySize(path.join(workspaceDir, 'node_modules'))
    },
    {
      name: 'Package lock file',
      path: path.join(workspaceDir, 'package-lock.json'),
      description: 'Dependency lock file (will be regenerated)',
      size: await getFileSize(path.join(workspaceDir, 'package-lock.json'))
    },
    {
      name: 'Build outputs',
      path: path.join(workspaceDir, 'projects'),
      description: 'Compiled JavaScript files in all projects',
      size: await getBuildOutputSize(workspaceDir),
      isPattern: true
    },
    {
      name: 'Temporary files',
      path: workspaceDir,
      description: 'Temporary and cache files',
      size: await getTempFilesSize(workspaceDir),
      isPattern: true
    },
    {
      name: 'VS Code settings',
      path: path.join(workspaceDir, '.vscode'),
      description: 'VS Code workspace settings (will reset to defaults)',
      size: await getDirectorySize(path.join(workspaceDir, '.vscode'))
    }
  ];

  // Filter existing items
  const existingItems = cleanableItems.filter(item => {
    if (item.isPattern) return item.size > 0;
    return fs.existsSync(item.path);
  });

  if (existingItems.length === 0) {
    console.log(chalk.green("Workspace is already clean!"));
    return;
  }

  // Show cleanable items
  console.log(chalk.white.bold("Cleanable items found:"));
  existingItems.forEach(item => {
    const sizeStr = item.size > 0 ? ` (${formatBytes(item.size)})` : '';
    console.log(`  ${chalk.cyan('•')} ${item.name}${sizeStr}`);
    console.log(`    ${chalk.gray(item.description)}`);
  });

  console.log("");

  // Confirm cleaning
  const { itemsToClean } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'itemsToClean',
      message: 'Select items to clean:',
      choices: existingItems.map(item => ({
        name: `${item.name} ${item.size > 0 ? `(${formatBytes(item.size)})` : ''}`,
        value: item.name,
        checked: true
      }))
    }
  ]);

  if (itemsToClean.length === 0) {
    console.log(chalk.gray("No items selected for cleaning."));
    return;
  }

  // Final confirmation
  const { confirmClean } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmClean',
      message: `Are you sure you want to clean ${itemsToClean.length} item(s)?`,
      default: false
    }
  ]);

  if (!confirmClean) {
    console.log(chalk.gray("Cleaning cancelled."));
    return;
  }

  // Perform cleaning
  console.log("");
  console.log(chalk.blue("Cleaning workspace..."));

  let totalCleaned = 0;
  let itemsCleaned = 0;

  for (const itemName of itemsToClean) {
    const item = existingItems.find(i => i.name === itemName);
    if (!item) continue;

    try {
      if (item.isPattern) {
        const cleaned = await cleanPatternItem(item, workspaceDir);
        totalCleaned += cleaned;
      } else {
        const size = item.size;
        await fs.remove(item.path);
        totalCleaned += size;
        console.log(chalk.green(`  Cleaned: ${item.name}`));
      }
      itemsCleaned++;
    } catch (error) {
      console.log(chalk.red(`  Failed to clean ${item.name}: ${error.message}`));
    }
  }

  console.log("");
  console.log(chalk.green(`Cleaning completed!`));
  console.log(chalk.gray(`Items cleaned: ${itemsCleaned}`));
  console.log(chalk.gray(`Space freed: ${formatBytes(totalCleaned)}`));

  // Suggest next steps
  if (itemsToClean.includes('Node modules') || itemsToClean.includes('Package lock file')) {
    console.log("");
    console.log(chalk.cyan("Next steps:"));
    console.log(chalk.gray("Run 'npm install' in the workspace to restore dependencies"));
  }
}

async function cleanPatternItem(item, workspaceDir) {
  let totalCleaned = 0;

  if (item.name === 'Build outputs') {
    // Clean compiled JS files from all projects
    const projectsDir = path.join(workspaceDir, 'projects');
    if (fs.existsSync(projectsDir)) {
      const projects = fs.readdirSync(projectsDir)
        .filter(p => fs.statSync(path.join(projectsDir, p)).isDirectory());

      for (const project of projects) {
        const scriptsDir = path.join(projectsDir, project, 'behavior_pack', 'scripts');
        if (fs.existsSync(scriptsDir)) {
          const size = await getDirectorySize(scriptsDir);
          await fs.remove(scriptsDir);
          totalCleaned += size;
        }

        const distDir = path.join(projectsDir, project, 'dist');
        if (fs.existsSync(distDir)) {
          const size = await getDirectorySize(distDir);
          await fs.remove(distDir);
          totalCleaned += size;
        }
      }
    }
    console.log(chalk.green(`  Cleaned: Build outputs`));
  } else if (item.name === 'Temporary files') {
    // Clean various temporary files
    const tempPatterns = [
      '**/*.tmp',
      '**/*.temp',
      '**/.DS_Store',
      '**/Thumbs.db',
      '**/*.log'
    ];

    // This is a simplified implementation
    // In a real scenario, you'd use a glob library
    console.log(chalk.green(`  Cleaned: Temporary files`));
  }

  return totalCleaned;
}

async function getDirectorySize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  
  try {
    let size = 0;
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        size += await getDirectorySize(itemPath);
      } else {
        size += stats.size;
      }
    }
    
    return size;
  } catch (error) {
    return 0;
  }
}

async function getFileSize(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    return 0;
  }
}

async function getBuildOutputSize(workspaceDir) {
  let totalSize = 0;
  const projectsDir = path.join(workspaceDir, 'projects');
  
  if (!fs.existsSync(projectsDir)) return 0;
  
  try {
    const projects = fs.readdirSync(projectsDir)
      .filter(p => fs.statSync(path.join(projectsDir, p)).isDirectory());

    for (const project of projects) {
      const scriptsDir = path.join(projectsDir, project, 'behavior_pack', 'scripts');
      const distDir = path.join(projectsDir, project, 'dist');
      
      totalSize += await getDirectorySize(scriptsDir);
      totalSize += await getDirectorySize(distDir);
    }
  } catch (error) {
    // Ignore errors
  }
  
  return totalSize;
}

async function getTempFilesSize(workspaceDir) {
  // This is a simplified implementation
  // In a real scenario, you'd scan for various temp file patterns
  return 0;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
