/**
 * Client-side helper to share a server-generated PDF via the native share
 * sheet (WhatsApp, Email, Bluetooth, ...) using the Web Share API.
 *
 * Behaviour:
 * - Fetches the PDF from the same API endpoint the download buttons use, so
 *   whatever filters (e.g. date range) are in the URL apply to the shared file.
 * - If the browser can share files (mobile browsers, Chrome/Edge on Windows,
 *   Safari), the OS share sheet opens with the PDF attached.
 * - If the user closes the share sheet, nothing else happens.
 * - If file sharing is not supported (e.g. Firefox desktop), the PDF is
 *   downloaded instead so the user can attach it manually — the action never
 *   silently fails.
 */

export type SharePdfResult = 'shared' | 'cancelled' | 'downloaded' | 'failed';

export interface SharePdfOptions {
  /** API URL that returns the PDF (query params included). */
  url: string;
  /** File name for the shared/downloaded PDF, e.g. "Report.pdf". */
  fileName: string;
  /** Title shown by the share sheet. */
  title: string;
  /** Optional message accompanying the file on platforms that support it. */
  text?: string;
}

/**
 * Download a blob as a file, mobile-safe.
 *
 * IMPORTANT: the object URL must NOT be revoked synchronously after click().
 * Mobile browsers (iOS Safari, Chrome Android) start the download
 * asynchronously, and revoking immediately aborts it silently. Revoke on a
 * delay instead.
 */
export function downloadPdfBlob(blob: Blob, fileName: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}

export interface SharePdfBlobOptions {
  /** Already-generated PDF blob (e.g. from client-side jsPDF `doc.output('blob')`). */
  blob: Blob;
  fileName: string;
  title: string;
  text?: string;
}

/** Share an in-memory PDF blob via the native share sheet, with download fallback. */
export async function sharePdfBlob(options: SharePdfBlobOptions): Promise<SharePdfResult> {
  const { blob, fileName, title, text } = options;
  const file = new File([blob], fileName, { type: 'application/pdf' });

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };

  if (typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, text });
      return 'shared';
    } catch (error) {
      // User dismissed the share sheet — not an error.
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled';
      }
      // Share sheet failed (e.g. lost user-gesture window) — fall back to download.
      downloadPdfBlob(blob, fileName);
      return 'downloaded';
    }
  }

  // Browser cannot share files — download instead so the user can attach it manually.
  downloadPdfBlob(blob, fileName);
  return 'downloaded';
}

/** Fetch a PDF from an API endpoint and share it via the native share sheet. */
export async function sharePdfFromUrl(options: SharePdfOptions): Promise<SharePdfResult> {
  const { url, fileName, title, text } = options;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to generate PDF (status ${response.status})`);
  }
  const blob = await response.blob();
  return sharePdfBlob({ blob, fileName, title, text });
}
