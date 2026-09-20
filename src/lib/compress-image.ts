// Browser-side image compressor using <canvas>.
// - Downscales to maxDim on the longest edge
// - Re-encodes as JPEG with iterative quality reduction until <= maxBytes
// - Returns a new File (keeps original if it's already small enough and not oversized)

export async function compressImage(
  file: File,
  opts: { maxDim?: number; maxBytes?: number; mimeType?: string } = {},
): Promise<File> {
  const maxDim = opts.maxDim ?? 1600;
  const maxBytes = opts.maxBytes ?? 500 * 1024; // 500 KB
  const mimeType = opts.mimeType ?? "image/jpeg";

  // Skip non-images (e.g. gif animations) — return as-is
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif") return file;

  const bitmap = await loadBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxDim);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);

  let quality = 0.85;
  let blob = await canvasToBlob(canvas, mimeType, quality);
  while (blob && blob.size > maxBytes && quality > 0.4) {
    quality -= 0.1;
    blob = await canvasToBlob(canvas, mimeType, quality);
  }
  if (!blob) return file;

  // If compression made it larger than the original AND original is already small, keep original
  if (blob.size >= file.size && file.size <= maxBytes) return file;

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], newName, { type: mimeType, lastModified: Date.now() });
}

function fitWithin(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h };
  const ratio = w > h ? max / w : max / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === "function") {
    try { return await createImageBitmap(file); } catch { /* fall through */ }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

export const MAX_ROOMS_PER_HOTEL = 5;
export const MAX_IMAGES_PER_ROOM = 5;
export const MAX_HOTELS_PER_ADMIN = 1;
