/**
 * Mounts the English-course MCP tools in Zuva's agent loop: MCP tool definitions become function
 * tools, and the guard rails (sign-in, taint) are enforced around every call.
 */
import type { ZuvaTool } from '../zuva/tool-kit';
import { ESL_TOOLS } from './mcp';

export function eslZuvaTools(): ZuvaTool[] {
  return ESL_TOOLS.map((t) => ({
    label: t.label,
    modes: ['esl'],
    signedIn: t.signedIn,
    spec: { name: t.name, description: t.description, parameters: t.inputSchema },
    run: async (ctx, args) => {
      const s = ctx.esl;
      if (!s) return 'English course tools are only available in the English course.';
      if (t.writes && s.tainted) return 'Refused: this turn read web content, so no settings or notes can change now. Ask the learner to confirm in their next message.';
      const out = await t.run(s, args);
      if (t.readsWeb) s.tainted = true;
      return out;
    },
  }));
}
