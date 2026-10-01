import type { ResultOf, TadaDocumentNode, VariablesOf } from "gql.tada";
import { print } from "graphql";

const endpoint = process.env.CRAFT_GRAPHQL_ENDPOINT;
const token = process.env.CRAFT_GRAPHQL_TOKEN;

type CraftRuntime = NodeJS.Process & {
  __ubiqCraftRequestQueue?: Promise<void>;
};

const craftRuntime = process as CraftRuntime;

export type CraftQueryOptions = {
  tags?: string[];
  revalidate?: false | 0 | number;
};

export type CraftPreviewQueryOptions = {
  previewToken: string;
};

export const normalizeCraftCacheTags = (tags: string[] = ["craft"]) => {
  const normalized = tags
    .map((tag) =>
      tag
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9:_-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^[-:_]+|[-:_]+$/g, ""),
    )
    .filter((tag) => tag.length > 0 && tag.length <= 256);

  return [...new Set(normalized)].slice(0, 128);
};

const assertCraftConfig = () => {
  if (!endpoint) {
    throw new Error("Missing CRAFT_GRAPHQL_ENDPOINT.");
  }

  if (!token) {
    throw new Error("Missing CRAFT_GRAPHQL_TOKEN.");
  }

  return { endpoint, token };
};

const createPreviewEndpoint = (previewToken: string) => {
  const { endpoint } = assertCraftConfig();
  const url = new URL(endpoint);

  url.searchParams.set("token", previewToken);

  return url.toString();
};

const parseCraftResponse = async <Document extends TadaDocumentNode>(
  response: Response,
): Promise<ResultOf<Document>> => {
  if (!response.ok) {
    throw new Error(`Craft GraphQL request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    data?: ResultOf<Document>;
    errors?: Array<{ message: string }>;
  };

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("\n"));
  }

  if (!payload.data) {
    throw new Error("Craft GraphQL response did not include data.");
  }

  return payload.data;
};

const runCraftRequest = async (request: () => Promise<Response>) => {
  const previousRequest =
    craftRuntime.__ubiqCraftRequestQueue ?? Promise.resolve();
  let releaseRequest = () => {};

  craftRuntime.__ubiqCraftRequestQueue = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });

  await previousRequest;

  try {
    return await request();
  } finally {
    releaseRequest();
  }
};

export async function craftQuery<Document extends TadaDocumentNode>(
  document: Document,
  variables?: VariablesOf<Document>,
  options: CraftQueryOptions = {},
): Promise<ResultOf<Document>> {
  const config = assertCraftConfig();

  const response = await runCraftRequest(() =>
    fetch(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: print(document),
        variables,
      }),
      next: {
        revalidate: options.revalidate ?? false,
        tags: normalizeCraftCacheTags(options.tags),
      },
    }),
  );

  return parseCraftResponse<Document>(response);
}

export async function craftPreviewQuery<Document extends TadaDocumentNode>(
  document: Document,
  variables: VariablesOf<Document> | undefined,
  options: CraftPreviewQueryOptions,
): Promise<ResultOf<Document>> {
  const config = assertCraftConfig();

  if (!options.previewToken) {
    throw new Error("Missing Craft preview token.");
  }

  const response = await runCraftRequest(() =>
    fetch(createPreviewEndpoint(options.previewToken), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "X-Craft-Token": options.previewToken,
      },
      body: JSON.stringify({
        query: print(document),
        variables,
      }),
      cache: "no-store",
    }),
  );

  return parseCraftResponse<Document>(response);
}
