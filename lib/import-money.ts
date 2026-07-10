export type ImportKind = "quotes" | "invoices";

export interface ParsedMoneyRow {
  sourceLine: number;
  number: string;
  customerName: string;
  phone: string | null;
  amount: number;
  description: string | null;
  sentDate: string | null;
  sentDaysAgo: number | null;
  dueDate: string | null;
  errors: string[];
}

const QUOTE_ALIASES: Record<string, keyof ParsedMoneyRow> = {
  quote: "number",
  quote_number: "number",
  quote_no: "number",
  quote_number_: "number",
  number: "number",
  no: "number",
  customer: "customerName",
  customer_name: "customerName",
  client: "customerName",
  client_name: "customerName",
  name: "customerName",
  phone: "phone",
  mobile: "phone",
  whatsapp: "phone",
  amount: "amount",
  value: "amount",
  total: "amount",
  sent: "sentDate",
  sent_date: "sentDate",
  date_sent: "sentDate",
  date: "sentDate",
  sent_days_ago: "sentDaysAgo",
  days_ago: "sentDaysAgo",
  age: "sentDaysAgo",
  description: "description",
  notes: "description",
  work: "description",
};

const INVOICE_ALIASES: Record<string, keyof ParsedMoneyRow> = {
  invoice: "number",
  invoice_number: "number",
  invoice_no: "number",
  number: "number",
  no: "number",
  customer: "customerName",
  customer_name: "customerName",
  client: "customerName",
  client_name: "customerName",
  name: "customerName",
  phone: "phone",
  mobile: "phone",
  whatsapp: "phone",
  amount: "amount",
  value: "amount",
  total: "amount",
  due: "dueDate",
  due_date: "dueDate",
  date_due: "dueDate",
  date: "dueDate",
  description: "description",
  notes: "description",
  work: "description",
};

export function parseImportText(text: string, kind: ImportKind): ParsedMoneyRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 101);

  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const first = splitLine(lines[0], delimiter);
  const headerMap = detectHeader(first, kind);
  const dataLines = headerMap ? lines.slice(1) : lines;

  return dataLines.slice(0, 100).map((line, index) => {
    const cells = splitLine(line, delimiter).map((cell) => cell.trim());
    const row = emptyRow((headerMap ? index + 2 : index + 1));

    if (headerMap) {
      cells.forEach((cell, cellIndex) => {
        const key = headerMap[cellIndex];
        if (key) assign(row, key, cell);
      });
    } else if (kind === "quotes") {
      assign(row, "number", cells[0] ?? "");
      assign(row, "customerName", cells[1] ?? "");
      assign(row, "amount", cells[2] ?? "");
      assign(row, looksLikeNumber(cells[3]) ? "sentDaysAgo" : "sentDate", cells[3] ?? "");
      assign(row, "phone", cells[4] ?? "");
      assign(row, "description", cells.slice(5).join(" "));
    } else {
      assign(row, "number", cells[0] ?? "");
      assign(row, "customerName", cells[1] ?? "");
      assign(row, "amount", cells[2] ?? "");
      assign(row, "dueDate", cells[3] ?? "");
      assign(row, "phone", cells[4] ?? "");
      assign(row, "description", cells.slice(5).join(" "));
    }

    validate(row, kind);
    return row;
  });
}

export function importExample(kind: ImportKind): string {
  return kind === "quotes"
    ? [
        "number,customer,amount,sent_days_ago,phone,description",
        "QT-104,Thabo Mokoena,8500,9,0712345678,Gate motor quote",
        "QT-105,Nomsa Dlamini,12500,4,0823456789,Kitchen renovation quote",
      ].join("\n")
    : [
        "number,customer,amount,due_date,phone,description",
        "INV-088,Kruger Plant Hire,6200,2026-07-01,0712345678,Repair call-out",
        "INV-089,Nomsa Dlamini,3200,2026-07-05,0823456789,Deposit balance",
      ].join("\n");
}

function emptyRow(sourceLine: number): ParsedMoneyRow {
  return {
    sourceLine,
    number: "",
    customerName: "",
    phone: null,
    amount: 0,
    description: null,
    sentDate: null,
    sentDaysAgo: null,
    dueDate: null,
    errors: [],
  };
}

function assign(row: ParsedMoneyRow, key: keyof ParsedMoneyRow, value: string): void {
  const v = value.trim();
  if (!v) return;
  if (key === "amount") row.amount = parseMoney(v);
  else if (key === "sentDaysAgo") row.sentDaysAgo = parseInt(v.replace(/[^\d-]/g, ""), 10);
  else if (key === "sentDate") row.sentDate = normalizeDate(v);
  else if (key === "dueDate") row.dueDate = normalizeDate(v);
  else if (key === "phone") row.phone = v.slice(0, 50);
  else if (key === "description") row.description = v.slice(0, 500);
  else if (key === "number") row.number = v.slice(0, 60);
  else if (key === "customerName") row.customerName = v.slice(0, 200);
}

function validate(row: ParsedMoneyRow, kind: ImportKind): void {
  if (!row.number) row.errors.push(kind === "quotes" ? "Missing quote number" : "Missing invoice number");
  if (!row.customerName) row.errors.push("Missing customer name");
  if (!row.amount || row.amount < 0) row.errors.push("Missing or invalid amount");
  if (kind === "quotes" && !row.sentDate && row.sentDaysAgo === null) {
    row.errors.push("Add sent_date or sent_days_ago");
  }
  if (kind === "invoices" && !row.dueDate) row.errors.push("Missing due_date");
}

function detectHeader(cells: string[], kind: ImportKind): Array<keyof ParsedMoneyRow | null> | null {
  const aliases = kind === "quotes" ? QUOTE_ALIASES : INVOICE_ALIASES;
  const mapped = cells.map((cell) => aliases[normalizeHeader(cell)] ?? null);
  const hits = mapped.filter(Boolean).length;
  return hits >= 2 ? mapped : null;
}

function normalizeHeader(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[#().]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function detectDelimiter(line: string): string {
  if (line.includes("\t")) return "\t";
  const comma = (line.match(/,/g) ?? []).length;
  const semi = (line.match(/;/g) ?? []).length;
  return semi > comma ? ";" : ",";
}

function splitLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === delimiter && !quoted) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

function parseMoney(value: string): number {
  const cleaned = value.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  const parsed = parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeDate(value: string): string | null {
  const v = value.trim();
  if (!v) return null;

  const iso = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;

  const local = v.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
  if (local) {
    const year = local[3].length === 2 ? `20${local[3]}` : local[3];
    return `${year}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
  }

  const parsed = new Date(v);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function looksLikeNumber(value: string | undefined): boolean {
  return Boolean(value && /^\s*-?\d+\s*$/.test(value));
}
