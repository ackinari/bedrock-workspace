import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import simpleGit from "simple-git";
import inquirer from "inquirer";

export async function updateWorkspace() {
  const cwd = process.cwd();
  const workspaceDir = path.join(cwd, "workspace");

  console.log(chalk.blue("Updating Bedrock Workspace..."));
  console.log("");

  // Check if workspace exists
  if (!fs.existsSync(workspaceDir)) {
    console.log(chalk.red("Error: No workspace found in current directory."));
    console.log(chalk.gray("Run 'bedrock-workspace init' first to initialize a workspace."));
    return;
  }

  // Check if it's a git repository
  const gitDir = path.join(workspaceDir, '.git');
  if (!fs.existsSync(gitDir)) {
    console.log(chalk.yellow("Warning: Workspace is not a git repository."));
    console.log(chalk.gray("This workspace was likely initialized with a newer version of the CLI."));
    
    const { reinitialize } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'reinitialize',
        message: 'Would you like to reinitialize the workspace to enable updates?',
        default: false
      }
    ]);

    if (reinitialize) {
      console.log(chalk.yellow("Reinitializing workspace..."));
      await reinitializeWorkspace(workspaceDir);
    } else {
      console.log(chalk.gray("Update cancelled. Workspace remains unchanged."));
    }
    return;
  }

  try {
    const git = simpleGit(workspaceDir);

    // Check current status
    console.log(chalk.blue("Checking workspace status..."));
    const status = await git.status();
    
    if (!status.isClean()) {
      console.log(chalk.yellow("Warning: Workspace has uncommitted changes."));
      console.log(chalk.gray("Modified files:"));
      
      status.modified.forEach(file => {
        console.log(chalk.gray(`  M ${file}`));
      });
      
      status.not_added.forEach(file => {
        console.log(chalk.gray(`  ?? ${file}`));
      });

      const { continueUpdate } = await inquirer.prompt([
        {
          type: 'list',
          name: 'continueUpdate',
          message: 'How would you like to proceed?',
          choices: [
            { name: 'Stash changes and update', value: 'stash' },
            { name: 'Discard changes and update', value: 'discard' },
            { name: 'Cancel update', value: 'cancel' }
          ]
        }
      ]);

      if (continueUpdate === 'cancel') {
        console.log(chalk.gray("Update cancelled."));
        return;
      } else if (continueUpdate === 'stash') {
        console.log(chalk.yellow("Stashing changes..."));
        await git.stash();
      } else if (continueUpdate === 'discard') {
        console.log(chalk.yellow("Discarding changes..."));
        await git.reset('hard');
        await git.clean('f', ['-d']);
      }
    }

    // Fetch latest changes
    console.log(chalk.blue("Fetching latest changes..."));
    await git.fetch('origin', 'main');

    // Check if update is needed
    const localCommit = await git.revparse(['HEAD']);
    const remoteCommit = await git.revparse(['origin/main']);

    if (localCommit === remoteCommit) {
      console.log(chalk.green("Workspace is already up to date!"));
      return;
    }

    // Show what will be updated
    console.log(chalk.blue("Changes to be applied:"));
    const log = await git.log(['HEAD..origin/main']);
    
    if (log.all.length > 0) {
      log.all.slice(0, 5).forEach(commit => {
        console.log(chalk.gray(`  • ${commit.message} (${commit.date.substring(0, 10)})`));
      });
      
      if (log.all.length > 5) {
        console.log(chalk.gray(`  ... and ${log.all.length - 5} more commits`));
      }
    }

    // Confirm update
    const { confirmUpdate } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmUpdate',
        message: 'Do you want to apply these updates?',
        default: true
      }
    ]);

    if (!confirmUpdate) {
      console.log(chalk.gray("Update cancelled."));
      return;
    }

    // Apply update
    console.log(chalk.blue("Applying updates..."));
    await git.pull('origin', 'main');

    // Check if dependencies need to be updated
    const packageJsonPath = path.join(workspaceDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const { updateDependencies } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'updateDependencies',
          message: 'Would you like to update dependencies?',
          default: true
        }
      ]);

      if (updateDependencies) {
        console.log(chalk.blue("Updating dependencies..."));
        try {
          const { execSync } = await import('child_process');
          execSync('npm install', { 
            cwd: workspaceDir, 
            stdio: 'inherit' 
          });
          console.log(chalk.green("Dependencies updated successfully!"));
        } catch (error) {
          console.log(chalk.yellow("Warning: Failed to update dependencies automatically."));
          console.log(chalk.gray("You can update them manually by running 'npm install' in the workspace folder."));
        }
      }
    }

    console.log("");
    console.log(chalk.green("Workspace updated successfully!"));
    console.log(chalk.gray(`Location: ${workspaceDir}`));

  } catch (error) {
    console.error(chalk.red("Failed to update workspace:"), error.message);
    
    if (error.message.includes('CONFLICT')) {
      console.log("");
      console.log(chalk.yellow("Update failed due to conflicts."));
      console.log(chalk.gray("You may need to resolve conflicts manually or reinitialize the workspace."));
    }
    
    throw error;
  }
}

async function reinitializeWorkspace(workspaceDir) {
  try {
    // Backup current workspace
    const backupDir = `${workspaceDir}_backup_${Date.now()}`;
    console.log(chalk.yellow(`Creating backup at: ${backupDir}`));
    await fs.copy(workspaceDir, backupDir);

    // Remove current workspace
    await fs.remove(workspaceDir);

    // Reinitialize
    const { initWorkspace } = await import('./initWorkspace.js');
    await initWorkspace();

    console.log("");
    console.log(chalk.green("Workspace reinitialized successfully!"));
    console.log(chalk.gray(`Backup available at: ${backupDir}`));
    
  } catch (error) {
    console.error(chalk.red("Failed to reinitialize workspace:"), error.message);
    throw error;
  }
}
