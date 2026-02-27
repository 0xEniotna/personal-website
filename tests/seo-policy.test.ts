import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getCanonicalUrl, normalizePath } from "../src/lib/site";

describe("seo policy", () => {
  it("normalizes canonical paths with trailing slash", () => {
    expect(normalizePath("/writings")).toBe("/writings/");
    expect(normalizePath("writings/2")).toBe("/writings/2/");
    expect(getCanonicalUrl("/projects")).toBe("https://mecker.capital/projects/");
  });

  it("sets noindex for legal pages and paginated writings", () => {
    const disclaimer = readFileSync(resolve(process.cwd(), "src/pages/legal/disclaimer.astro"), "utf-8");
    const privacy = readFileSync(resolve(process.cwd(), "src/pages/legal/privacy.astro"), "utf-8");
    const paginatedWritings = readFileSync(resolve(process.cwd(), "src/pages/writings/[page].astro"), "utf-8");
    const writingsIndex = readFileSync(resolve(process.cwd(), "src/pages/writings/index.astro"), "utf-8");

    expect(disclaimer).toContain('robots="noindex,follow"');
    expect(privacy).toContain('robots="noindex,follow"');
    expect(paginatedWritings).toContain('robots="noindex,follow"');
    expect(writingsIndex).not.toContain('robots="noindex,follow"');
  });
});
