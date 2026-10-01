import { graphql } from "@/lib/craft/graphql";

export const AssetImageFragment = graphql(`
  fragment AssetImageFragment on AssetInterface {
    id
    title
    alt
    focalPoint
    hasFocalPoint
    blurDataUrl: url(width: 20, height: 12, mode: "crop", format: "webp", quality: 20)
    url(width: 1600, height: 1000, mode: "crop", format: "webp", quality: 90)
    width(width: 1600, height: 1000, mode: "crop", format: "webp", quality: 90)
    height(width: 1600, height: 1000, mode: "crop", format: "webp", quality: 90)
  }
`);

export const AssetUrlFragment = graphql(`
  fragment AssetUrlFragment on AssetInterface {
    id
    title
    url
  }
`);
