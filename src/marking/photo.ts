import { MarkingError } from "./marking";

/** Formats the Claude vision API accepts. */
export const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

export type PhotoMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

/** Comfortably inside the API's per-request limit, and kind to phone data. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export interface HomeworkPhoto {
  mediaType: PhotoMediaType;
  /** The photo, base64 encoded, without the data URL prefix. */
  base64: string;
  /** The full data URL, for previewing the photo before it is sent. */
  dataUrl: string;
  bytes: number;
}

export function isAllowedMediaType(type: string): type is PhotoMediaType {
  return (ALLOWED_MEDIA_TYPES as readonly string[]).includes(type);
}

/** The part of `File` we need — a plain object stands in for it in tests. */
export interface PhotoFile {
  type: string;
  size: number;
}

/**
 * Check a photo before reading it. Returns a message for the learner, or null
 * when the photo is fine.
 */
export function photoProblem(file: PhotoFile): string | null {
  if (!isAllowedMediaType(file.type)) {
    return "Mochi can only read JPEG, PNG, GIF or WebP photos.";
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return `That photo is too big — please keep it under ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)}MB.`;
  }
  if (file.size === 0) {
    return "That photo seems to be empty.";
  }
  return null;
}

function splitDataUrl(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma === -1 ? "" : dataUrl.slice(comma + 1);
}

/**
 * Read a chosen photo into the form the marking endpoint expects. Rejects with
 * a `MarkingError` the UI can show as-is.
 */
export function readPhoto(file: File): Promise<HomeworkPhoto> {
  const problem = photoProblem(file);
  if (problem !== null) {
    return Promise.reject(new MarkingError(problem));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new MarkingError("Mochi could not open that photo."));
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const base64 = splitDataUrl(dataUrl);
      if (base64 === "") {
        reject(new MarkingError("Mochi could not open that photo."));
        return;
      }
      resolve({
        mediaType: file.type as PhotoMediaType,
        base64,
        dataUrl,
        bytes: file.size,
      });
    };
    reader.readAsDataURL(file);
  });
}
