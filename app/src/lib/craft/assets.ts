const craftBaseUrl = process.env.CRAFT_GRAPHQL_ENDPOINT
  ? new URL(process.env.CRAFT_GRAPHQL_ENDPOINT).origin
  : "";

export const normalizeCraftAssetUrl = (url?: string | null) => {
  if (!url) {
    return undefined;
  }

  if (/^(?:[a-z]+:)?\/\//i.test(url) || url.startsWith("data:")) {
    return url;
  }

  if (!craftBaseUrl) {
    return url;
  }

  return new URL(url, `${craftBaseUrl}/`).toString();
};
