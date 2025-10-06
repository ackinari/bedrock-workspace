import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import simpleGit from "simple-git";

export async function statusWorkspace() {
  const cwd = process.cwd();
  const workspaceDir = path.join(cwd, "workspace");

  console.log(chalk.blue("Bedrock Workspace Status"));
  console.log(chalk.gray("─".repeat(50)));

  // Check if workspace exists
  if (!fs.existsSync(workspaceDir)) {
    console.log(chalk.red("Status: No workspace found"));
    console.log(chalk.gray("Run 'bedrock-workspace init' to initialize a workspace."));
    return;
  }

  console.log(chalk.green("Status: Workspace found"));
  console.log(chalk.gray(`Location: ${workspaceDir}`));
  console.log("");

  // Basic workspace information
  await showBasicInfo(workspaceDir);
  console.log("");

  // Git status
  await showGitStatus(workspaceDir);
  console.log("");

  // Dependencies status
  await showDependenciesStatus(workspaceDir);
  console.log("");

  // Projects status
  await showProjectsStatus(workspaceDir);
  console.log("");

  // Libraries status
  await showLibrariesStatus(workspaceDir);
  console.log("");

  // Disk usage
  await showDiskUsage(workspaceDir);
  console.log("");

  // System information
  showSystemInfo();
}

async function showBasicInfo(workspaceDir) {
  console.log(chalk.white.bold("Workspace Information:"));
  
  try {
    const packageJsonPath = path.join(workspaceDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = fs.readJsonSync(packageJsonPath);
      console.log(`  Name: ${packageJson.name || 'Unknown'}`);
      console.log(`  Version: ${packageJson.version || 'Unknown'}`);
      console.log(`  Description: ${packageJson.description || 'No description'}`);
      
      if (packageJson.author) {
        console.log(`  Author: ${packageJson.author}`);
      }
    } else {
      console.log(chalk.yellow("  No package.json found"));
    }

    // Check workspace age
    const stats = fs.statSync(workspaceDir);
    const age = Math.floor((Date.now() - stats.birthtime.getTime()) / (1000 * 60 * 60 * 24));
    console.log(`  Created: ${stats.birthtime.toLocaleDateString()} (${age} days ago)`);
    
  } catch (error) {
    console.log(chalk.yellow("  Could not read workspace information"));
  }
}

async function showGitStatus(workspaceDir) {
  console.log(chalk.white.bold("Git Status:"));
  
  const gitDir = path.join(workspaceDir, '.git');
  if (!fs.existsSync(gitDir)) {
    console.log(chalk.yellow("  Not a git repository"));
    console.log(chalk.gray("  This workspace was initialized without git tracking"));
    return;
  }

  try {
    const git = simpleGit(workspaceDir);
    const status = await git.status();
    const branch = await git.branch();
    
    console.log(`  Branch: ${branch.current || 'Unknown'}`);
    console.log(`  Status: ${status.isClean() ? chalk.green('Clean') : chalk.yellow('Modified')}`);
    
    if (!status.isClean()) {
      if (status.modified.length > 0) {
        console.log(`  Modified files: ${status.modified.length}`);
      }
      if (status.not_added.length > 0) {
        console.log(`  Untracked files: ${status.not_added.length}`);
      }
      if (status.staged.length > 0) {
        console.log(`  Staged files: ${status.staged.length}`);
      }
    }

    // Check if updates are available
    try {
      await git.fetch('origin', branch.current, ['--dry-run']);
      const log = await git.log([`HEAD..origin/${branch.current}`]);
      if (log.all.length > 0) {
        console.log(chalk.yellow(`  Updates available: ${log.all.length} commits`));
      } else {
        console.log(chalk.green("  Up to date"));
      }
    } catch (error) {
      console.log(chalk.gray("  Could not check for updates"));
    }
    
  } catch (error) {
    console.log(chalk.yellow("  Could not read git status"));
  }
}

async function showDependenciesStatus(workspaceDir) {
  console.log(chalk.white.bold("Dependencies:"));
  
  const packageJsonPath = path.join(workspaceDir, 'package.json');
  const nodeModulesPath = path.join(workspaceDir, 'node_modules');
  const packageLockPath = path.join(workspaceDir, 'package-lock.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.log(chalk.yellow("  No package.json found"));
    return;
  }

  try {
    const packageJson = fs.readJsonSync(packageJsonPath);
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};
    
    console.log(`  Production dependencies: ${Object.keys(deps).length}`);
    console.log(`  Development dependencies: ${Object.keys(devDeps).length}`);
    
    // Check if node_modules exists
    if (fs.existsSync(nodeModulesPath)) {
      console.log(chalk.green("  Status: Installed"));
      
      // Check for important Minecraft dependencies
      const minecraftDeps = Object.keys(deps).filter(dep => dep.includes('minecraft'));
      if (minecraftDeps.length > 0) {
        console.log("  Minecraft dependencies:");
        minecraftDeps.forEach(dep => {
          console.log(`    - ${dep}: ${deps[dep]}`);
        });
      }
    } else {
      console.log(chalk.red("  Status: Not installed"));
      console.log(chalk.gray("  Run 'npm install' to install dependencies"));
    }
    
    // Check package-lock.json
    if (fs.existsSync(packageLockPath)) {
      const lockStats = fs.statSync(packageLockPath);
      const packageStats = fs.statSync(packageJsonPath);
      
      if (lockStats.mtime < packageStats.mtime) {
        console.log(chalk.yellow("  Warning: package-lock.json is older than package.json"));
      }
    }
    
  } catch (error) {
    console.log(chalk.yellow("  Could not read dependencies information"));
  }
}

