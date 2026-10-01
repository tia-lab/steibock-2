import { graphql } from "@/lib/craft/graphql";
import { AssetImageFragment } from "./asset";
import { FreeformFormFragment } from "./freeform";
import { LinkFragment } from "./link";

export const RenderableSectionFragment = graphql(
  `
    fragment RenderableSectionFragment on EntryInterface {
      __typename
      ... on sectionHero_Entry {
        id
        title
        typeHandle
        subtitle
        image {
          ...AssetImageFragment
        }
        customSpacing
        spaceTop
        spaceBottom
      }
      ... on sectionAbout_Entry {
        id
        title
        typeHandle
        aboutVariant
        text
        image {
          ...AssetImageFragment
        }
        links {
          ...LinkFragment
        }
        customSpacing
        spaceTop
        spaceBottom
      }
      ... on sectionCta_Entry {
        id
        title
        typeHandle
        text
        links {
          ...LinkFragment
        }
        customSpacing
        spaceTop
        spaceBottom
      }
      ... on sectionContent_Entry {
        id
        title
        typeHandle
        richText {
          html
        }
        links {
          ...LinkFragment
        }
        customSpacing
        spaceTop
        spaceBottom
      }
      ... on sectionContact_Entry {
        id
        title
        typeHandle
        text
        form {
          ...FreeformFormFragment
        }
        customSpacing
        spaceTop
        spaceBottom
      }
      ... on sectionNews_Entry {
        id
        title
        typeHandle
        newsVariant
        itemsLimit
        orderBy
        selectedNews {
          ... on news_Entry {
            __typename
            id
            title
            uri
            postDate
            excerpt
            image {
              ...AssetImageFragment
            }
          }
        }
        customSpacing
        spaceTop
        spaceBottom
      }
    }
  `,
  [AssetImageFragment, FreeformFormFragment, LinkFragment],
);

export const SectionFragment = graphql(
  `
    fragment SectionFragment on sections_MatrixField {
      __typename
      ...RenderableSectionFragment
      ... on sectionReference_Entry {
        id
        title
        typeHandle
        customSpacing
        spaceTop
        spaceBottom
        referencedSection {
          ...RenderableSectionFragment
        }
      }
    }
  `,
  [RenderableSectionFragment],
);
