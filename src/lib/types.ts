export interface SubstackPost {
  id: string;
  title: string;
  url: string;
  slug: string;
  publishedAt: string;
  excerpt: string;
  author?: string;
  coverImage?: string;
  summary?: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  indexable?: boolean;
}

export interface WritingsSeoOverride {
  slug: string;
  seoTitle?: string;
  seoDescription?: string;
  summary?: string;
  focusKeyword?: string;
  indexable?: boolean;
  coverImageOverride?: string;
}

export interface PortfolioBucket {
  slug: string;
  label: string;
  thesis: string;
  targetRange?: string;
  riskNotes?: string;
}

export interface ProjectItem {
  slug: string;
  title: string;
  status: "active" | "research" | "archived";
  summary: string;
  description?: string;
  highlights?: string[];
  tags: string[];
  link?: string;
  showcase?: {
    mode: "skeleton" | "image";
    imageSrc?: string;
    imageAlt?: string;
    caption?: string;
    aspect?: "16:9" | "4:3";
  };
}
