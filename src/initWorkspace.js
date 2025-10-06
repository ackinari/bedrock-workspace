import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import inquirer from "inquirer";
import { execSync } from "child_process";
import degit from "degit";

export async function initWorkspace() {
  const cwd = process.cwd();
  const workspaceDir = path.join(cwd, "workspace");

  console.log(chalk.blue("Initializing Bedrock Workspace..."));
  console.log("");

  // Check if workspace already exists
  if (fs.existsSync(workspaceDir)) {
    console.log(chalk.yellow("Warning: A 'workspace' folder already exists."));
    
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: 'Do you want to overwrite the existing workspace?',
        default: false
      }
    ]);

    if (!overwrite) {
      console.log(chalk.gray("Operation cancelled."));
      return;
    }

    console.log(chalk.yellow("Removing existing workspace..."));
    await fs.remove(workspaceDir);
  }

  try {
    console.log(chalk.blue("Downloading workspace template..."));
    console.log(chalk.gray("Repository: https://github.com/ackinari/VSCode-Workspace"));
    
    // Use degit to download without .git folder
    const workspaceEmitter = degit("ackinari/VSCode-Workspace");
    await workspaceEmitter.clone(workspaceDir);
    
    console.log(chalk.green("Workspace downloaded successfully!"));
    console.log("");

    // Install dependencies
    console.log(chalk.blue("Installing dependencies..."));
    try {
      execSync('npm install', { 
        cwd: workspaceDir, 
        stdio: 'inherit' 
      });
      console.log(chalk.green("Dependencies installed successfully!"));
    } catch (error) {
      console.log(chalk.yellow("Warning: Failed to install dependencies automatically."));
      console.log(chalk.gray("You can install them manually by running 'npm install' in the workspace folder."));
    }

    console.log("");
    console.log(chalk.green("Workspace initialized successfully!"));
    console.log(chalk.gray(`Location: ${workspaceDir}`));
    console.log("");

    // Show workspace information
    showWorkspaceInfo(workspaceDir);

    // Prompt to download libraries
    console.log("");
    const { downloadLibraries } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'downloadLibraries',
        message: 'Would you like to download the shared libraries?',
        default: true
      }
    ]);

    if (downloadLibraries) {
      await setupLibraries(workspaceDir);
    } else {
      console.log(chalk.gray("Libraries skipped. You can add them later by running:"));
      console.log(chalk.white("npx degit ackinari/bedrock-workspace-libraries workspace/libraries"));
      console.log(chalk.green("Workspace will remain without git repository."));
    }

    // Prompt to open workspace
    const { openWorkspace } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'openWorkspace',
        message: 'Would you like to open the workspace in VS Code?',
        default: true
      }
    ]);

    if (openWorkspace) {
      await openInVSCode(workspaceDir);
    } else {
      console.log("");
      console.log(chalk.gray("You can open the workspace later with:"));
      console.log(chalk.white(`code -r "${workspaceDir}"`));
    }

    console.log("");
    console.log(chalk.cyan("Next steps:"));
    console.log(chalk.gray("1. Navigate to the workspace: cd workspace"));
    console.log(chalk.gray("2. Create a new project: npm run new-project"));
    console.log(chalk.gray("3. Start developing your Minecraft Bedrock add-on!"));

  } catch (error) {
    console.error(chalk.red("Failed to initialize workspace:"), error.message);
    
    // Clean up on failure
    if (fs.existsSync(workspaceDir)) {
      try {
        await fs.remove(workspaceDir);
      } catch (cleanupError) {
        console.error(chalk.red("Failed to clean up:"), cleanupError.message);
      }
    }
    
    throw error;
  }
}

function showWorkspaceInfo(workspaceDir) {
  console.log(chalk.white.bold("Workspace Information:"));
  
  try {
    const packageJsonPath = path.join(workspaceDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = fs.readJsonSync(packageJsonPath);
      console.log(`  Name: ${packageJson.name || 'Unknown'}`);
      console.log(`  Version: ${packageJson.version || 'Unknown'}`);
      console.log(`  Description: ${packageJson.description || 'No description'}`);
    }

  } catch (error) {
    console.log(chalk.yellow("Could not read workspace information"));
  }
}

async function setupLibraries(workspaceDir) {
  try {
    console.log(chalk.blue("Downloading shared libraries..."));
    console.log(chalk.gray("Repository: https://github.com/ackinari/bedrock-workspace-libraries"));
    
    // Remove existing libraries folder if it exists
    const librariesDir = path.join(workspaceDir, 'libraries');
    if (fs.existsSync(librariesDir)) {
      await fs.remove(librariesDir);
    }

    // Use degit to download libraries without .git folder
    const librariesEmitter = degit("ackinari/bedrock-workspace-libraries");
    await librariesEmitter.clone(librariesDir);
    
    console.log(chalk.green("Libraries downloaded successfully!"));
    
  } catch (error) {
    console.log(chalk.yellow("Warning: Failed to download libraries automatically."));
    console.log(chalk.gray("You can download them manually later with:"));
    console.log(chalk.white("npx degit ackinari/bedrock-workspace-libraries workspace/libraries"));
    console.log(chalk.gray(`Error: ${error.message}`));
  }
}

async function openInVSCode(workspacePath) {
  try {
    console.log(chalk.yellow("Opening workspace in VS Code..."));
    
    // Quote the path to handle spaces and use -r flag to reuse window
    const quotedPath = `"${workspacePath}"`;
    
    execSync(`code -r ${quotedPath}`, { 
      stdio: 'ignore',
      timeout: 10000 
    });
    
    console.log(chalk.green("Workspace opened in VS Code successfully!"));
  } catch (error) {
    console.log(chalk.red("Failed to open VS Code automatically."));
    console.log(chalk.gray("Make sure VS Code is installed and the 'code' command is available in PATH."));
    console.log(chalk.gray("You can enable it in VS Code via:"));
    console.log(chalk.gray("Ctrl+Shift+P → 'Shell Command: Install code command in PATH'"));
    console.log("");
    console.log(chalk.gray("Alternatively, you can open the workspace manually:"));
    console.log(chalk.white(`code -r "${workspacePath}"`));
  }
}
