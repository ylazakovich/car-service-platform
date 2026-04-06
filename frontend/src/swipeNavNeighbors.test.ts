import { describe, expect, it } from "vitest";
import { getSwipeNavNeighborLabels } from "./swipeNavNeighbors";

describe("getSwipeNavNeighborLabels", () => {
  const labels = {
    a: "Alpha",
    b: "Beta",
    c: "Gamma",
  } as const;

  it("returns both neighbors in the middle", () => {
    expect(getSwipeNavNeighborLabels(["a", "b", "c"], "b", labels)).toEqual({
      prevLabel: "Alpha",
      nextLabel: "Gamma",
    });
  });

  it("returns null prev on first section", () => {
    expect(getSwipeNavNeighborLabels(["a", "b"], "a", labels)).toEqual({
      prevLabel: null,
      nextLabel: "Beta",
    });
  });

  it("returns null next on last section", () => {
    expect(getSwipeNavNeighborLabels(["a", "b"], "b", labels)).toEqual({
      prevLabel: "Alpha",
      nextLabel: null,
    });
  });

  it("returns nulls when active is not in list", () => {
    expect(getSwipeNavNeighborLabels(["a", "b"], "z" as "a", labels)).toEqual({
      prevLabel: null,
      nextLabel: null,
    });
  });
});
