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

const MAX_TEXT = 500;
// Control and invisible characters (line breaks, zero-width, text direction): they can disguise text as instructions.
const HIDDEN_CHARS = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]+/gu;

/** CRM text is typed by people, so it is cleaned and shortened before an agent reads it. */
export function cleanText(text: string) {
  const clean = text.replace(HIDDEN_CHARS, " ").replace(/ {2,}/g, " ").trim();
  return clean.length > MAX_TEXT ? `${clean.slice(0, MAX_TEXT)}…` : clean;
}

function cleanDeep(value: unknown): unknown {
  if (typeof value === "string") return cleanText(value);
  if (Array.isArray(value)) return value.map(cleanDeep);
  if (value && typeof value === "object" && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, cleanDeep(v)]));
  }
  return value;
}

export const ok = (data: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(cleanDeep(data), null, 2) }],
});

const fail = (code: string, message: string, hint: string): CallToolResult => ({
  isError: true,
  content: [{ type: "text", text: `Ошибка ${code}: ${cleanText(message)}\nЧто сделать: ${hint}` }],
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
