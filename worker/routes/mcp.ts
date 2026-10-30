/**
 * POST /api/mcp — the Academy's public MCP server (read-only knowledge tools; see worker/zuva/mcp.ts).
 * No cookies are read here, so cross-site requests can't act as a signed-in learner.
 */
import { createRouter, clientKey } from '../app';
import { hit } from '../lib/ratelimit';
import { handleMcpHttp } from '../zuva/mcp';

const mcp = createRouter();

mcp.all('/', async (c) => {
  await hit(c.env.DB, `mcp:${clientKey(c)}`, 120, 60, 'Too many MCP requests. Slow down.');
  return handleMcpHttp(c.req.raw, new URL(c.env.APP_URL).origin);
});

export default mcp;
