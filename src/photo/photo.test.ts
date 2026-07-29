import { describe, expect, it } from "vitest";
import {
  isAllowedMediaType,
  MAX_PHOTO_BYTES,
  PhotoError,
  photoProblem,
  readPhoto,
} from "./photo";

function fakeFile(type: string, contents = "homework"): File {
  return new File([contents], "homework.jpg", { type });
}

describe("isAllowedMediaType", () => {
  it("accepts the formats the vision API reads", () => {
    expect(isAllowedMediaType("image/jpeg")).toBe(true);
    expect(isAllowedMediaType("image/png")).toBe(true);
    expect(isAllowedMediaType("image/webp")).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isAllowedMediaType("application/pdf")).toBe(false);
    expect(isAllowedMediaType("image/heic")).toBe(false);
    expect(isAllowedMediaType("")).toBe(false);
  });
});

describe("photoProblem", () => {
  it("passes a normal photo", () => {
    expect(photoProblem({ type: "image/jpeg", size: 1024 })).toBeNull();
  });

  it("explains an unsupported format", () => {
    expect(photoProblem({ type: "application/pdf", size: 1024 })).toMatch(/JPEG, PNG/i);
  });

  it("explains a photo that is too big", () => {
    expect(photoProblem({ type: "image/jpeg", size: MAX_PHOTO_BYTES + 1 })).toMatch(/too big/i);
  });

  it("accepts a photo right on the size limit", () => {
    expect(photoProblem({ type: "image/jpeg", size: MAX_PHOTO_BYTES })).toBeNull();
  });

  it("explains an empty file", () => {
    expect(photoProblem({ type: "image/png", size: 0 })).toMatch(/empty/i);
  });
});

describe("readPhoto", () => {
  it("reads a photo into base64 plus a preview URL", async () => {
    const photo = await readPhoto(fakeFile("image/png"));

    expect(photo.mediaType).toBe("image/png");
    expect(photo.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
    expect(photo.base64).not.toContain(",");
    expect(atob(photo.base64)).toBe("homework");
    expect(photo.bytes).toBe("homework".length);
  });

  it("refuses a photo that fails the checks, without reading it", async () => {
    await expect(readPhoto(fakeFile("application/pdf"))).rejects.toBeInstanceOf(PhotoError);
    await expect(readPhoto(fakeFile("application/pdf"))).rejects.toThrow(/JPEG, PNG/i);
  });
});
