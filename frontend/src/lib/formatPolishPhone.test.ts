import { describe, expect, it } from "vitest";
import { formatPolishPhoneDisplay } from "./formatPolishPhone";

describe("formatPolishPhoneDisplay", () => {
  it("formats +48 with spaces (11 digits)", () => {
    expect(formatPolishPhoneDisplay("+48555100200")).toBe("+48 555 100 200");
    expect(formatPolishPhoneDisplay("48555100200")).toBe("+48 555 100 200");
  });

  it("formats 00 48 prefix", () => {
    expect(formatPolishPhoneDisplay("0048555100200")).toBe("+48 555 100 200");
  });

  it("formats national 9 digits with +48", () => {
    expect(formatPolishPhoneDisplay("555100200")).toBe("+48 555 100 200");
  });

  it("strips separators then formats", () => {
    expect(formatPolishPhoneDisplay("+48-555-100-200")).toBe("+48 555 100 200");
    expect(formatPolishPhoneDisplay("555 100 200")).toBe("+48 555 100 200");
  });

  it("handles leading 0 trunk (10 digits)", () => {
    expect(formatPolishPhoneDisplay("0555100200")).toBe("+48 555 100 200");
  });

  it("returns empty for null/empty", () => {
    expect(formatPolishPhoneDisplay(null)).toBe("");
    expect(formatPolishPhoneDisplay("")).toBe("");
    expect(formatPolishPhoneDisplay("   ")).toBe("");
  });

  it("groups non-PL long numbers in threes", () => {
    expect(formatPolishPhoneDisplay("491701234567")).toBe("491 701 234 567");
  });
});
