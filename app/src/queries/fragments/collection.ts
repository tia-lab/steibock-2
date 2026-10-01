import { graphql } from "@/lib/craft/graphql";

export const CollectionPageConfigFragment = graphql(`
  fragment CollectionPageConfigFragment on collectionPage_Entry {
    collection {
      ... on newsCollection_Entry {
        __typename
        id
        itemsLimit
        collectionOrderBy
      }
    }
  }
`);
