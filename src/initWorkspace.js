import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import simpleGit from "simple-git";
import inquirer from "inquirer";
import { execSync } from "child_process";

const WORKSPACE_REPO = "https://github.com/ackinari/VSCode-Workspace.git";

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
    console.log(chalk.blue("Cloning workspace repository..."));
    console.log(chalk.gray(`Repository: ${WORKSPACE_REPO}`));
    
    const git = simpleGit();
    await git.clone(WORKSPACE_REPO, workspaceDir, ['--depth', '1']);

    // Remove .git folder to make it a fresh workspace
    const gitDir = path.join(workspaceDir, '.git');
    if (fs.existsSync(gitDir)) {
      await fs.remove(gitDir);
    }

    console.log(chalk.green("Workspace cloned successfully!"));
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

    // Initialize git repository for submodules
    console.log("");
    console.log(chalk.blue("Initializing git repository..."));
    const workspaceGit = simpleGit(workspaceDir);
    await workspaceGit.init();

    // Prompt to download libraries
    const { downloadLibraries } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'downloadLibraries',
        message: 'Would you like to download the shared libraries?',
        default: true
      }
    ]);

    if (downloadLibraries) {
      await setupLibraries(workspaceDir, workspaceGit);
    } else {
      console.log(chalk.gray("Libraries skipped. You can add them later with:"));
      console.log(chalk.white("git submodule add https://github.com/ackinari/bedrock-workspace-libraries libraries"));
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

async function setupLibraries(workspaceDir, workspaceGit) {
  try {
    console.log(chalk.blue("Setting up shared libraries..."));
    
    // Check if git is configured
    const isGitConfigured = await checkGitConfiguration();
    if (!isGitConfigured) {
      console.log(chalk.yellow("Git is not configured. Please configure git first:"));
      console.log(chalk.white("git config --global user.name \"Your Name\""));
      console.log(chalk.white("git config --global user.email \"your.email@example.com\""));
      console.log("");
      
      const { continueWithoutGit } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueWithoutGit',
          message: 'Continue without setting up libraries?',
          default: false
        }
      ]);
      
      if (!continueWithoutGit) {
        console.log(chalk.gray("Please configure git and run the setup again."));
        return;
      }
    }

    // Remove existing libraries folder if it exists
    const librariesDir = path.join(workspaceDir, 'libraries');
    if (fs.existsSync(librariesDir)) {
      await fs.remove(librariesDir);
    }

    // Add submodule
    console.log(chalk.blue("Adding libraries submodule..."));
    await workspaceGit.submoduleAdd('https://github.com/ackinari/bedrock-workspace-libraries', 'libraries');
    
    // Initialize and update submodules
    console.log(chalk.blue("Initializing submodules..."));
    await workspaceGit.subModule(['update', '--init', '--recursive']);
    
    console.log(chalk.green("Libraries setup completed successfully!"));
    
  } catch (error) {
    console.log(chalk.yellow("Warning: Failed to setup libraries automatically."));
    console.log(chalk.gray("You can set them up manually later with:"));
    console.log(chalk.white("cd workspace"));
    console.log(chalk.white("git submodule add https://github.com/ackinari/bedrock-workspace-libraries libraries"));
    console.log(chalk.white("git submodule update --init --recursive"));
    console.log(chalk.gray(`Error: ${error.message}`));
  }
}

async function checkGitConfiguration() {
  try {
    const git = simpleGit();
    const config = await git.listConfig();
    
    const hasUserName = config.all['user.name'];
    const hasUserEmail = config.all['user.email'];
    
    return hasUserName && hasUserEmail;
  } catch (error) {
    return false;
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
