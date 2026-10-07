"use client";

// The plate photo being logged (F5, F8). It is saved in the browser *before*
// analysis starts, so nothing is lost if the network fails or the app closes.
// It is deleted once the meal is logged: Ladle doesn't keep plate photos, unless
// the user chooses to use one as the recipe's photo ("Use this photo for the recipe?").

import type { PlateAnalysis } from "./ai/schemas";
import { DEMO_PLATE, OLD_DEMO_PLATE_SRC } from "./ai/scripted";
import { storage } from "./storage";
import type { PhotoColor } from "./types";

const KEY = "ladle:plate:v1";

/** The plate analysis (same shape every AI engine returns). */
export type PlateResult = PlateAnalysis;

export type PendingPlate = {
  id: string;
  takenAt: string;
  photo: { src: string; alt: string; isSample: boolean; color?: PhotoColor };
  status: "analyzing" | "failed" | "ready";
  /** Null while analyzing. */
  result: PlateResult | null;
};

export function getPlate(): PendingPlate | null {
  const plate = storage.get<PendingPlate>(KEY);
  // The sample photo was renamed; a photo saved by an older version still shows.
  if (plate?.photo.src === OLD_DEMO_PLATE_SRC) {
    return { ...plate, photo: { ...plate.photo, src: DEMO_PLATE.src, alt: DEMO_PLATE.alt } };
  }
  return plate;
}

export function savePlate(plate: PendingPlate): void {
  storage.set(KEY, plate);
}

export function clearPlate(): void {
  storage.remove(KEY);
}

export function newPlate(photo: PendingPlate["photo"]): PendingPlate {
  const plate: PendingPlate = {
    id: `plate-${Date.now().toString(36)}`,
    takenAt: new Date().toISOString(),
    photo,
    status: "analyzing",
    result: null,
  };
  savePlate(plate);
  return plate;
}

const MAX_EDGE = 1200;

/** Downscales an image to about 1,200 px (or `maxEdge`) on the long edge and returns a JPEG data URL. */
export async function downscale(
  source: CanvasImageSource,
  width: number,
  height: number,
  maxEdge = MAX_EDGE,
) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** Reads a chosen photo file and downscales it. Rejects anything that isn't an image or is over 10 MB. */
export async function readPhotoFile(file: File, maxEdge = MAX_EDGE): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not-image");
  if (file.size > 10 * 1024 * 1024) throw new Error("too-big");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return await downscale(img, img.naturalWidth, img.naturalHeight, maxEdge);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Shrinks an image (URL or data URL) to `maxEdge` px, e.g. to store a small copy. */
export async function shrinkImage(src: string, maxEdge: number): Promise<string> {
  const img = new Image();
  img.src = src;
  await img.decode();
  return downscale(img, img.naturalWidth, img.naturalHeight, maxEdge);
}

/**
 * The photo's average colour, measured on an 8×8 copy. Plate matching uses it
 * as a light hint (a similar-looking photo of the same dish logged before).
 */
export async function averageColor(src: string): Promise<PhotoColor | undefined> {
  try {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, 8, 8);
    const px = ctx.getImageData(0, 0, 8, 8).data;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = 0; i < px.length; i += 4) {
      r += px[i];
      g += px[i + 1];
      b += px[i + 2];
    }
    const n = px.length / 4;
    return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
  } catch {
    return undefined;
  }
}

/** A photo (data URL or same-site URL) as a Blob, for the AI engine. */
export async function photoBlob(src: string): Promise<Blob> {
  const res = await fetch(src);
  return res.blob();
}
