import { normalizeCraftAssetUrl } from '@/lib/craft/assets'
import { AssetImageFragment, type ImageRatio } from '@/queries'
import type { FragmentOf } from 'gql.tada'
import { readFragment } from 'gql.tada'
import NextImage, { type ImageProps as NextImageProps } from 'next/image'

type Props = Omit<NextImageProps, 'alt' | 'height' | 'src' | 'width'> & {
	image?: FragmentOf<typeof AssetImageFragment> | null
	ratio?: ImageRatio
}

const transformFields = {
	'16:10': ['url', 'width', 'height', 'blurDataUrl'],
	'16:9': ['ratio16x9Url', 'ratio16x9Width', 'ratio16x9Height', 'ratio16x9BlurDataUrl'],
	'4:3': ['ratio4x3Url', 'ratio4x3Width', 'ratio4x3Height', 'ratio4x3BlurDataUrl'],
	'1:1': ['ratio1x1Url', 'ratio1x1Width', 'ratio1x1Height', 'ratio1x1BlurDataUrl'],
	'4:5': ['ratio4x5Url', 'ratio4x5Width', 'ratio4x5Height', 'ratio4x5BlurDataUrl']
} as const satisfies Record<ImageRatio, readonly [string, string, string, string]>

export const ImageCraft = ({
	image,
	ratio = '16:10',
	sizes = '100vw',
	style,
	placeholder,
	blurDataURL,
	...props
}: Props) => {
	const data = image ? readFragment(AssetImageFragment, image) : null
	const [urlField, widthField, heightField, blurDataUrlField] = transformFields[ratio]
	const url = data?.[urlField]
	const width = data?.[widthField]
	const height = data?.[heightField]
	const blurDataUrl = data?.[blurDataUrlField]

	if (!data || !url || !width || !height) return null

	const focalX = data.focalPoint?.[0] ?? 0.5
	const focalY = data.focalPoint?.[1] ?? 0.5
	const objectPosition =
		data.focalPoint?.length === 2
			? `${focalX * 100}% ${focalY * 100}%`
			: '50% 50%'
	const craftBlurDataUrl = blurDataUrl
		? (normalizeCraftAssetUrl(blurDataUrl) ?? blurDataUrl)
		: undefined
	const imageBlurDataUrl = blurDataURL ?? craftBlurDataUrl
	const imagePlaceholder = placeholder ?? (imageBlurDataUrl ? 'blur' : undefined)

	return (
		<NextImage
			{...props}
			src={normalizeCraftAssetUrl(url) ?? url}
			alt={data.alt || data.title || ''}
			width={width}
			height={height}
			sizes={sizes}
			placeholder={imagePlaceholder}
			blurDataURL={imageBlurDataUrl}
			style={{ objectPosition, ...style }}
		/>
	)
}
