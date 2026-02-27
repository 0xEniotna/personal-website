export const siteConfig = {
  name: "Mecker Capital",
  siteUrl: "https://mecker.capital",
  author: "Antoine Mecker",
  locale: "en_US",
  description:
    "Independent capital allocation, macro research, and public writings by Antoine Mecker.",
  substackUrl: "https://amecker.substack.com/",
  substackFeedUrl: "https://amecker.substack.com/feed",
  social: {
    x: "https://x.com/0xEniotna",
    github: "https://github.com/0xEniotna",
    substack: "https://amecker.substack.com/",
    youtube: "https://www.youtube.com/@meckercapital",
    tiktokLabel: "TikTok (coming soon)",
    twitterHandle: "@0xEniotna",
  },
};

export const defaultSeoImage = "/og-default.svg";

function stripQueryAndHash(path: string): string {
  return path.split("#")[0]?.split("?")[0] ?? "/";
}

export function normalizePath(path = "/"): string {
  const base = stripQueryAndHash(path).trim();

  if (base.length === 0) {
    return "/";
  }

  const withLeadingSlash = base.startsWith("/") ? base : `/${base}`;
  if (withLeadingSlash === "/") {
    return "/";
  }

  return withLeadingSlash.endsWith("/") ? withLeadingSlash : `${withLeadingSlash}/`;
}

export function toAbsoluteUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  const stripped = stripQueryAndHash(pathOrUrl).trim();
  const withLeadingSlash = stripped.startsWith("/") ? stripped : `/${stripped}`;
  const lastSegment = withLeadingSlash.split("/").filter(Boolean).at(-1) ?? "";
  const hasFileExtension = lastSegment.includes(".");
  const normalizedPath =
    withLeadingSlash === "/" || hasFileExtension
      ? withLeadingSlash.replace(/\/+$/, "")
      : withLeadingSlash.endsWith("/")
        ? withLeadingSlash
        : `${withLeadingSlash}/`;

  return new URL(normalizedPath, siteConfig.siteUrl).toString();
}

export function getCanonicalUrl(path = "/"): string {
  return toAbsoluteUrl(normalizePath(path));
}
