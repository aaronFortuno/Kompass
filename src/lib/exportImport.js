import { ExportFileSchema } from '@/lib/schemas/exportFile.js';

/*
 * Utilitats d'exportació/importació de UserProgress.
 *
 * - serializeProgress(snapshot, { appVersion }) → Object ExportFile.
 *   Retorna un objecte compatible amb DATA-MODEL §3.7, llest per a
 *   `JSON.stringify`. No inclou `ephemeralResults` (el caller passa
 *   directament el snapshot persistit via `exportSnapshot()` del store).
 *
 * - deserializeProgress(fileContent) → { ok: true, progress } | { ok: false, error }
 *   Accepta tant un string JSON com un objecte ja parsejat. Valida amb
 *   Zod. Si falla, retorna error amb missatge curt; el caller decideix
 *   com mostrar-lo.
 */

export const EXPORT_FILE_VERSION = 1;
export const EXPORT_FILE_TYPE = 'userProgressExport';

export function serializeProgress(progressSnapshot, { appVersion = '0.0.0' } = {}) {
  return {
    schemaVersion: EXPORT_FILE_VERSION,
    type: EXPORT_FILE_TYPE,
    exportedAt: new Date().toISOString(),
    appVersion,
    progress: progressSnapshot,
  };
}

export function deserializeProgress(fileContent) {
  let raw;
  if (typeof fileContent === 'string') {
    try {
      raw = JSON.parse(fileContent);
    } catch (err) {
      return {
        ok: false,
        errorCode: 'invalid-json',
        errorMessage: err.message,
      };
    }
  } else if (fileContent && typeof fileContent === 'object') {
    raw = fileContent;
  } else {
    return {
      ok: false,
      errorCode: 'empty',
      errorMessage: 'Empty file content',
    };
  }

  const parsed = ExportFileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const path = issue.path.join('.') || '(arrel)';
    return {
      ok: false,
      errorCode: 'schema',
      errorMessage: `${path}: ${issue.message}`,
    };
  }

  return { ok: true, data: parsed.data, progress: parsed.data.progress };
}

/**
 * Descarrega un objecte com a fitxer JSON via Blob + anchor dinàmic.
 * Retorna el nom del fitxer generat.
 */
export function downloadJson(payload, filename) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return filename;
}

/**
 * Format "kompass-progress-YYYYMMDD-HHmm.json" en local time.
 * L'export sempre usa UTC al camp `exportedAt`; el nom de fitxer és
 * només per llegibilitat.
 */
export function buildExportFilename(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const stamp =
    `${date.getFullYear()}` +
    `${pad(date.getMonth() + 1)}` +
    `${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `kompass-progress-${stamp}.json`;
}
