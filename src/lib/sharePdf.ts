/**
 * PDF download + share for web browsers and the Capacitor Android APK.
 *
 * Web (Chrome, Safari, desktop):
 *   - Share: Web Share API with PDF file attachment when supported.
 *   - Download: `<a download>` (desktop) or open PDF tab (mobile browser).
 *
 * Android APK (Capacitor WebView):
 *   Web Share / blob download do not work reliably. We write the PDF to app
 *   cache via @capacitor/filesystem and open the native share sheet via
 *   @capacitor/share (WhatsApp, Gmail, Save to Files, etc.).
 *
 * PDF bytes always come from the same sources as before (same API routes /
 * same jsPDF generation) — only delivery to the device changes by platform.
 */

export type SharePdfResult = 'shared' | 'cancelled' | 'downloaded' | 'failed';

export interface SharePdfOptions {
  url: string;
  fileName: string;
  title: string;
  text?: string;
}

export interface SharePdfBlobOptions {
  blob: Blob;
  fileName: string;
  title: string;
  text?: string;
}

type DeliveryMode = 'share' | 'download';

function sanitizeFileName(name: string): string {
  const trimmed = name.trim() || 'report.pdf';
  const withExt = trimmed.toLowerCase().endsWith('.pdf') ? trimmed : `${trimmed}.pdf`;
  return withExt.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to read PDF blob'));
        return;
      }
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read PDF blob'));
    reader.readAsDataURL(blob);
  });
}

function asPdfBlob(blob: Blob): Blob {
  if (blob.type === 'application/pdf') return blob;
  return new Blob([blob], { type: 'application/pdf' });
}

async function isCapacitorNative(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const { Capacitor } = await import('@capacitor/core');
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod|Android/i.test(ua)) return true;
  return navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
}

/**
 * Capacitor: write PDF to cache and open the Android/iOS native share sheet.
 * "Download" uses the same sheet — user can pick Save to Files / Downloads.
 */
async function deliverPdfNative(
  blob: Blob,
  fileName: string,
  opts: { title: string; text?: string; mode: DeliveryMode }
): Promise<SharePdfResult> {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  const { Share } = await import('@capacitor/share');

  const safeName = sanitizeFileName(fileName);
  const base64 = await blobToBase64(asPdfBlob(blob));

  await Filesystem.writeFile({
    path: safeName,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });

  const { uri } = await Filesystem.getUri({
    path: safeName,
    directory: Directory.Cache,
  });

  try {
    await Share.share({
      title: opts.title,
      text: opts.text,
      url: uri,
      dialogTitle: opts.mode === 'download' ? 'Save PDF' : 'Share PDF',
    });
    return opts.mode === 'download' ? 'downloaded' : 'shared';
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('cancel') ||
      message.includes('abort') ||
      message.includes('dismiss')
    ) {
      return 'cancelled';
    }
    throw error;
  }
}

/** Web: save PDF via download link or open in a new tab on mobile browsers. */
function downloadPdfBlobWeb(blob: Blob, fileName: string): void {
  const pdfBlob = asPdfBlob(blob);
  const url = window.URL.createObjectURL(pdfBlob);

  if (isMobileBrowser()) {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => window.URL.revokeObjectURL(url), 120_000);
    return;
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = sanitizeFileName(fileName);
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
}

/** Download a PDF blob (routes to native share/save on Capacitor APK). */
export async function downloadPdfBlob(blob: Blob, fileName: string): Promise<void> {
  if (await isCapacitorNative()) {
    await deliverPdfNative(blob, fileName, {
      title: sanitizeFileName(fileName),
      mode: 'download',
    });
    return;
  }
  downloadPdfBlobWeb(blob, fileName);
}

/** Share a PDF blob (native sheet on APK, Web Share API in browser). */
export async function sharePdfBlob(options: SharePdfBlobOptions): Promise<SharePdfResult> {
  const { blob, fileName, title, text } = options;
  const pdfBlob = asPdfBlob(blob);
  const safeName = sanitizeFileName(fileName);

  if (await isCapacitorNative()) {
    return deliverPdfNative(pdfBlob, safeName, { title, text, mode: 'share' });
  }

  const file = new File([pdfBlob], safeName, {
    type: 'application/pdf',
    lastModified: Date.now(),
  });

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data?: ShareData) => Promise<void>;
  };

  if (typeof nav.share === 'function') {
    const payloads: ShareData[] = [{ files: [file] }, { files: [file], title, text }];
    for (const data of payloads) {
      try {
        if (typeof nav.canShare === 'function' && !nav.canShare(data)) continue;
        await nav.share(data);
        return 'shared';
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return 'cancelled';
        }
      }
    }
  }

  downloadPdfBlobWeb(pdfBlob, safeName);
  return 'downloaded';
}

/** Fetch PDF from API (same URL as download) and share it. */
export async function sharePdfFromUrl(options: SharePdfOptions): Promise<SharePdfResult> {
  const response = await fetch(options.url);
  if (!response.ok) {
    throw new Error(`Failed to generate PDF (status ${response.status})`);
  }
  const blob = await response.blob();
  return sharePdfBlob({
    blob,
    fileName: options.fileName,
    title: options.title,
    text: options.text,
  });
}

/** Fetch PDF from API and download it (native save sheet on APK). */
export async function downloadPdfFromUrl(options: SharePdfOptions): Promise<void> {
  const response = await fetch(options.url);
  if (!response.ok) {
    throw new Error(`Failed to generate PDF (status ${response.status})`);
  }
  const blob = await response.blob();
  await downloadPdfBlob(blob, options.fileName);
}
