import { Prisma } from "@prisma/client";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

// Every failure reaches the agent as: code + what happened + what to do. Never a bare stack trace.

export class ToolError extends Error {
  constructor(
    public code: string,
    message: string,
    public hint: string,
  ) {
    super(message);
  }
}

export const ok = (data: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
});

const fail = (code: string, message: string, hint: string): CallToolResult => ({
  isError: true,
  content: [{ type: "text", text: `Ошибка ${code}: ${message}\nЧто сделать: ${hint}` }],
});

/** Runs a tool and turns any exception into a readable error result. */
export async function safely(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await run();
  } catch (error) {
    if (error instanceof ToolError) return fail(error.code, error.message, error.hint);
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return fail("DB_UNAVAILABLE", "База данных CRM недоступна.", "Запустите базу: npm run db:start (или npm run dev) и повторите запрос.");
    }
    console.error("[mcp] tool failed:", error instanceof Error ? error.message : error);
    return fail("INTERNAL", "Внутренняя ошибка сервера CRM — запрос не выполнен.", "Повторите позже; если ошибка повторяется — смотрите лог MCP-сервера (npm run mcp).");
  }
}
