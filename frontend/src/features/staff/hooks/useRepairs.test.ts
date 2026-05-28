import { describe, expect, it } from "vitest";
import { sanitizeImageUrl } from "./useRepairs";

describe("sanitizeImageUrl", () => {
  it.each([
    ["http URL", "http://example.com/image.jpg", "http://example.com/image.jpg"],
    ["https URL", "https://example.com/image.jpg", "https://example.com/image.jpg"],
    ["blob URL", "blob:http://localhost/blob-id", "blob:http://localhost/blob-id"],
    ["root-relative media path", "/media/repairs/photo.jpg", "/media/repairs/photo.jpg"],
    ["root path", "/", "/"],
  ])('allows %s', (_name, input, expected) => {
    expect(sanitizeImageUrl(input)).toBe(expected);
  });

  it.each([
    ["javascript URL", "javascript:alert(1)"],
    ["data URL", "data:image/svg+xml,<svg></svg>"],
    ["ftp URL", "ftp://example.com/image.jpg"],
    ["malformed http URL", "http://"],
    ["relative path without leading slash", "media/repairs/photo.jpg"],
    ["root-relative path with whitespace", "/media/repairs/photo 1.jpg"],
    ["empty string", ""],
  ])('rejects %s', (_name, input) => {
    expect(sanitizeImageUrl(input)).toBe("");
  });
});
