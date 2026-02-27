import { afterEach, describe, expect, it, vi } from "vitest";
import * as substackModule from "../src/lib/substack";
import type { SubstackPost, WritingsSeoOverride } from "../src/lib/types";
import { enrichPostsForSeo, getPostsWithFallback, slugifyForUrl } from "../src/lib/writings";

const samplePost: SubstackPost = {
  id: "abc",
  title: "Sample",
  url: "https://amecker.substack.com/p/sample",
  slug: "sample",
  publishedAt: new Date("2026-02-11").toISOString(),
  excerpt: "hello",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("writings fallback", () => {
  it("returns live posts when feed succeeds", async () => {
    vi.spyOn(substackModule, "fetchSubstackPosts").mockResolvedValue([samplePost]);
    const saveSpy = vi.spyOn(substackModule, "saveCachedPosts").mockImplementation(() => undefined);

    const result = await getPostsWithFallback("https://example.com/feed", 6);

    expect(result.source).toBe("live");
    expect(result.posts[0]).toMatchObject({
      id: samplePost.id,
      slug: samplePost.slug,
      title: samplePost.title,
    });
    expect(result.posts[0]?.seoTitle).toContain(samplePost.title);
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to cache when feed fails", async () => {
    vi.spyOn(substackModule, "fetchSubstackPosts").mockRejectedValue(new Error("network"));
    vi.spyOn(substackModule, "loadCachedPosts").mockReturnValue([samplePost]);

    const result = await getPostsWithFallback("https://example.com/feed", 6);

    expect(result.source).toBe("cache");
    expect(result.posts[0]).toMatchObject({ slug: "sample" });
  });

  it("returns empty when both feed and cache are unavailable", async () => {
    vi.spyOn(substackModule, "fetchSubstackPosts").mockRejectedValue(new Error("network"));
    vi.spyOn(substackModule, "loadCachedPosts").mockReturnValue([]);

    const result = await getPostsWithFallback("https://example.com/feed", 6);

    expect(result.source).toBe("empty");
    expect(result.posts).toEqual([]);
  });
});

describe("seo enrichment", () => {
  it("creates deterministic collision-safe slugs", () => {
    const duplicatePosts: SubstackPost[] = [
      { ...samplePost, id: "a1", title: "Alpha Pair", slug: "alpha-pair" },
      { ...samplePost, id: "a2", title: "Alpha Pair", slug: "alpha-pair" },
    ];

    const enriched = enrichPostsForSeo(duplicatePosts, []);

    expect(enriched[0]?.slug).toBe("alpha-pair");
    expect(enriched[1]?.slug).toBe("alpha-pair-2");
  });

  it("applies SEO overrides after slug normalization", () => {
    const duplicatePosts: SubstackPost[] = [
      { ...samplePost, id: "a1", title: "Alpha Pair", slug: "alpha-pair" },
      { ...samplePost, id: "a2", title: "Alpha Pair", slug: "alpha-pair" },
    ];

    const overrides: WritingsSeoOverride[] = [
      {
        slug: "alpha-pair-2",
        seoTitle: "Custom SEO Title",
        seoDescription: "Custom SEO Description",
        indexable: false,
      },
    ];

    const enriched = enrichPostsForSeo(duplicatePosts, overrides);

    expect(enriched[1]?.seoTitle).toBe("Custom SEO Title");
    expect(enriched[1]?.seoDescription).toBe("Custom SEO Description");
    expect(enriched[1]?.indexable).toBe(false);
  });

  it("slugify helper is stable", () => {
    expect(slugifyForUrl("Étude Macro 2026!")).toBe("etude-macro-2026");
  });
});
