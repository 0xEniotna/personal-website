import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { XMLParser } from "fast-xml-parser";
import type { SubstackPost } from "./types";

const cachePath = fileURLToPath(new URL("../content/substack-cache.json", import.meta.url));

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function extractImageUrl(html: string): string | undefined {
  const imageMatch = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  return imageMatch?.[1];
}

function findUrlInNode(node: unknown): string | undefined {
  if (!node) {
    return undefined;
  }

  if (typeof node === "string") {
    return node.startsWith("http") ? node : undefined;
  }

  if (Array.isArray(node)) {
    for (const entry of node) {
      const url = findUrlInNode(entry);
      if (url) {
        return url;
      }
    }

    return undefined;
  }

  if (typeof node === "object") {
    const candidate = node as Record<string, unknown>;
    const directUrl = candidate.url ?? candidate.href ?? candidate.src ?? candidate["#text"];

    if (typeof directUrl === "string" && directUrl.startsWith("http")) {
      const mediaType = candidate.type;
      if (typeof mediaType === "string" && mediaType.length > 0 && !mediaType.includes("image")) {
        return undefined;
      }

      return directUrl;
    }
  }

  return undefined;
}

function extractCoverImage(rawItem: Record<string, unknown>, contentHtml: string): string | undefined {
  const rssMediaUrl =
    findUrlInNode(rawItem["media:thumbnail"]) ??
    findUrlInNode(rawItem["media:content"]) ??
    findUrlInNode(rawItem.enclosure) ??
    findUrlInNode(rawItem["itunes:image"]);

  return rssMediaUrl ?? extractImageUrl(contentHtml);
}

export function slugifySegment(value: string): string {
  const base = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return base.length > 0 ? base : "insight";
}

export function normalizeDate(dateLike: string | undefined): string {
  if (!dateLike) {
    return new Date(0).toISOString();
  }

  const parsed = new Date(dateLike);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0).toISOString();
  }

  return parsed.toISOString();
}

function normalizeItem(rawItem: Record<string, unknown>): SubstackPost {
  const contentHtml =
    (rawItem["content:encoded"] as string | undefined) ??
    (rawItem.description as string | undefined) ??
    "";

  const title = (rawItem.title as string | undefined)?.trim() || "Untitled";
  const url = (rawItem.link as string | undefined)?.trim() || "https://amecker.substack.com/";
  const guidCandidate = rawItem.guid;
  const id =
    typeof guidCandidate === "string"
      ? guidCandidate
      : (guidCandidate as { "#text"?: string } | undefined)?.["#text"] ??
        `${url}#${title.toLowerCase().replace(/\s+/g, "-")}`;

  const excerptSource =
    (rawItem.description as string | undefined) ||
    stripHtml(contentHtml).slice(0, 300);

  const excerpt = stripHtml(excerptSource).slice(0, 260);
  const fallbackSlugSeed = typeof id === "string" ? id : `${title}-${url}`;
  const slug = slugifySegment(title || fallbackSlugSeed);

  return {
    id,
    title,
    url,
    slug,
    publishedAt: normalizeDate(rawItem.pubDate as string | undefined),
    excerpt,
    author: (rawItem["dc:creator"] as string | undefined) || (rawItem.author as string | undefined),
    coverImage: extractCoverImage(rawItem, contentHtml),
  };
}

export function parseSubstackFeed(xml: string): SubstackPost[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    trimValues: true,
  });

  const parsed = parser.parse(xml);
  const items = toArray<Record<string, unknown>>(parsed?.rss?.channel?.item);

  return items
    .map((item) => normalizeItem(item))
    .filter((post) => Boolean(post.url && post.title))
    .sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1));
}

export async function fetchSubstackPosts(feedUrl: string, limit: number): Promise<SubstackPost[]> {
  const response = await fetch(feedUrl, {
    headers: {
      "user-agent": "mecker-capital-site/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Feed request failed with status ${response.status}`);
  }

  const xml = await response.text();
  return parseSubstackFeed(xml).slice(0, limit);
}

export function loadCachedPosts(): SubstackPost[] {
  try {
    const raw = readFileSync(cachePath, "utf-8");
    const parsed = JSON.parse(raw) as SubstackPost[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCachedPosts(posts: SubstackPost[]): void {
  const safePosts = posts.slice(0, 200);

  try {
    mkdirSync(dirname(cachePath), { recursive: true });
    writeFileSync(cachePath, `${JSON.stringify(safePosts, null, 2)}\n`, "utf-8");
  } catch {
    // Intentionally swallow cache write errors: site can still render.
  }
}

export function getCachePathForTests(): string {
  return cachePath;
}
