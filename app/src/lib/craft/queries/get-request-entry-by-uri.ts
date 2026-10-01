import { getEntryByUri, getPreviewEntryByUri } from "./get-entry-by-uri";

type GetRequestEntryOptions = {
  previewToken?: string | null;
};

export const getRequestEntryByUri = (
  uri: string,
  options: GetRequestEntryOptions = {},
) => {
  if (options.previewToken) {
    return getPreviewEntryByUri(uri, options.previewToken);
  }

  return getEntryByUri(uri);
};
