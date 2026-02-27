import { describe, expect, it } from "vitest";
import { normalizeDate, parseSubstackFeed } from "../src/lib/substack";

const sampleXml = `
<rss>
  <channel>
    <item>
      <title>Second Post</title>
      <link>https://amecker.substack.com/p/second</link>
      <guid>second</guid>
      <pubDate>Tue, 11 Feb 2026 12:00:00 GMT</pubDate>
      <description><![CDATA[<p>Second excerpt</p>]]></description>
      <content:encoded><![CDATA[<p>Second excerpt</p><img src="https://img.test/2.png" />]]></content:encoded>
    </item>
    <item>
      <title>Media Post</title>
      <link>https://amecker.substack.com/p/media</link>
      <guid>media</guid>
      <pubDate>Wed, 12 Feb 2026 12:00:00 GMT</pubDate>
      <description><![CDATA[<p>Media excerpt</p>]]></description>
      <media:thumbnail url="https://img.test/media-thumb.png" />
    </item>
    <item>
      <title>First Post</title>
      <link>https://amecker.substack.com/p/first</link>
      <guid>first</guid>
      <pubDate>Mon, 10 Feb 2026 12:00:00 GMT</pubDate>
      <description><![CDATA[<p>First excerpt</p>]]></description>
    </item>
  </channel>
</rss>
`;

describe("substack parser", () => {
  it("parses posts and orders them by date descending", () => {
    const posts = parseSubstackFeed(sampleXml);

    expect(posts).toHaveLength(3);
    expect(posts[0]?.title).toBe("Media Post");
    expect(posts[0]?.coverImage).toBe("https://img.test/media-thumb.png");
    expect(posts[0]?.slug).toBe("media-post");
    expect(posts[1]?.title).toBe("Second Post");
    expect(posts[1]?.coverImage).toBe("https://img.test/2.png");
    expect(posts[1]?.slug).toBe("second-post");
    expect(posts[2]?.title).toBe("First Post");
  });

  it("normalizes invalid dates to epoch", () => {
    expect(normalizeDate("not-a-date")).toBe(new Date(0).toISOString());
  });
});
