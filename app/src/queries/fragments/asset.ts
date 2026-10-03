import { graphql } from '@/lib/craft/graphql'

export const IMAGE_RATIOS = ['16:10', '16:9', '4:3', '1:1', '4:5'] as const

export type ImageRatio = (typeof IMAGE_RATIOS)[number]

export const AssetImageFragment = graphql(`
	fragment AssetImageFragment on AssetInterface {
		id
		title
		alt
		focalPoint
		hasFocalPoint
		blurDataUrl: url(width: 16, height: 10, mode: "crop", format: "webp", quality: 20)
		url(width: 1600, height: 1000, mode: "crop", format: "webp", quality: 90)
		width(width: 1600, height: 1000, mode: "crop", format: "webp", quality: 90)
		height(width: 1600, height: 1000, mode: "crop", format: "webp", quality: 90)
		ratio16x9BlurDataUrl: url(width: 16, height: 9, mode: "crop", format: "webp", quality: 20)
		ratio16x9Url: url(width: 1600, height: 900, mode: "crop", format: "webp", quality: 90)
		ratio16x9Width: width(width: 1600, height: 900, mode: "crop", format: "webp", quality: 90)
		ratio16x9Height: height(width: 1600, height: 900, mode: "crop", format: "webp", quality: 90)
		ratio4x3BlurDataUrl: url(width: 8, height: 6, mode: "crop", format: "webp", quality: 20)
		ratio4x3Url: url(width: 1600, height: 1200, mode: "crop", format: "webp", quality: 90)
		ratio4x3Width: width(width: 1600, height: 1200, mode: "crop", format: "webp", quality: 90)
		ratio4x3Height: height(width: 1600, height: 1200, mode: "crop", format: "webp", quality: 90)
		ratio1x1BlurDataUrl: url(width: 8, height: 8, mode: "crop", format: "webp", quality: 20)
		ratio1x1Url: url(width: 1200, height: 1200, mode: "crop", format: "webp", quality: 90)
		ratio1x1Width: width(width: 1200, height: 1200, mode: "crop", format: "webp", quality: 90)
		ratio1x1Height: height(width: 1200, height: 1200, mode: "crop", format: "webp", quality: 90)
		ratio4x5BlurDataUrl: url(width: 8, height: 10, mode: "crop", format: "webp", quality: 20)
		ratio4x5Url: url(width: 1200, height: 1500, mode: "crop", format: "webp", quality: 90)
		ratio4x5Width: width(width: 1200, height: 1500, mode: "crop", format: "webp", quality: 90)
		ratio4x5Height: height(width: 1200, height: 1500, mode: "crop", format: "webp", quality: 90)
	}
`)

export const AssetUrlFragment = graphql(`
	fragment AssetUrlFragment on AssetInterface {
		id
		title
		url
	}
`)
