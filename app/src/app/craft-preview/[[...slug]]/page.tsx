import { generateCraftMetadata } from "@/lib/craft/metadata";
import { getPreviewEntryByUri, HOME_URI } from "@/lib/craft/queries";
import {
  getPreviewTokenFromSearchParams,
  type PreviewSearchParams,
} from "@/lib/craft/preview";
import { TemplateRouter } from "@/Templates";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    slug?: string[];
  }>;
  searchParams: PreviewSearchParams;
};

const getUri = async (params: Props["params"]) => {
  const { slug } = await params;

  return slug?.join("/") || HOME_URI;
};

export const generateMetadata = async ({
  params,
  searchParams,
}: Props): Promise<Metadata> => {
  const [uri, previewToken] = await Promise.all([
    getUri(params),
    getPreviewTokenFromSearchParams(searchParams),
  ]);

  if (!previewToken) {
    notFound();
  }

  return generateCraftMetadata(uri, { previewToken });
};

export default async function PreviewPage({ params, searchParams }: Props) {
  const [uri, previewToken] = await Promise.all([
    getUri(params),
    getPreviewTokenFromSearchParams(searchParams),
  ]);

  if (!previewToken) {
    notFound();
  }

  const data = await getPreviewEntryByUri(uri, previewToken);

  if (!data.entry) {
    notFound();
  }

  return <TemplateRouter entry={data.entry} />;
}
