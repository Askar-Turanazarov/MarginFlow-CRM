import type { ExitReason, EmployeeStatus, Prisma } from "@prisma/client";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { formatInTimeZone } from "date-fns-tz";
import { z } from "zod";
import { getOfficeSettings, isWorkingDay, lateFrom, officeDay, officeDayDate, type OfficeClock } from "@/lib/attendance";
import { parseDay } from "@/lib/dates";
import { PLAN_POSITION_TTL_MS } from "@/lib/positions";
import { prisma } from "@/lib/prisma";
import { getAttendanceReport, hoursMinutes, MAX_REPORT_DAYS } from "@/lib/report";
import { ok, safely, ToolError } from "./errors";

// Tools of the MarginFlow CRM MCP server. Rights of a MANAGER (SPEC §7): read everything about attendance,
// plus one write action — assigning a request to an employee.

const STATUS: Record<EmployeeStatus, string> = { OFF_DUTY: "Не на работе", OUT_OF_OFFICE: "Вне офиса", IN_OFFICE: "В офисе" };
const REASON: Record<ExitReason, string> = {
  LUNCH: "обед",
  CLIENT_VISIT: "выезд к клиенту",
  MEETING: "встреча",
  PERSONAL: "личное",
  OTHER: "другое",
};
const OPEN_REQUEST = ["ASSIGNED", "IN_PROGRESS"] as const;

const fullName = (e: { firstName: string; lastName: string }) => `${e.firstName} ${e.lastName}`;
const duration = (ms: number) => {
  const { hours, minutes } = hoursMinutes(ms);
  return `${hours} ч ${minutes} мин`;
};

function clock(settings: OfficeClock) {
  return (d: Date | null | undefined) => (d ? formatInTimeZone(d, settings.timezone, "HH:mm") : null);
}

/** Employee by id, login or (part of) name. Exactly one match, otherwise a clear error. */
async function resolveEmployee(query: string) {
  const q = query.trim();
  if (!q) throw new ToolError("EMPLOYEE_QUERY_EMPTY", "Не указан сотрудник.", "Передайте имя, фамилию или логин (например, «Sofia» или «sofia.ramirez»).");
  const words = q.split(/\s+/);
  const found = await prisma.employee.findMany({
    where: {
      OR: [
        { id: q },
        { user: { login: { equals: q, mode: "insensitive" } } },
        // Every word must match the first or last name: "Sofia Ram" → Sofia Ramirez.
        { AND: words.map((w) => ({ OR: [{ firstName: { contains: w, mode: "insensitive" as const } }, { lastName: { contains: w, mode: "insensitive" as const } }] })) },
      ],
    },
    include: { desk: true, user: { select: { login: true, role: true, isActive: true } } },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    take: 20,
  });
  return { q, found };
}

async function oneEmployee(query: string) {
  const { q, found } = await resolveEmployee(query);
  if (!found.length) {
    throw new ToolError("EMPLOYEE_NOT_FOUND", `Сотрудник «${q}» не найден.`, "Проверьте написание или вызовите find_employee с частью имени.");
  }
  if (found.length > 1) {
    const list = found.map((e) => `${fullName(e)} (${e.user?.login ?? e.id})`).join(", ");
    throw new ToolError("EMPLOYEE_AMBIGUOUS", `По запросу «${q}» найдено несколько сотрудников: ${list}.`, "Уточните запрос: полное имя или логин.");
  }
  return found[0];
}

function parsePeriod(from: string, to: string) {
  const f = parseDay(from);
  const t = parseDay(to);
  if (!f || !t) throw new ToolError("BAD_DATE", `Неверная дата: from=«${from}», to=«${to}».`, "Даты в формате ГГГГ-ММ-ДД, например 2026-10-01.");
  const days = (t.getTime() - f.getTime()) / 86_400_000 + 1;
  if (days < 1) throw new ToolError("BAD_PERIOD", "Дата «from» позже даты «to».", "Поменяйте даты местами.");
  if (days > MAX_REPORT_DAYS) throw new ToolError("PERIOD_TOO_LONG", `Период ${days} дн. — больше допустимых ${MAX_REPORT_DAYS}.`, "Разбейте период на части не длиннее года.");
  return { f, t };
}

/** Which zone (kitchen, meeting room…) contains a point on the plan. */
function zoneAt(zones: { name: string; x: number; y: number; width: number; height: number }[], x: number, y: number) {
  return zones.find((z) => x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height)?.name ?? null;
}

