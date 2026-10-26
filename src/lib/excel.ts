import ExcelJS from "exceljs";
import { formatInTimeZone } from "date-fns-tz";
import type { ReportDay, ReportSummary } from "@/lib/report";

// Excel attendance report: sheets "Summary" and "By day". Durations are real Excel times
// (format [h]:mm), so totals can be summed and sorted in Excel; lateness is in whole minutes.

type Translate = (key: string, values?: Record<string, string | number>) => string;

type Input = {
  t: Translate; // "report.*" texts in the user's language
  timezone: string;
  from: string;
  to: string;
  summary: ReportSummary[];
  days: ReportDay[];
  dateFormat: string; // Excel date format for the user's locale
};

const MS_PER_DAY = 86_400_000;
const DURATION = "[h]:mm";
const MINUTES = '0;-0;"—"'; // 0 is shown as a dash
const HEADER_FILL = "FF1E293B";
const ZEBRA_FILL = "FFF8FAFC";
const LATE_FILL = "FFFEE2E2";
const TOTAL_FILL = "FFE2E8F0";
const BORDER = { style: "thin" as const, color: { argb: "FFCBD5E1" } };

const fill = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });

function addTitle(sheet: ExcelJS.Worksheet, title: string, subtitle: string, columns: number) {
  sheet.mergeCells(1, 1, 1, columns);
  sheet.mergeCells(2, 1, 2, columns);
  sheet.getCell(1, 1).value = title;
  sheet.getCell(1, 1).font = { bold: true, size: 14 };
  sheet.getCell(2, 1).value = subtitle;
  sheet.getCell(2, 1).font = { color: { argb: "FF64748B" } };
  sheet.getRow(1).height = 22;
}

/** Header, borders, frozen header row and filters. Text columns are left-aligned, numbers centred. */
function styleTable(sheet: ExcelJS.Worksheet, headerRow: number, lastRow: number, columns: number, textColumns: number[]) {
  const header = sheet.getRow(headerRow);
  header.height = 30;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = fill(HEADER_FILL);
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
  for (let r = headerRow + 1; r <= lastRow; r++) {
    for (let c = 1; c <= columns; c++) {
      const cell = sheet.getCell(r, c);
      cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
      cell.alignment = { vertical: "middle", horizontal: textColumns.includes(c) ? "left" : "center", ...cell.alignment };
    }
  }
  // Header stays visible while scrolling; filters on every column.
  sheet.views = [{ state: "frozen", ySplit: headerRow }];
  sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastRow, column: columns } };
}

export async function buildAttendanceWorkbook({ t, timezone, from, to, summary, days, dateFormat }: Input) {
  const book = new ExcelJS.Workbook();
  book.creator = "MarginFlow CRM Office";
  book.created = new Date();
  const period = t("period", { from, to });
  const time = (d: Date | null) => (d ? formatInTimeZone(d, timezone, "HH:mm") : "—");

  // --- Summary
  const s = book.addWorksheet(t("sheetSummary"));
  s.columns = [
    { key: "name", width: 26 },
    { key: "position", width: 24 },
    { key: "days", width: 14 },
    { key: "lateCount", width: 14 },
    { key: "lateMinutes", width: 16 },
    { key: "office", width: 16 },
    { key: "out", width: 16 },
  ];
  addTitle(s, t("titleSummary"), period, 7);
  s.getRow(4).values = [
    t("employee"),
    t("position"),
    t("daysWorked"),
    t("lateCount"),
    t("lateMinutesTotal"),
    t("hoursInOffice"),
    t("hoursOutside"),
  ];
  summary.forEach((row, i) => {
    const r = s.addRow([row.name, row.position, row.days, row.lateCount, row.lateMinutes, row.officeMs / MS_PER_DAY, row.outMs / MS_PER_DAY]);
    if (i % 2) r.eachCell((c) => (c.fill = fill(ZEBRA_FILL)));
    if (row.lateCount) r.getCell(4).font = { bold: true, color: { argb: "FFB91C1C" } };
  });
  const sumLast = s.rowCount;
  const total = s.addRow([
    t("total"),
    "",
    { formula: `SUM(C5:C${sumLast})` },
    { formula: `SUM(D5:D${sumLast})` },
    { formula: `SUM(E5:E${sumLast})` },
    { formula: `SUM(F5:F${sumLast})` },
    { formula: `SUM(G5:G${sumLast})` },
  ]);
  total.eachCell((c) => {
    c.font = { bold: true };
    c.fill = fill(TOTAL_FILL);
  });
  s.getColumn("lateCount").numFmt = MINUTES;
  s.getColumn("lateMinutes").numFmt = MINUTES;
  s.getColumn("office").numFmt = DURATION;
  s.getColumn("out").numFmt = DURATION;
  styleTable(s, 4, s.rowCount, 7, [1, 2]);
  s.autoFilter = { from: { row: 4, column: 1 }, to: { row: sumLast, column: 7 } }; // without the total row

  // --- By day
  const d = book.addWorksheet(t("sheetDays"));
  d.columns = [
    { key: "date", width: 13 },
    { key: "name", width: 26 },
    { key: "in", width: 11 },
    { key: "out", width: 11 },
    { key: "late", width: 14 },
    { key: "office", width: 14 },
    { key: "outside", width: 14 },
    { key: "exits", width: 40 },
  ];
  addTitle(d, t("titleDays"), period, 8);
  d.getRow(4).values = [
    t("date"),
    t("employee"),
    t("checkIn"),
    t("checkOut"),
    t("lateMinutes"),
    t("hoursInOffice"),
    t("hoursOutside"),
    t("exits"),
  ];
  for (const day of days) {
    const exits = day.exits
      .map((e) => `${e.reason ? t(`reason.${e.reason}`) : "—"} ${time(e.from)}–${e.to ? time(e.to) : "…"}`)
      .join("; ");
    const r = d.addRow([
      new Date(`${day.date}T00:00:00Z`),
      day.name,
      time(day.checkInAt),
      day.checkOutAt ? time(day.checkOutAt) : day.open ? t("stillWorking") : "—",
      day.lateMinutes,
      day.officeMs / MS_PER_DAY,
      day.outMs / MS_PER_DAY,
      exits,
    ]);
    if (day.isLate) {
      r.eachCell({ includeEmpty: true }, (c) => (c.fill = fill(LATE_FILL)));
      r.getCell(5).font = { bold: true, color: { argb: "FFB91C1C" } };
    }
    r.getCell(8).alignment = { wrapText: true, horizontal: "left" };
  }
  if (!days.length) {
    d.mergeCells(5, 1, 5, 8);
    d.getCell(5, 1).value = t("noData");
    d.getCell(5, 1).font = { italic: true, color: { argb: "FF64748B" } };
  }
  d.getColumn("date").numFmt = dateFormat;
  d.getColumn("late").numFmt = MINUTES;
  d.getColumn("office").numFmt = DURATION;
  d.getColumn("outside").numFmt = DURATION;
  styleTable(d, 4, d.rowCount, 8, [2, 8]);

  return Buffer.from(await book.xlsx.writeBuffer());
}
