import { normalizeCraftAssetUrl } from '@/lib/craft/assets'
import { AssetImageFragment } from '@/queries'
import type { FragmentOf } from 'gql.tada'
import { readFragment } from 'gql.tada'
import NextImage, { type ImageProps as NextImageProps } from 'next/image'

type Props = Omit<NextImageProps, 'alt' | 'height' | 'src' | 'width'> & {
	image?: FragmentOf<typeof AssetImageFragment> | null
}

export const ImageCraft = ({
	image,
	sizes = '100vw',
	style,
	placeholder,
	blurDataURL,
	...props
}: Props) => {
	const data = image ? readFragment(AssetImageFragment, image) : null

	if (!data?.url || !data.width || !data.height) {
		return null
	}

	const focalX = data.focalPoint?.[0] ?? 0.5
	const focalY = data.focalPoint?.[1] ?? 0.5
	const objectPosition =
		data.focalPoint?.length === 2
			? `${focalX * 100}% ${focalY * 100}%`
			: '50% 50%'
	const craftBlurDataUrl = data.blurDataUrl
		? (normalizeCraftAssetUrl(data.blurDataUrl) ?? data.blurDataUrl)
		: undefined
	const imageBlurDataUrl = blurDataURL ?? craftBlurDataUrl
	const imagePlaceholder = placeholder ?? (imageBlurDataUrl ? 'blur' : undefined)

	return (
		<NextImage
			{...props}
			src={normalizeCraftAssetUrl(data.url) ?? data.url}
			alt={data.alt || data.title || ''}
			width={data.width}
			height={data.height}
			sizes={sizes}
			placeholder={imagePlaceholder}
			blurDataURL={imageBlurDataUrl}
			style={{ objectPosition, ...style }}
		/>
	)
}
