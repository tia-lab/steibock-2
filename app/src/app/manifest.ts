import { normalizeCraftAssetUrl } from "@/lib/craft/assets";
import { getGlobals } from "@/lib/craft/queries";
import { AssetUrlFragment } from "@/queries";
import { readFragment } from "gql.tada";
import type { MetadataRoute } from "next";

type SeoManifestGlobal = {
  siteName?: string | null;
  siteDescription?: string | null;
  favicon96?: unknown;
  webAppManifest192?: unknown;
  webAppManifest512?: unknown;
};

const firstAsset = (value: unknown) => (Array.isArray(value) ? value[0] : null);

const rawAssetUrl = (value: unknown) => {
  const asset = firstAsset(value);
  const data = asset ? readFragment(AssetUrlFragment, asset as never) : null;

  return normalizeCraftAssetUrl(data?.url);
};

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const globals = await getGlobals();
  const seo = globals.seo as SeoManifestGlobal | null | undefined;
  const name = seo?.siteName || "Site";
  const favicon96 = rawAssetUrl(seo?.favicon96);
  const manifest192 = rawAssetUrl(seo?.webAppManifest192);
  const manifest512 = rawAssetUrl(seo?.webAppManifest512);

  return {
    name,
    short_name: name,
    description: seo?.siteDescription || undefined,
    start_url: "/",
    display: "standalone",
    icons: [
      ...(favicon96
        ? [{ src: favicon96, sizes: "96x96", type: "image/png" }]
        : []),
      ...(manifest192
        ? [{ src: manifest192, sizes: "192x192", type: "image/png" }]
        : []),
      ...(manifest512
        ? [{ src: manifest512, sizes: "512x512", type: "image/png" }]
        : []),
    ],
  };
}
