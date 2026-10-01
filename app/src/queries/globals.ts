import { graphql } from "@/lib/craft/graphql";
import { AssetImageFragment, AssetUrlFragment } from "./fragments/asset";
import { LinkFragment } from "./fragments/link";
import { NavigationFragment } from './fragments/navigation'

export const GlobalsQuery = graphql(
  `
    query Globals {
      footer: globalSet(handle: "footer") {
        ... on footer_GlobalSet {
          __typename
          id
          companyName
          address
          email
          phone
          footerNavigation {
            ...NavigationFragment
          }
          socialLinks {
            ... on socialLink_Entry {
              id
              title
              typeHandle
              externalUrl
            }
          }
          links {
            ...LinkFragment
          }
        }
      }
      legal: globalSet(handle: "legal") {
        ... on legal_GlobalSet {
          __typename
          id
          cookieTitle
          richText {
            html
          }
          cookieConsentLabel
          cookieDeclineLabel
          cookieAcceptLabel
          cookieRetentionDays
          links {
            ...LinkFragment
          }
        }
      }
      errorPage: globalSet(handle: "errorPage") {
        ... on errorPage_GlobalSet {
          __typename
          id
          errorPageTitle
          text
          links {
            ...LinkFragment
          }
        }
      }
      seo: globalSet(handle: "seo") {
        ... on seo_GlobalSet {
          __typename
          id
          siteName
          siteDescription
          defaultSeoTitle
          defaultSeoDescription
          defaultSeoImage {
            ...AssetImageFragment
          }
          defaultOgTitle
          defaultOgDescription
          defaultOgImage {
            ...AssetImageFragment
          }
          faviconSvg {
            ...AssetUrlFragment
          }
          favicon96 {
            ...AssetUrlFragment
          }
          appleTouchIcon {
            ...AssetUrlFragment
          }
          webAppManifest192 {
            ...AssetUrlFragment
          }
          webAppManifest512 {
            ...AssetUrlFragment
          }
          llmsText
        }
      }
    }
  `,
  [AssetImageFragment, AssetUrlFragment, LinkFragment, NavigationFragment],
);
