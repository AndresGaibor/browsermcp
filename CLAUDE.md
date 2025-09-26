# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server for browser automation using Browser MCP. It allows AI applications like VS Code, Claude, Cursor, and Windsurf to automate browser interactions through a Chrome extension.

**IMPORTANT**: This repository now contains BOTH components of the Browser MCP solution:
1. MCP server (handles AI tool requests) - in `src/` directory
2. Chrome extension (executes browser actions) - in `extension/` directory

The server and extension communicate via WebSocket on the configured port (default: 9234).

## Build and Development Commands

### MCP Server
- **Build**: `npm run build` - Compiles TypeScript and creates executable in dist/
- **Start**: `npm run start` - Builds and starts the MCP server
- **Type Check**: `npm run typecheck` - Runs TypeScript compiler without emitting files
- **Watch Mode**: `npm run watch` - Builds in watch mode for development
- **Inspector**: `npm run inspector` - Runs MCP inspector for debugging (requires environment variables CLIENT_PORT=9001 SERVER_PORT=9002)

### Chrome Extension
- **Extension Ready**: `npm run build:extension` - Shows instructions for loading extension
- **Development**: `npm run dev:extension` - Shows development workflow for extension
- **Load Extension**: Load the `extension/` folder in Chrome Extensions (Developer mode)

## Architecture

The codebase follows a modular MCP server architecture:

### Core Components

- **Entry Point**: `src/index.ts` - CLI setup using commander.js, creates and starts the MCP server
- **Server**: `src/server.ts` - Core MCP server creation with tool and resource handlers
- **Context**: `src/context.ts` - WebSocket connection management to browser extension
- **WebSocket Server**: `src/ws.ts` - Creates WebSocket server for browser extension communication

### Tool System

Tools are organized into three categories:
- **Common Tools**: `src/tools/common.ts` - Basic navigation (pressKey, wait, navigate, goBack, goForward)
- **Custom Tools**: `src/tools/custom.ts` - Browser-specific actions (getConsoleLogs, screenshot)
- **Snapshot Tools**: `src/tools/snapshot.ts` - DOM interaction tools (snapshot, click, hover, type, selectOption)

All tools implement the `Tool` interface defined in `src/tools/tool.ts` with schema and handle methods.

### Tool Registration

Tools are registered in `src/index.ts`:
```typescript
const snapshotTools: Tool[] = [
  common.navigate(true),
  common.goBack(true),
  common.goForward(true),
  snapshot.snapshot,
  snapshot.click,
  snapshot.hover,
  snapshot.type,
  snapshot.selectOption,
  ...commonTools,
  ...customTools,
];
```

### Communication Flow

1. MCP server starts and creates WebSocket server
2. Browser extension connects via WebSocket (stored in Context)
3. AI client calls MCP tools which send messages to browser extension via WebSocket
4. Browser extension executes actions and returns results

### Key Dependencies

- `@modelcontextprotocol/sdk` - Core MCP protocol implementation
- `ws` - WebSocket server for browser extension communication
- `zod` - Schema validation for tool parameters
- Workspace packages (`@repo/*`, `@r2r/*`) - Shared types, config, and messaging utilities

## Development Notes

- The project uses TypeScript with ES modules
- WebSocket connection is required - tools will fail if browser extension is not connected
- Uses workspace dependencies that may not be available when building standalone
- ARIA snapshots are captured for DOM interaction context in `src/utils/aria-snapshot.ts`

## Chrome Extension Components

This repository now includes a complete Chrome extension in the `extension/` directory:

### Extension Structure
- `extension/manifest.json` - Chrome extension configuration (Manifest V3)
- `extension/popup/` - Extension popup UI (Connect/Disconnect button)
- `extension/background/` - Background service worker (WebSocket connection management)
- `extension/content/` - Content script (DOM interaction executor)
- `extension/options/` - Options page (port/token configuration)
- `extension/icons/` - Extension icons

### Extension Features
- Connect/disconnect to MCP server via WebSocket
- Visual connection status indicator
- Configurable server port and authentication token
- DOM interaction capabilities (click, type, hover, navigate, etc.)
- ARIA snapshot generation for AI context
- Auto-reconnection on connection loss
- Debug logging support

### Quick Start with Extension
1. Load `extension/` folder in Chrome Extensions (Developer mode)
2. Run `bun run start` to start the MCP server
3. Click the extension icon and press "Connect"
4. Use AI applications that support MCP to automate the connected tab