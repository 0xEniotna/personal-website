import type { ProjectItem, SubstackPost } from "./types";
import { getCanonicalUrl, siteConfig, toAbsoluteUrl } from "./site";

interface CollectionPageInput {
  path: string;
  name: string;
  description: string;
  about?: string[];
  mentions?: string[];
}

export function buildWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.siteUrl,
    description: siteConfig.description,
    inLanguage: "en",
  };
}

export function buildOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.siteUrl,
    founder: siteConfig.author,
    sameAs: [siteConfig.social.x, siteConfig.social.github, siteConfig.social.youtube, siteConfig.substackUrl],
  };
}

export function buildPersonSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: siteConfig.author,
    url: siteConfig.siteUrl,
    sameAs: [siteConfig.social.x, siteConfig.social.github, siteConfig.social.youtube, siteConfig.substackUrl],
    jobTitle: "Investor and Researcher",
    worksFor: {
      "@type": "Organization",
      name: siteConfig.name,
    },
  };
}

export function buildCollectionPageSchema(input: CollectionPageInput) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: getCanonicalUrl(input.path),
    about: input.about,
    mentions: input.mentions,
    isPartOf: {
      "@type": "WebSite",
      name: siteConfig.name,
      url: siteConfig.siteUrl,
    },
    inLanguage: "en",
  };
}

export function buildBlogPostingSchema(post: SubstackPost) {
  const insightUrl = getCanonicalUrl(`/insights/${post.slug}`);
  const publishedAt = post.publishedAt;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.seoTitle ?? post.title,
    description: post.seoDescription ?? post.excerpt,
    datePublished: publishedAt,
    dateModified: publishedAt,
    author: {
      "@type": "Person",
      name: post.author || siteConfig.author,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": insightUrl,
    },
    image: post.coverImage ? [toAbsoluteUrl(post.coverImage)] : [toAbsoluteUrl("/og-default.svg")],
    url: insightUrl,
    inLanguage: "en",
  };
}

export function buildProjectPageSchema(project: ProjectItem) {
  const projectPath = `/projects/${project.slug}`;
  const projectUrl = getCanonicalUrl(projectPath);

  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: project.title,
    description: project.summary,
    url: projectUrl,
    keywords: project.tags,
    isPartOf: {
      "@type": "CollectionPage",
      name: "Projects",
      url: getCanonicalUrl("/projects"),
    },
    creator: {
      "@type": "Person",
      name: siteConfig.author,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
    },
    inLanguage: "en",
  };
}
