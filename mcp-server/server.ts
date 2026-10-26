import { createHash, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { registerTools } from "./tools";

// MarginFlow CRM MCP server (SPEC §7). Run: npm run mcp → http://127.0.0.1:3333/mcp
// Every request must carry "Authorization: Bearer <MCP_API_KEY from .env>"; without it — 401, nothing else.

try {
  process.loadEnvFile(".env");
} catch {
  // no .env — the check below explains what is missing
}

const KEY = process.env.MCP_API_KEY ?? "";
const HOST = "127.0.0.1";
const PORT = Number(process.env.MCP_PORT ?? 3333);

if (KEY.length < 32 || KEY === "change-me") {
  console.error(
    "MCP-сервер не запущен: в .env нет надёжного ключа MCP_API_KEY (нужно не меньше 32 символов).\n" +
      "Вставьте сгенерированный ключ в .env: MCP_API_KEY=<ключ> и запустите снова: npm run mcp",
  );
  process.exit(1);
}

const hash = (s: string) => createHash("sha256").update(s).digest();
const EXPECTED = hash(KEY);

/** Equal-length hashes: timingSafeEqual does not leak how many characters matched. */
function authorized(req: IncomingMessage) {
  const given = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  return !!given && timingSafeEqual(hash(given), EXPECTED);
}

/** Errors before MCP itself starts are JSON-RPC too, so the agent shows the message to the user. */
function reject(res: ServerResponse, status: number, message: string) {
  res.writeHead(status, { "Content-Type": "application/json", ...(status === 401 && { "WWW-Authenticate": 'Bearer realm="marginflow-crm"' }) });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32001, message }, id: null }));
}

async function readJson(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error("tooLarge");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const http = createServer(async (req, res) => {
  const path = new URL(req.url ?? "/", `http://${HOST}`).pathname;
  if (path !== "/mcp") return reject(res, 404, "Нет такого адреса. MCP-сервер CRM отвечает только на /mcp.");
  if (!authorized(req)) {
    return reject(
      res,
      401,
      "Нет доступа: не передан или неверный секретный ключ. Добавьте заголовок Authorization: Bearer <MCP_API_KEY> (ключ — в .env, такой же — в настройках агента).",
    );
  }
  // Stateless mode: one POST = one JSON-RPC exchange, no sessions to keep.
  if (req.method !== "POST") return reject(res, 405, "Метод не поддерживается: сервер работает без сессий, используйте POST.");

  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    return reject(res, 400, "Тело запроса — не JSON (или больше 1 МБ). Отправьте JSON-RPC запрос MCP.");
  }

  const server = new McpServer({ name: "marginflow-crm", version: "1.0.0" });
  registerTools(server);
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    enableDnsRebindingProtection: true,
    allowedHosts: [`${HOST}:${PORT}`, `localhost:${PORT}`],
  });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, body);
  } catch (error) {
    console.error("[mcp] request failed:", error instanceof Error ? error.message : error);
    if (!res.headersSent) reject(res, 500, "Внутренняя ошибка MCP-сервера CRM. Смотрите лог сервера (npm run mcp).");
  }
});

http.on("error", (error: NodeJS.ErrnoException) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `Порт ${PORT} занят — MCP-сервер, скорее всего, уже запущен. Остановите его или задайте другой порт: MCP_PORT=3334 в .env.`
      : `MCP-сервер не запустился: ${error.message}`,
  );
  process.exit(1);
});

// Only this computer can connect (127.0.0.1), and only with the key.
http.listen(PORT, HOST, () => console.log(`MarginFlow CRM MCP server: http://${HOST}:${PORT}/mcp (ключ обязателен)`));
