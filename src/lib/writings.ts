import overridesData from "../content/writings-seo-overrides.json";
import { siteConfig } from "./site";
import { fetchSubstackPosts, loadCachedPosts, saveCachedPosts, slugifySegment } from "./substack";
import type { SubstackPost, WritingsSeoOverride } from "./types";

export type WritingsSource = "live" | "cache" | "empty";

export interface WritingsResult {
  posts: SubstackPost[];
  source: WritingsSource;
}

const defaultOverrides = overridesData as WritingsSeoOverride[];

function trimToLength(value: string, maxLength: number): string {
  const normalized = value.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildDefaultSeoTitle(post: SubstackPost): string {
  return trimToLength(`${post.title} | ${siteConfig.name} Insights`, 70);
}

function buildDefaultSeoDescription(post: SubstackPost): string {
  const base = post.excerpt || siteConfig.description;
  return trimToLength(base, 155);
}

function buildOverrideMap(overrides: WritingsSeoOverride[]): Map<string, WritingsSeoOverride> {
  const map = new Map<string, WritingsSeoOverride>();

  for (const override of overrides) {
    if (!override.slug?.trim()) {
      continue;
    }

    map.set(slugifySegment(override.slug), override);
  }

  return map;
}

export function slugifyForUrl(value: string): string {
  return slugifySegment(value);
}

export function applyUniqueSlugs(posts: SubstackPost[]): SubstackPost[] {
  const counts = new Map<string, number>();

  return posts.map((post) => {
    const baseSlug = slugifySegment(post.slug || post.title || post.id);
    const currentCount = (counts.get(baseSlug) ?? 0) + 1;
    counts.set(baseSlug, currentCount);

    return {
      ...post,
      slug: currentCount === 1 ? baseSlug : `${baseSlug}-${currentCount}`,
    };
  });
}

export function enrichPostsForSeo(
  posts: SubstackPost[],
  overrides: WritingsSeoOverride[] = defaultOverrides
): SubstackPost[] {
  const overrideMap = buildOverrideMap(overrides);

  return applyUniqueSlugs(posts).map((post) => {
    const override = overrideMap.get(post.slug);
    const summary = override?.summary ?? post.summary ?? post.excerpt;

    return {
      ...post,
      coverImage: override?.coverImageOverride ?? post.coverImage,
      summary: trimToLength(summary || post.excerpt || siteConfig.description, 320),
      seoTitle: override?.seoTitle ?? buildDefaultSeoTitle(post),
      seoDescription: override?.seoDescription ?? buildDefaultSeoDescription(post),
      focusKeyword: override?.focusKeyword,
      indexable: override?.indexable ?? true,
    };
  });
}

export async function getPostsWithFallback(feedUrl: string, limit: number): Promise<WritingsResult> {
  try {
    const livePosts = await fetchSubstackPosts(feedUrl, limit);
    if (livePosts.length > 0) {
      const enriched = enrichPostsForSeo(livePosts).slice(0, limit);
      saveCachedPosts(enriched);
      return {
        posts: enriched,
        source: "live",
      };
    }
  } catch {
    // Fall back to local cache.
  }

  const cachedPosts = enrichPostsForSeo(loadCachedPosts()).slice(0, limit);
  if (cachedPosts.length > 0) {
    return {
      posts: cachedPosts,
      source: "cache",
    };
  }

  return {
    posts: [],
    source: "empty",
  };
}
