#!/usr/bin/env node
import { program } from "commander";

import { appConfig } from "@/config/app.config";
import { WebSocketMCPServer } from "@/websocket-mcp-server";
import type { Resource } from "@/resources/resource";
import * as common from "@/tools/common";
import * as custom from "@/tools/custom";
import * as snapshot from "@/tools/snapshot";
import type { Tool } from "@/tools/tool";

import packageJSON from "../package.json";

let server: WebSocketMCPServer | null = null;

function setupExitWatchdog(mcpServer: WebSocketMCPServer) {
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    await mcpServer.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    await mcpServer.close();
    process.exit(0);
  });
}

const commonTools: Tool[] = [common.pressKey, common.wait];

const customTools: Tool[] = [custom.getConsoleLogs, custom.screenshot];

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

const resources: Resource[] = [];

async function startServer(port: number = 9234): Promise<WebSocketMCPServer> {
  console.log(`🚀 Starting ${appConfig.name} v${packageJSON.version}`);

  const mcpServer = new WebSocketMCPServer(snapshotTools, resources);
  await mcpServer.start(port);

  console.log('📊 Server Info:');
  console.log(`   Tools: ${snapshotTools.length} available`);
  console.log(`   Resources: ${resources.length} available`);
  console.log(`   Port: ${port}`);
  console.log('\n🎯 Ready for connections:');
  console.log('   - Browser extension: Connect via popup');
  console.log('   - MCP clients: ws://localhost:' + port);
  console.log('   - Test client: bun test/mcp-client-test.js');

  return mcpServer;
}

program
  .version("Version " + packageJSON.version)
  .name(packageJSON.name)
  .option('-p, --port <port>', 'WebSocket port', '9234')
  .action(async (options) => {
    const port = parseInt(options.port) || 9234;

    try {
      server = await startServer(port);
      setupExitWatchdog(server);

      // Keep the process running
      console.log('\n✅ Server started successfully. Press Ctrl+C to stop.');

      // Periodic status updates
      setInterval(() => {
        const stats = server!.getConnectionStats();
        if (stats.totalConnections > 0) {
          console.log(`📊 Active connections: ${stats.extensionConnections} extension, ${stats.mcpConnections} MCP clients`);
        }
      }, 30000); // Every 30 seconds

    } catch (error) {
      console.error('💥 Failed to start server:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);
