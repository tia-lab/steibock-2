import { HOME_URI } from "@/lib/craft/queries";

export const CRAFT_PREVIEW_TOKEN_COOKIE =
  process.env.CRAFT_PREVIEW_TOKEN_COOKIE ?? "craft-preview-token";

export const CRAFT_PREVIEW_TOKEN_PARAM = "x-craft-preview-token";

export type PreviewSearchParams = Promise<
  Record<string, string | string[] | undefined>
>;

export const normalizePreviewUri = (uri: string | null) => {
  const normalized = uri?.trim().replace(/^\/+|\/+$/g, "");

  return normalized || HOME_URI;
};

export const pathFromCraftUri = (uri: string) => {
  return uri === HOME_URI ? "/" : `/${uri}`;
};

export const getPreviewTokenFromSearchParams = async (
  searchParams: PreviewSearchParams,
) => {
  const params = await searchParams;
  const token = params[CRAFT_PREVIEW_TOKEN_PARAM];

  return Array.isArray(token) ? token[0] : token;
};
