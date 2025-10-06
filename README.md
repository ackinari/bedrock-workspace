# Bedrock Workspace

CLI utility to initialize and manage Minecraft Bedrock TypeScript development workspaces.

## Installation

Install the package using npm:

```bash
npm init @akinari/bedrock-workspace
```

## Workspace Structure

After initialization, your workspace will have the following structure:

```
workspace/
├── .vscode/                   # Workspace configs
│   └── ...
├── backups/                   # Own projects generated backups
├── libraries/                 # Shared libraries (not implemented yet)
├── projects/                  # Individual projects
│   ├── template/              # Base template for new projects
│   └── your_project/          # User projects
│       ├── behavior_pack/
│       ├── resource_pack/
│       ├── tscripts/
│       └── tsconfig.json      # TypeScript configs
├── .gitgnore
├── .prettierc.json            # Prettier configs
├── eslint.config.mjs          # ESlint configs
├── just.config.ts             # Task configs
├── package.json               # Dependencies and scripts
├── README.md                  # Hi!
└── tsconfig.json              # Main TypeScript configs
```

## Available Scripts

Once your workspace is initialized, you can use these npm scripts and tasks:

### Global Tasks (Workspace)
- `npm run new-project` - Create a new project from the template
- `npm run clone-project` - Clone an existing project with new UUIDs
- `npm run delete-project` - Delete a project (with confirmation)
- `npm run rename-project` - Rename a project and update manifests
- `npm run list-projects` - List all available projects
- `npm run open-mc-folder` - Open Minecraft development folders

### Project Tasks (Individual project)
#### Development
- `npm run typescript` - Compile TypeScript files
- `npm run watch` - Watch files and deploy automatically

#### Deploy
- `npm run local-deploy` - Deploy to local Minecraft installation
- `npm run clean` - Clean generated files from Minecraft development folders
- `npm run mcaddon` - Create a `.mcaddon` file for distribution

#### Management
- `npm run analyze` - Project statistics
- `npm run backup` - Create a compressed project backup
- `npm run update-version` - Update version in manifests
- `npm run generate-uuids` - Re-Generate new UUIDs for manifests
- `npm run update-workspace` - Update workspace with newest template configurations

## Configuration

The workspace comes pre-configured with:

- **TypeScript**: Latest version with Minecraft Bedrock types
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Just Scripts**: Build system
- **VS Code**: Debugging and IntelliSense configuration

## Links

- [GitHub Repository](https://github.com/ackinari/bedrock-workspace)
- [npm Package](https://www.npmjs.com/package/@ackinari/create-bedrock-workspace)
- [Issues](https://github.com/ackinari/bedrock-workspace/issues)