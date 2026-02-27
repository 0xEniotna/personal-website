import { describe, expect, it } from "vitest";
import { portfolioData } from "../src/lib/content";

describe("portfolio content", () => {
  it("contains all required strategy buckets", () => {
    const slugs = portfolioData.map((item) => item.slug);

    expect(slugs).toContain("china-equities");
    expect(slugs).toContain("us-equities");
    expect(slugs).toContain("europe-export-leaders");
    expect(slugs).toContain("crypto-core");
    expect(slugs).toContain("commodities-precious");
    expect(slugs).toContain("uranium-nuclear");
  });
});
