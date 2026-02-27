import { describe, expect, it } from "vitest";
import {
  buildBlogPostingSchema,
  buildCollectionPageSchema,
  buildOrganizationSchema,
  buildPersonSchema,
  buildWebsiteSchema,
} from "../src/lib/seo-schema";
import type { SubstackPost } from "../src/lib/types";

const samplePost: SubstackPost = {
  id: "s1",
  title: "Sample Insight",
  url: "https://amecker.substack.com/p/sample-insight",
  slug: "sample-insight",
  publishedAt: new Date("2026-02-10").toISOString(),
  excerpt: "A sample article excerpt.",
};

describe("seo schema", () => {
  it("builds website and entity schemas", () => {
    const website = buildWebsiteSchema();
    const organization = buildOrganizationSchema();
    const person = buildPersonSchema();

    expect(website["@type"]).toBe("WebSite");
    expect(organization["@type"]).toBe("Organization");
    expect(person["@type"]).toBe("Person");
  });

  it("builds collection page schema with url", () => {
    const collection = buildCollectionPageSchema({
      path: "/writings",
      name: "Writings",
      description: "Research notes",
      about: ["Macro"],
    });

    expect(collection["@type"]).toBe("CollectionPage");
    expect(collection.url).toContain("/writings/");
  });

  it("builds blogposting schema with mainEntityOfPage", () => {
    const blogPosting = buildBlogPostingSchema(samplePost);

    expect(blogPosting["@type"]).toBe("BlogPosting");
    expect(blogPosting.mainEntityOfPage["@id"]).toContain("/insights/sample-insight/");
  });
});
