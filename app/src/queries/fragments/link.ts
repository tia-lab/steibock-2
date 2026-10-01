import { graphql } from "@/lib/craft/graphql";

export const LinkFragment = graphql(`
  fragment LinkFragment on link_Entry {
    id
    title
    typeHandle
    isExternal
    linkTarget
    externalUrl
    pageLink {
      id
      title
      uri
    }
  }
`);
