"use server";

import { redirect } from "next/navigation";
import { requireBusiness } from "@/lib/db";

const DEPARTMENTS = new Set(["invoice", "sales", "client", "property", "practice", "member"]);

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

export async function importDepartmentCsv(formData: FormData): Promise<void> {
  const { supabase, business } = await requireBusiness();
  const department = String(formData.get("department") ?? "");
  if (!DEPARTMENTS.has(department)) throw new Error("Invalid department");

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) throw new Error("CSV file is required");
  if (file.size > 2_000_000) throw new Error("CSV file must be smaller than 2 MB");

  const text = await file.text();
  const parsed = parseCsv(text.replace(/^\uFEFF/, ""));
  if (parsed.length < 2) throw new Error("CSV must include a header row and at least one record");

  const headers = parsed[0].map((header) => header.trim());
  const required = new Set(["title"]);
  for (const name of required) {
    if (!headers.includes(name)) throw new Error(`Missing required column: ${name}`);
  }

  const rows = parsed.slice(1, 1001).map((values) => {
    const row: Record<string, unknown> = { data: {} as Record<string, string> };
    headers.forEach((header, index) => {
      const value = (values[index] ?? "").trim();
      if (header.startsWith("data.")) {
        (row.data as Record<string, string>)[header.slice(5)] = value;
      } else {
        row[header] = value;
      }
    });
    return row;
  });

  const { data, error } = await supabase.rpc("import_tad_department_rows", {
    p_business_id: business.id,
    p_department: department,
    p_filename: file.name,
    p_rows: rows,
  });
  if (error) throw new Error(`Import failed: ${error.message}`);
  const result = data as { imported: number; skipped: number; batch_id: string };
  redirect(`/app/import?department=${department}&imported=${result.imported}&skipped=${result.skipped}&batch=${result.batch_id}`);
}
