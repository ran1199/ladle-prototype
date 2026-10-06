"use client";

// Reads the text on a recipe photo, on the device, with Tesseract.js.
// The library (about 28 MB with its English data) is only downloaded the first
// time someone imports a recipe photo, from Ladle's own site (/tesseract).

export type OcrResult = {
  text: string;
  /** Tesseract's own confidence, 0–100. */
  confidence: number;
};

const MAX_EDGE = 1600;

/** Downscales a photo (text reads best at about 1,600 px) and returns it as a canvas. */
async function prepare(file: Blob): Promise<HTMLCanvasElement | Blob> {
  if (typeof createImageBitmap !== "function") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/** Reads a recipe photo. `onProgress` gets 0–1 while the reader loads and works. */
export async function readRecipePhoto(
  file: Blob,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<OcrResult> {
  onProgress?.(0.02);
  const [{ createWorker }, image] = await Promise.all([import("tesseract.js"), prepare(file)]);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

  const worker = await createWorker("eng", 1, {
    workerPath: "/tesseract/worker.min.js",
    corePath: "/tesseract/core",
    langPath: "/tesseract/lang",
    logger: (m) => {
      // Loading takes about the first 30%, reading the text the rest.
      if (m.status === "recognizing text") onProgress?.(0.3 + 0.7 * m.progress);
      else onProgress?.(Math.min(0.3, 0.05 + 0.25 * m.progress));
    },
  });
  const stop = () => void worker.terminate();
  signal?.addEventListener("abort", stop, { once: true });
  try {
    const { data } = await worker.recognize(image);
    onProgress?.(1);
    return { text: data.text, confidence: data.confidence };
  } finally {
    signal?.removeEventListener("abort", stop);
    void worker.terminate();
  }
}
