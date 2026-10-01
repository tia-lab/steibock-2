import { normalizeCraftAssetUrl } from "@/lib/craft/assets";
import {
  getGlobals,
  getRequestEntryByUri,
  HOME_URI,
} from "@/lib/craft/queries";
import { AssetImageFragment, AssetUrlFragment } from "@/queries";
import { getSiteUrl } from "@/lib/site-url";
import { readFragment } from "gql.tada";
import type { Metadata } from "next";

type PageSeo = {
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoImage?: unknown;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImage?: unknown;
  noIndex?: boolean | null;
  noFollow?: boolean | null;
};

type MetadataEntry = {
  title?: string | null;
  uri?: string | null;
  pageSeo?: PageSeo | null;
  image?: unknown;
};

type SeoGlobal = {
  __typename?: string;
  siteName?: string | null;
  siteDescription?: string | null;
  defaultSeoTitle?: string | null;
  defaultSeoDescription?: string | null;
  defaultSeoImage?: unknown;
  defaultOgTitle?: string | null;
  defaultOgDescription?: string | null;
  defaultOgImage?: unknown;
  faviconSvg?: unknown;
  favicon96?: unknown;
  appleTouchIcon?: unknown;
  webAppManifest192?: unknown;
  webAppManifest512?: unknown;
};

type GenerateCraftMetadataOptions = {
  previewToken?: string | null;
};

const siteUrl = getSiteUrl();

const firstAsset = (value: unknown) => {
  return Array.isArray(value) ? value[0] : null;
};

const assetUrl = (value: unknown) => {
  const asset = firstAsset(value);
  const data = asset ? readFragment(AssetImageFragment, asset as never) : null;

  return normalizeCraftAssetUrl(data?.url);
};

const rawAssetUrl = (value: unknown) => {
  const asset = firstAsset(value);
  const data = asset ? readFragment(AssetUrlFragment, asset as never) : null;

  return normalizeCraftAssetUrl(data?.url);
};

const seoIcons = (seo?: SeoGlobal | null): Metadata["icons"] => {
  const faviconSvg = rawAssetUrl(seo?.faviconSvg);
  const favicon96 = rawAssetUrl(seo?.favicon96);
  const appleTouchIcon = rawAssetUrl(seo?.appleTouchIcon);
  const icon = [
    ...(faviconSvg ? [{ url: faviconSvg, type: "image/svg+xml" }] : []),
    ...(favicon96 ? [{ url: favicon96, sizes: "96x96", type: "image/png" }] : []),
  ];

  if (!icon.length && !appleTouchIcon) {
    return undefined;
  }

  return {
    icon: icon.length ? icon : undefined,
    apple: appleTouchIcon
      ? [{ url: appleTouchIcon, sizes: "180x180", type: "image/png" }]
      : undefined,
  };
};

const twitterMetadata = (
  title?: string | null,
  description?: string | null,
  image?: string,
): Metadata["twitter"] => ({
  card: image ? "summary_large_image" : "summary",
  title: title || undefined,
  description: description || undefined,
  images: image ? [image] : undefined,
});

const pagePath = (uri?: string | null) => {
  if (!uri || uri === HOME_URI) {
    return "/";
  }

  return `/${uri}`;
};

const absoluteUrl = (path: string) => new URL(path, siteUrl).toString();

const asSeoGlobal = (value: unknown) => {
  return value as SeoGlobal | null | undefined;
};

export const generateGlobalMetadata = async (): Promise<Metadata> => {
  const globals = await getGlobals();
  const seo = asSeoGlobal(globals.seo);

  if (!seo) {
    return {};
  }

  const title = seo.defaultSeoTitle || seo.siteName || undefined;
  const description =
    seo.defaultSeoDescription || seo.siteDescription || undefined;
  const image = assetUrl(seo.defaultOgImage) || assetUrl(seo.defaultSeoImage);

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    icons: seoIcons(seo),
    manifest: "/manifest.webmanifest",
    openGraph: {
      title: seo.defaultOgTitle || title,
      description: seo.defaultOgDescription || description,
      siteName: seo.siteName || undefined,
      images: image ? [image] : undefined,
    },
    twitter: twitterMetadata(
      seo.defaultOgTitle || title,
      seo.defaultOgDescription || description,
      image,
    ),
  };
};

export const generateCraftMetadata = async (
  uri: string,
  options: GenerateCraftMetadataOptions = {},
): Promise<Metadata> => {
  const [globals, data] = await Promise.all([
    getGlobals(),
    getRequestEntryByUri(uri, { previewToken: options.previewToken }),
  ]);

  const seo = asSeoGlobal(globals.seo);
  const entry = data.entry as MetadataEntry | null | undefined;

  if (!entry) {
    return generateGlobalMetadata();
  }

  const pageSeo = entry.pageSeo;
  const fallbackTitle =
    seo?.defaultSeoTitle || seo?.siteName || entry.title || undefined;
  const title = pageSeo?.seoTitle || entry.title || fallbackTitle;
  const description =
    pageSeo?.seoDescription ||
    seo?.defaultSeoDescription ||
    seo?.siteDescription ||
    undefined;
  const image =
    assetUrl(pageSeo?.ogImage) ||
    assetUrl(pageSeo?.seoImage) ||
    assetUrl(entry.image) ||
    assetUrl(seo?.defaultOgImage) ||
    assetUrl(seo?.defaultSeoImage);

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: absoluteUrl(pagePath(entry.uri)),
    },
    openGraph: {
      title: pageSeo?.ogTitle || title,
      description: pageSeo?.ogDescription || description,
      siteName: seo?.siteName || undefined,
      url: absoluteUrl(pagePath(entry.uri)),
      images: image ? [image] : undefined,
    },
    twitter: twitterMetadata(
      pageSeo?.ogTitle || title,
      pageSeo?.ogDescription || description,
      image,
    ),
    robots: {
      index: !pageSeo?.noIndex,
      follow: !pageSeo?.noFollow,
    },
  };
};
