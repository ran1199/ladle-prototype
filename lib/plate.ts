"use client";

// The plate photo being logged (F5, F8). It is saved in the browser *before*
// analysis starts, so nothing is lost if the network fails or the app closes.
// It is deleted once the meal is logged: Ladle doesn't keep plate photos.

import { storage } from "./storage";

const KEY = "ladle:plate:v1";

/** Same shape the Milestone 6 /api/analyze-plate route returns (plus the Demo-only rough guess). */
export type PlateResult = {
  matchRecipeId: string | null;
  matchConfidence: number;
  alternatives: string[];
  portionServings: number;
  portionReason: string;
  isNewFood: boolean;
  /** A photo-only guess, for "It's something new". */
  roughGuess?: { name: string; kcal: number } | null;
  /** The dish looks like a recipe the user could import (Demo: the stir-fry before T1). */
  suggestImport?: boolean;
};

export type PendingPlate = {
  id: string;
  takenAt: string;
  photo: { src: string; alt: string; isSample: boolean };
  status: "analyzing" | "failed" | "ready";
  /** Null while analyzing, or when Demo mode can't analyze the user's own photo. */
  result: PlateResult | null;
};

export function getPlate(): PendingPlate | null {
  return storage.get<PendingPlate>(KEY);
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

/** Downscales an image to about 1,200 px on the long edge and returns a JPEG data URL. */
export async function downscale(source: CanvasImageSource, width: number, height: number) {
  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** Reads a chosen photo file and downscales it. Rejects anything that isn't an image or is over 10 MB. */
export async function readPhotoFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("not-image");
  if (file.size > 10 * 1024 * 1024) throw new Error("too-big");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return await downscale(img, img.naturalWidth, img.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
}
