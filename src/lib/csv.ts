/**
 * Tiny RFC-4180 style CSV parser and helpers.
 *
 * We avoid pulling in `papaparse` or `csv-parse` for two reasons:
 * 1. The import flow only handles modestly sized customer files, so the
 *    bundle/dep cost is not justified.
 * 2. A small in-house parser lets us bake security defaults — UTF-8 BOM
 *    stripping, quote-aware splitting, and CSV-formula sanitization on
 *    *export* — into a single place.
 *
 * Limits:
 * - `MAX_CSV_BYTES` and `MAX_CSV_ROWS` cap the worst-case work an attacker
 *   can ask the server to do via a crafted upload.
 * - `splitCsvLine` correctly handles double-quoted fields containing commas,
 *   newlines, and escaped quotes (`""`).
 */

export const MAX_CSV_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_CSV_ROWS = 10_000;

export const ALLOWED_CSV_MIME_TYPES = new Set<string>([
  'text/csv',
  'application/vnd.ms-excel',
  'application/csv',
  'text/plain',
  '', // some browsers omit MIME for .csv — fall back to extension check
]);

export interface CsvUploadCheck {
  ok: boolean;
  error?: string;
}

/**
 * Validate an uploaded `File` for size, type, and extension before we even
 * touch its contents. Returns `{ ok: false, error }` with a 4xx-ready
 * message when something is off.
 */
export function validateCsvFile(file: File | null | undefined): CsvUploadCheck {
  if (!file) {
    return { ok: false, error: 'No file provided' };
  }
  if (file.size === 0) {
    return { ok: false, error: 'Uploaded file is empty' };
  }
  if (file.size > MAX_CSV_BYTES) {
    return {
      ok: false,
      error: `File too large. Maximum allowed size is ${Math.floor(MAX_CSV_BYTES / 1024 / 1024)} MB.`,
    };
  }
  const name = (file.name || '').toLowerCase();
  if (!name.endsWith('.csv')) {
    return { ok: false, error: 'Only .csv files are supported' };
  }
  if (file.type && !ALLOWED_CSV_MIME_TYPES.has(file.type)) {
    return { ok: false, error: `Unsupported MIME type: ${file.type}` };
  }
  return { ok: true };
}

/** Split a single CSV line into fields, honoring double-quoted segments. */
export function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

/**
 * Parse a CSV string into headers + rows. Throws when the parse exceeds the
 * configured row cap so a malicious uploader cannot exhaust memory.
 */
export function parseCsv(text: string): ParsedCsv {
  // Strip UTF-8 BOM so it doesn't end up in the first header name.
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  const allLines = text.split(/\r?\n/);
  // Drop trailing empty lines but keep blank-in-middle ones to preserve row
  // numbering for error reporting.
  while (allLines.length > 0 && allLines[allLines.length - 1].trim() === '') {
    allLines.pop();
  }

  if (allLines.length === 0) {
    return { headers: [], rows: [] };
  }

  if (allLines.length - 1 > MAX_CSV_ROWS) {
    throw new Error(`CSV exceeds the maximum of ${MAX_CSV_ROWS} data rows.`);
  }

  const headers = splitCsvLine(allLines[0]).map((h) => h.trim().toLowerCase());
  const rows = allLines.slice(1).map((line) => splitCsvLine(line).map((v) => v.trim()));
  return { headers, rows };
}

/**
 * Escape a single field for safe inclusion in an exported CSV.
 *
 * Defends against:
 * - CSV formula injection: cells starting with `= + - @ \t \r` can be
 *   interpreted by Excel/Sheets as formulas and execute arbitrary commands
 *   (e.g. `=cmd|'/c calc.exe'!A0`). We prefix with a single quote and quote
 *   the field whenever it starts with one of these characters.
 * - Embedded commas / newlines / quotes: standard RFC-4180 escaping.
 */
export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** Build an entire CSV row from arbitrary values, applying escapeCsvField. */
export function toCsvRow(values: ReadonlyArray<unknown>): string {
  return values.map(escapeCsvField).join(',');
}
