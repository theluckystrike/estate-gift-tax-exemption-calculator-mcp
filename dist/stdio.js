#!/usr/bin/env node
// Local stdio entry: npx -y github:theluckystrike/estate-gift-tax-exemption-calculator-mcp
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./tools.js";
const server = createServer();
await server.connect(new StdioServerTransport());
