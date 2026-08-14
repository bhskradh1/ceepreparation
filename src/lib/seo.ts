/** Canonical public origin used for SEO tags (no trailing slash). */
export const SITE_URL = "https://ceepreparation.vercel.app";

export const SITE_NAME = "CEE Prep Nepal";

export const OG_IMAGE = `${SITE_URL}/og-cover.jpg`;

/** Absolute canonical URL for a path like "/tests". */
export function canonical(path: string): string {
  return `${SITE_URL}${path === "/" ? "/" : path}`;
}

/** Standard canonical + social image tags for an indexable page. */
export function seoTags(path: string) {
  return {
    meta: [
      { property: "og:url", content: canonical(path) },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
      { name: "robots", content: "index, follow" },
    ],
    links: [{ rel: "canonical", href: canonical(path) }],
  };
}

/** Tags for private/utility pages that must stay out of search results. */
export function noIndexTags() {
  return { meta: [{ name: "robots", content: "noindex, nofollow" }] };
}
