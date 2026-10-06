"use client";

// Scans a product barcode with the camera, using the browser's own
// BarcodeDetector (Chrome on Android and some others). Browsers without it
// (e.g. Safari) type the number instead; the parent checks `canScanBarcodes()`.

import { useEffect, useRef, useState } from "react";

type DetectedBarcode = { rawValue: string };
type Detector = { detect(source: CanvasImageSource): Promise<DetectedBarcode[]> };
type DetectorClass = new (options?: { formats?: string[] }) => Detector;

const FORMATS = ["ean_13", "ean_8", "upc_a", "upc_e"];

function detectorClass(): DetectorClass | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector ?? null);
}

export function canScanBarcodes(): boolean {
  return detectorClass() !== null && !!navigator.mediaDevices?.getUserMedia;
}

export function BarcodeScanner({
  onCode,
  onStop,
}: {
  onCode: (code: string) => void;
  onStop: (message?: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("Opening the camera…");
  // Keep the latest callbacks without restarting the camera.
  const callbacks = useRef({ onCode, onStop });
  useEffect(() => {
    callbacks.current = { onCode, onStop };
  });

  useEffect(() => {
    const Detector = detectorClass();
    if (!Detector) return;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    let done = false;
    const stop = () => {
      done = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch (e) {
        callbacks.current.onStop(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Camera access is off. Type the barcode number instead."
            : "Ladle couldn’t open the camera. Type the barcode number instead.",
        );
        return;
      }
      if (done) return stop();
      const video = videoRef.current;
      if (!video) return stop();
      video.srcObject = stream;
      await video.play().catch(() => {});
      setStatus("Point the camera at the barcode.");
      const detector = new Detector({ formats: FORMATS });
      timer = setInterval(async () => {
        if (done || !video.videoWidth) return;
        try {
          const found = await detector.detect(video);
          const code = found.find((b) => /^\d{8,14}$/.test(b.rawValue))?.rawValue;
          if (code && !done) {
            stop();
            callbacks.current.onCode(code);
          }
        } catch {
          // A frame that couldn't be read: try the next one.
        }
      }, 300);
    })();
    return stop;
  }, []);

  return (
    <div>
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] bg-[#14110e]">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label="Camera viewfinder for the barcode"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-[12%] top-1/2 h-[30%] -translate-y-1/2 rounded-xl border-2 border-dashed border-white/70"
        />
      </div>
      <p className="text-body mt-2 text-ink-2" aria-live="polite">
        {status}
      </p>
      <button
        type="button"
        onClick={() => callbacks.current.onStop()}
        className="text-headline min-h-11 text-accent-strong"
      >
        Stop scanning
      </button>
    </div>
  );
}
