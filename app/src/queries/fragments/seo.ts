import { graphql } from "@/lib/craft/graphql";
import { AssetImageFragment } from "./asset";

export const SeoFragment = graphql(
  `
    fragment SeoFragment on pageSeo_ContentBlock {
      seoTitle
      seoDescription
      seoImage {
        ...AssetImageFragment
      }
      ogTitle
      ogDescription
      ogImage {
        ...AssetImageFragment
      }
      noIndex
      noFollow
    }
  `,
  [AssetImageFragment],
);