async function showProjectsStatus(workspaceDir) {
  console.log(chalk.white.bold("Projects:"));
  
  const projectsDir = path.join(workspaceDir, 'projects');
  if (!fs.existsSync(projectsDir)) {
    console.log(chalk.yellow("  No projects directory found"));
    return;
  }

  try {
    const projects = fs.readdirSync(projectsDir)
      .filter(item => fs.statSync(path.join(projectsDir, item)).isDirectory())
      .filter(item => item !== 'template');
    
    console.log(`  Total projects: ${projects.length}`);
    
    if (projects.length > 0) {
      console.log("  Project details:");
      
      for (const project of projects.slice(0, 10)) { // Limit to 10 projects
        const projectPath = path.join(projectsDir, project);
        const behaviorManifest = path.join(projectPath, 'behavior_pack', 'manifest.json');
        const scriptsDir = path.join(projectPath, 'behavior_pack', 'scripts');
        
        let projectInfo = `    - ${project}`;
        
        // Check if project has compiled scripts
        if (fs.existsSync(scriptsDir)) {
          const jsFiles = fs.readdirSync(scriptsDir, { recursive: true })
            .filter(file => typeof file === 'string' && file.endsWith('.js'));
          if (jsFiles.length > 0) {
            projectInfo += chalk.green(' (built)');
          }
        }
        
        // Check manifest for version
        if (fs.existsSync(behaviorManifest)) {
          try {
            const manifest = fs.readJsonSync(behaviorManifest);
            if (manifest.header && manifest.header.version) {
              projectInfo += ` v${manifest.header.version.join('.')}`;
            }
          } catch (error) {
            // Ignore manifest read errors
          }
        }
        
        console.log(projectInfo);
      }
      
      if (projects.length > 10) {
        console.log(chalk.gray(`    ... and ${projects.length - 10} more projects`));
      }
    }
    
    // Check template
    const templateDir = path.join(projectsDir, 'template');
    if (fs.existsSync(templateDir)) {
      console.log(chalk.green("  Template: Available"));
    } else {
      console.log(chalk.yellow("  Template: Missing"));
    }
    
  } catch (error) {
    console.log(chalk.yellow("  Could not read projects information"));
  }
}

async function showLibrariesStatus(workspaceDir) {
  console.log(chalk.white.bold("Libraries:"));
  
  const librariesDir = path.join(workspaceDir, 'libraries');
  if (!fs.existsSync(librariesDir)) {
    console.log(chalk.yellow("  No libraries directory found"));
    return;
  }

  try {
    const libraries = fs.readdirSync(librariesDir)
      .filter(item => fs.statSync(path.join(librariesDir, item)).isDirectory());
    
    console.log(`  Available libraries: ${libraries.length}`);
    
    if (libraries.length > 0) {
      libraries.forEach(library => {
        const libraryPath = path.join(librariesDir, library);
        const hasJs = fs.existsSync(path.join(libraryPath, 'index.js'));
        const hasTs = fs.existsSync(path.join(libraryPath, 'index.d.ts'));
        
        let status = '';
        if (hasJs && hasTs) {
          status = chalk.green(' (compiled)');
        } else if (hasTs) {
          status = chalk.yellow(' (types only)');
        }
        
        console.log(`    - ${library}${status}`);
      });
    }
    
  } catch (error) {
    console.log(chalk.yellow("  Could not read libraries information"));
  }
}

async function showDiskUsage(workspaceDir) {
  console.log(chalk.white.bold("Disk Usage:"));
  
  try {
    const totalSize = await getDirectorySize(workspaceDir);
    console.log(`  Total workspace size: ${formatBytes(totalSize)}`);
    
    // Break down by major directories
    const majorDirs = ['node_modules', 'projects', 'libraries', '.git'];
    
    for (const dir of majorDirs) {
      const dirPath = path.join(workspaceDir, dir);
      if (fs.existsSync(dirPath)) {
        const size = await getDirectorySize(dirPath);
        const percentage = totalSize > 0 ? ((size / totalSize) * 100).toFixed(1) : '0';
        console.log(`  ${dir}: ${formatBytes(size)} (${percentage}%)`);
      }
    }
    
  } catch (error) {
    console.log(chalk.yellow("  Could not calculate disk usage"));
  }
}

function showSystemInfo() {
  console.log(chalk.white.bold("System Information:"));
  console.log(`  Platform: ${process.platform} ${process.arch}`);
  console.log(`  Node.js: ${process.version}`);
  console.log(`  Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  
  // Check for required tools
  const tools = ['code', 'git', 'npm'];
  console.log("  Available tools:");
  
  tools.forEach(tool => {
    try {
      const { execSync } = require('child_process');
      execSync(`${tool} --version`, { stdio: 'ignore' });
      console.log(chalk.green(`    - ${tool}`));
    } catch {
      console.log(chalk.red(`    - ${tool} (not found)`));
    }
  });
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

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
