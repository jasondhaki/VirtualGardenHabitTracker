import { describe, expect, it, vi } from "vitest";
import { generateUniqueUsername, slugifyUsername } from "./username";

describe("slugifyUsername", () => {
  it("lowercases and strips non-alphanumerics", () => {
    expect(slugifyUsername("Jane.Doe+gardens@example.com".split("@")[0])).toBe("janedoegardens");
  });

  it("falls back to a fixed word for a symbols-only seed", () => {
    expect(slugifyUsername("!!!...")).toBe("gardener");
  });

  it("falls back to a fixed word for a seed with no ASCII letters or digits", () => {
    expect(slugifyUsername("日本語")).toBe("gardener");
  });

  it("truncates very long seeds", () => {
    expect(slugifyUsername("a".repeat(50)).length).toBe(20);
  });

  it("is deterministic for the same seed", () => {
    expect(slugifyUsername("mixedCASE123")).toBe(slugifyUsername("mixedCASE123"));
  });
});

describe("generateUniqueUsername", () => {
  it("returns the bare slug when it's free", async () => {
    const client = { user: { findUnique: vi.fn().mockResolvedValue(null) } };
    const username = await generateUniqueUsername(client as never, "jane");
    expect(username).toBe("jane");
    expect(client.user.findUnique).toHaveBeenCalledTimes(1);
  });

  it("appends a suffix on collision and retries until free", async () => {
    const findUnique = vi
      .fn()
      .mockResolvedValueOnce({ id: "existing-1" })
      .mockResolvedValueOnce({ id: "existing-2" })
      .mockResolvedValueOnce(null);
    const client = { user: { findUnique } };

    const username = await generateUniqueUsername(client as never, "jane");
    expect(username).toMatch(/^jane-\d{4}$/);
    expect(findUnique).toHaveBeenCalledTimes(3);
  });
});
