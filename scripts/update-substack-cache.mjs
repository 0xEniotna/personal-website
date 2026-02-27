import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { XMLParser } from "fast-xml-parser";

const feedUrl = process.env.SUBSTACK_FEED_URL || "https://amecker.substack.com/feed";
const cacheFilePath = resolve(process.cwd(), "src/content/substack-cache.json");

function toArray(value) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDate(dateLike) {
  const parsed = new Date(dateLike || "");
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0).toISOString();
  }

  return parsed.toISOString();
}

function slugifySegment(value) {
  const base = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

  return base.length > 0 ? base : "insight";
}

function extractImageUrl(html) {
  const imageMatch = String(html || "").match(/<img[^>]*src=["']([^"']+)["'][^>]*>/i);
  return imageMatch?.[1];
}

function findUrlInNode(node) {
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
    const directUrl = node.url || node.href || node.src || node["#text"];
    if (typeof directUrl === "string" && directUrl.startsWith("http")) {
      if (typeof node.type === "string" && node.type.length > 0 && !node.type.includes("image")) {
        return undefined;
      }

      return directUrl;
    }
  }

  return undefined;
}

function extractCoverImage(item, html) {
  return (
    findUrlInNode(item["media:thumbnail"]) ||
    findUrlInNode(item["media:content"]) ||
    findUrlInNode(item.enclosure) ||
    findUrlInNode(item["itunes:image"]) ||
    extractImageUrl(html)
  );
}

function parseFeed(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    trimValues: true,
  });

  const parsed = parser.parse(xml);
  const items = toArray(parsed?.rss?.channel?.item);

  return items
    .map((item) => {
      const title = String(item.title || "Untitled");
      const url = String(item.link || "https://amecker.substack.com/");
      const excerpt = stripHtml(item.description || item["content:encoded"] || "").slice(0, 260);
      const guid = typeof item.guid === "string" ? item.guid : item?.guid?.["#text"] || url;
      const coverImage = extractCoverImage(item, item["content:encoded"] || item.description || "");

      return {
        id: guid,
        title,
        url,
        slug: slugifySegment(title || guid),
        publishedAt: normalizeDate(item.pubDate),
        excerpt,
        author: item["dc:creator"] || item.author,
        coverImage,
      };
    })
    .filter((post) => post.url && post.title)
    .sort((a, b) => (a.publishedAt > b.publishedAt ? -1 : 1));
}

async function main() {
  try {
    const response = await fetch(feedUrl, {
      headers: {
        "user-agent": "mecker-capital-site/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`Feed request failed with status ${response.status}`);
    }

    const xml = await response.text();
    const posts = parseFeed(xml);

    await mkdir(dirname(cacheFilePath), { recursive: true });
    await writeFile(cacheFilePath, `${JSON.stringify(posts, null, 2)}\n`, "utf-8");

    console.log(`[substack-cache] Saved ${posts.length} posts to ${cacheFilePath}`);
  } catch (error) {
    console.warn("[substack-cache] Could not refresh feed cache. Keeping existing cache.");
    console.warn(String(error));
  }
}

await main();
