#!/usr/bin/env node
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import { initWorkspace } from "../src/initWorkspace.js";
import { updateWorkspace } from "../src/updateWorkspace.js";
import { cleanWorkspace } from "../src/cleanWorkspace.js";
import { statusWorkspace } from "../src/statusWorkspace.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

// Display header
console.log(chalk.cyan.bold("@aKiNaRi Bedrock Workspace CLI"));
console.log(chalk.gray("JavaScript and TypeScript workspace for Minecraft Bedrock development"));
console.log(chalk.gray("─".repeat(50)));

// Parse command line arguments
const command = args.find(arg => !arg.startsWith('-')) || 'init';
const flags = args.filter(arg => arg.startsWith('-'));

try {
  if (flags.includes("--update") || command === 'update') {
    await updateWorkspace();
  } else if (flags.includes("--clean") || command === 'clean') {
    await cleanWorkspace();
  } else if (flags.includes("--status") || command === 'status') {
    await statusWorkspace();
  } else if (flags.includes("--help") || command === 'help') {
    showHelp();
  } else if (flags.includes("--version") || command === 'version') {
    showVersion();
  } else {
    await initWorkspace();
  }
} catch (error) {
  console.error(chalk.red("Error:"), error.message);
  process.exit(1);
}

function showHelp() {
  console.log(chalk.white.bold("Usage:"));
  console.log("  bedrock-workspace [command] [options]");
  console.log("");
  console.log(chalk.white.bold("Commands:"));
  console.log("  init     Initialize a new workspace (default)");
  console.log("  update   Update existing workspace");
  console.log("  clean    Clean workspace cache and temporary files");
  console.log("  status   Show workspace status and information");
  console.log("  help     Show this help message");
  console.log("  version  Show version information");
  console.log("");
  console.log(chalk.white.bold("Options:"));
  console.log("  --help     Show help");
  console.log("  --version  Show version");
  console.log("");
  console.log(chalk.white.bold("Examples:"));
  console.log("  bedrock-workspace");
  console.log("  bedrock-workspace init");
  console.log("  bedrock-workspace update");
  console.log("  bedrock-workspace status");
  console.log("");
  console.log(chalk.gray("For more information, visit:"));
  console.log(chalk.blue("https://github.com/ackinari/bedrock-workspace"));
}

function showVersion() {
  const packagePath = path.join(__dirname, '..', 'package.json');
  try {
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    console.log(chalk.white.bold(`${packageJson.name} v${packageJson.version}`));
    console.log(chalk.gray(`Node.js ${process.version}`));
  } catch (error) {
    console.log(chalk.white.bold("@akinari/bedrock-workspace"));
    console.log(chalk.gray("Version information unavailable"));
  }
}