export function registerTools(server: McpServer) {
  server.registerTool(
    "where_is_everyone",
    {
      title: "Где сейчас все сотрудники",
      description:
        "Статус каждого активного сотрудника прямо сейчас: в офисе (место, зона на плане), вне офиса (причина, заявка, последняя точка на карте) или не на работе. Время — офисное (America/Los_Angeles).",
      inputSchema: { status: z.enum(["IN_OFFICE", "OUT_OF_OFFICE", "OFF_DUTY"]).optional().describe("Показать только этот статус") },
      annotations: { readOnlyHint: true },
    },
    ({ status }) =>
      safely(async () => {
        const settings = await getOfficeSettings();
        const time = clock(settings);
        const date = officeDayDate(new Date(), settings);
        const [zones, people] = await Promise.all([
          prisma.zone.findMany(),
          prisma.employee.findMany({
            where: { user: { isActive: true }, ...(status && { status }) },
            include: {
              desk: true,
              workDays: {
                where: { date },
                include: {
                  locations: { orderBy: { at: "desc" }, take: 1 },
                  events: { where: { type: "EXIT" }, orderBy: { at: "desc" }, take: 1, include: { request: { include: { client: true } } } },
                },
              },
            },
            orderBy: [{ status: "desc" }, { firstName: "asc" }],
          }),
        ]);

        const list = people.map((e) => {
          const day = e.workDays[0];
          const base = { name: fullName(e), position: e.position, status: e.status, statusText: STATUS[e.status] };
          if (e.status === "IN_OFFICE") {
            const fresh = e.planAt && Date.now() - e.planAt.getTime() < PLAN_POSITION_TTL_MS && e.planX != null && e.planY != null;
            const zone = fresh ? zoneAt(zones, e.planX!, e.planY!) : null;
            return { ...base, desk: e.desk?.code ?? null, whereInOffice: zone ?? (e.desk ? "на своём месте" : "в офисе"), checkIn: time(day?.checkInAt) };
          }
          if (e.status === "OUT_OF_OFFICE") {
            const exit = day?.events[0];
            const point = day?.locations[0];
            return {
              ...base,
              reason: e.currentExitReason ? REASON[e.currentExitReason] : null,
              since: time(exit?.at),
              request: exit?.request ? `${exit.request.title} — ${exit.request.client.companyName}` : null,
              lastPoint: point ? { lat: point.lat, lng: point.lng, at: time(point.at) } : null,
            };
          }
          return { ...base, dayEndedAt: day?.closed ? time(day.checkOutAt) : null };
        });

        const count = (s: EmployeeStatus) => people.filter((e) => e.status === s).length;
        return ok({
          officeTime: formatInTimeZone(new Date(), settings.timezone, "yyyy-MM-dd HH:mm"),
          totals: { inOffice: count("IN_OFFICE"), outOfOffice: count("OUT_OF_OFFICE"), offDuty: count("OFF_DUTY") },
          employees: list,
        });
      }),
  );

  server.registerTool(
    "find_employee",
    {
      title: "Найти сотрудника по имени",
      description: "Поиск по имени, фамилии, части имени или логину. Возвращает должность, контакты, место, статус и сегодняшний приход.",
      inputSchema: { query: z.string().describe("Имя, фамилия или логин, например «Sofia», «Ramirez», «sofia.ramirez»") },
      annotations: { readOnlyHint: true },
    },
    ({ query }) =>
      safely(async () => {
        const { q, found } = await resolveEmployee(query);
        if (!found.length) {
          throw new ToolError("EMPLOYEE_NOT_FOUND", `Сотрудник «${q}» не найден.`, "Попробуйте часть имени или фамилии, латиницей (например, «Sof»).");
        }
        const settings = await getOfficeSettings();
        const time = clock(settings);
        const date = officeDayDate(new Date(), settings);
        const days = await prisma.workDay.findMany({ where: { date, employeeId: { in: found.map((e) => e.id) } } });
        const openRequests = await prisma.request.groupBy({
          by: ["assigneeId"],
          where: { assigneeId: { in: found.map((e) => e.id) }, status: { in: [...OPEN_REQUEST] } },
          _count: true,
        });
        return ok(
          found.map((e) => {
            const day = days.find((d) => d.employeeId === e.id);
            return {
              id: e.id,
              name: fullName(e),
              login: e.user?.login ?? null,
              role: e.user?.role ?? null,
              active: e.user?.isActive ?? false,
              position: e.position,
              phone: e.phone,
              email: e.email,
              desk: e.desk ? { code: e.desk.code, pc: e.desk.pcNumber } : null,
              status: e.status,
              statusText: STATUS[e.status],
              exitReason: e.currentExitReason ? REASON[e.currentExitReason] : null,
              today: day ? { checkIn: time(day.checkInAt), late: day.isLate ? `${day.lateMinutes} мин` : "нет", checkOut: time(day.checkOutAt) } : "не отмечался",
              openRequests: openRequests.find((r) => r.assigneeId === e.id)?._count ?? 0,
            };
          }),
        );
      }),
  );

  server.registerTool(
    "late_today",
    {
      title: "Кто сегодня опоздал",
      description: "Опоздавшие сегодня (приход с 09:06:00 офисного времени) с минутами опоздания от 09:00, а также кто ещё не отметился после 09:05:59.",
      inputSchema: {},
      annotations: { readOnlyHint: true },
    },
    () =>
      safely(async () => {
        const settings = await getOfficeSettings();
        const time = clock(settings);
        const now = new Date();
        const date = officeDayDate(now, settings);
        const late = await prisma.workDay.findMany({
          where: { date, isLate: true },
          include: { employee: true },
          orderBy: { lateMinutes: "desc" },
        });
        // Not checked in yet — only once the grace period is over (admins don't check in).
        const notCheckedIn =
          isWorkingDay(now, settings) && now >= lateFrom(now, settings)
            ? await prisma.employee.findMany({
                where: { user: { isActive: true, role: { not: "ADMIN" } }, workDays: { none: { date } } },
                orderBy: { firstName: "asc" },
              })
            : [];
        return ok({
          date: officeDay(now, settings),
          rule: `Начало дня ${settings.workdayStart}, допуск ${settings.lateGraceMinutes} мин; минуты опоздания считаются от ${settings.workdayStart}.`,
          workingDay: isWorkingDay(now, settings),
          late: late.map((d) => ({ name: fullName(d.employee), checkIn: time(d.checkInAt), lateMinutes: d.lateMinutes })),
          notCheckedIn: notCheckedIn.map(fullName),
        });
      }),
  );

  server.registerTool(
    "attendance_summary",
    {
      title: "Сводка прихода и ухода за период",
      description:
        "Как Excel-отчёт: по каждому сотруднику — дни на работе, опоздания, часы в офисе и вне офиса. Если указан сотрудник — ещё и разбивка по дням (приход, уход, выходы).",
      inputSchema: {
        from: z.string().describe("Начало периода, ГГГГ-ММ-ДД"),
        to: z.string().describe("Конец периода включительно, ГГГГ-ММ-ДД"),
        employee: z.string().optional().describe("Имя или логин сотрудника (необязательно)"),
      },
      annotations: { readOnlyHint: true },
    },
    ({ from, to, employee }) =>
      safely(async () => {
        const { f, t } = parsePeriod(from, to);
        const person = employee ? await oneEmployee(employee) : null;
        const { settings, summary, days } = await getAttendanceReport(f, t, person?.id);
        const time = clock(settings);
        return ok({
          period: { from, to },
          summary: summary.map((s) => ({
            name: s.name,
            position: s.position,
            daysAtWork: s.days,
            lateCount: s.lateCount,
            lateMinutesTotal: s.lateMinutes,
            inOffice: duration(s.officeMs),
            outside: duration(s.outMs),
          })),
          ...(person && {
            days: days.map((d) => ({
              date: d.date,
              checkIn: time(d.checkInAt),
              checkOut: d.checkOutAt ? time(d.checkOutAt) : d.open ? "ещё на работе" : null,
              lateMinutes: d.lateMinutes,
              inOffice: duration(d.officeMs),
              outside: duration(d.outMs),
              exits: d.exits.map((e) => `${e.reason ? REASON[e.reason] : "—"} ${time(e.from)}–${time(e.to) ?? "…"}`),
            })),
          }),
        });
      }),
  );

  server.registerTool(
    "assign_request",
    {
      title: "Назначить заявку свободному сотруднику в офисе",
      description:
        "Назначает заявку сотруднику, который сейчас в офисе. Без employee выбирается самый свободный: в офисе, не администратор, с наименьшим числом открытых заявок. Новая заявка получает статус ASSIGNED.",
      inputSchema: {
        request: z.string().describe("ID заявки или часть её названия / названия компании клиента"),
        employee: z.string().optional().describe("Кому назначить (имя или логин); если не указано — самому свободному в офисе"),
        reassign: z.boolean().optional().describe("true — переназначить, даже если у заявки уже есть исполнитель"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },
    ({ request, employee, reassign }) =>
      safely(async () => {
        const q = request.trim();
        const requests = await prisma.request.findMany({
          where: {
            OR: [
              { id: q },
              { title: { contains: q, mode: "insensitive" } },
              { client: { companyName: { contains: q, mode: "insensitive" } } },
            ],
          },
          include: { client: true, assignee: true },
          take: 20,
        });
        // Prefer not-done requests when the text matches several.
        const candidates = requests.length > 1 ? requests.filter((r) => r.status !== "DONE") : requests;
        if (!requests.length) {
          throw new ToolError("REQUEST_NOT_FOUND", `Заявка «${q}» не найдена.`, "Передайте ID заявки или часть её названия, например «Landing».");
        }
        if (candidates.length !== 1) {
          const list = (candidates.length ? candidates : requests).map((r) => `«${r.title}» (${r.client.companyName}, ${r.status}, id ${r.id})`).join("; ");
          throw new ToolError("REQUEST_AMBIGUOUS", `По запросу «${q}» подходит несколько заявок: ${list}.`, "Уточните название или передайте ID заявки.");
        }
        const target = candidates[0];
        if (target.status === "DONE") {
          throw new ToolError("REQUEST_DONE", `Заявка «${target.title}» уже выполнена (DONE).`, "Выполненные заявки не назначаются; создайте новую заявку в CRM.");
        }
        if (target.assignee && !reassign) {
          throw new ToolError(
            "REQUEST_ALREADY_ASSIGNED",
            `Заявка «${target.title}» уже назначена: ${fullName(target.assignee)}.`,
            "Чтобы переназначить, повторите вызов с reassign: true.",
          );
        }

        const settings = await getOfficeSettings();
        const date = officeDayDate(new Date(), settings);
        const inOffice: Prisma.EmployeeWhereInput = { status: "IN_OFFICE", workDays: { some: { date, closed: false } } };

        let assignee;
        if (employee) {
          const person = await oneEmployee(employee);
          if (!person.user?.isActive) throw new ToolError("EMPLOYEE_INACTIVE", `${fullName(person)} — учётная запись отключена.`, "Выберите другого сотрудника.");
          const here = await prisma.employee.count({ where: { id: person.id, ...inOffice } });
          if (!here) {
            throw new ToolError(
              "EMPLOYEE_NOT_IN_OFFICE",
              `${fullName(person)} сейчас не в офисе (статус: ${STATUS[person.status]}).`,
              "Назначать можно только тем, кто в офисе. Не указывайте employee — будет выбран самый свободный, или посмотрите where_is_everyone.",
            );
          }
          assignee = person;
        } else {
          const free = await prisma.employee.findMany({
            where: { ...inOffice, user: { isActive: true, role: { not: "ADMIN" } }, ...(target.assigneeId && { id: { not: target.assigneeId } }) },
            include: { _count: { select: { requests: { where: { status: { in: [...OPEN_REQUEST] } } } } } },
          });
          if (!free.length) {
            throw new ToolError("NO_FREE_EMPLOYEE", "Сейчас в офисе нет ни одного сотрудника, кому можно назначить заявку.", "Повторите позже или укажите сотрудника явно, когда он вернётся в офис.");
          }
          free.sort((a, b) => a._count.requests - b._count.requests || a.firstName.localeCompare(b.firstName));
          assignee = free[0];
        }

        const updated = await prisma.request.update({
          where: { id: target.id },
          data: { assigneeId: assignee.id, ...(target.status === "NEW" && { status: "ASSIGNED" }) },
          include: { client: true },
        });
        const openNow = await prisma.request.count({ where: { assigneeId: assignee.id, status: { in: [...OPEN_REQUEST] } } });
        return ok({
          done: true,
          request: { id: updated.id, title: updated.title, client: updated.client.companyName, status: updated.status },
          assignedTo: fullName(assignee),
          previousAssignee: target.assignee ? fullName(target.assignee) : null,
          assigneeOpenRequestsNow: openNow,
        });
      }),
  );
}
