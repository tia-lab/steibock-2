import { getRequestEntryByUri } from "@/lib/craft/queries";
import { generateCraftMetadata } from "@/lib/craft/metadata";
import { TemplateRouter } from "@/Templates";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{
    slug: string[];
  }>;
};

export const generateStaticParams = () => [];

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const { slug } = await params;
  const uri = slug.join("/");

  return generateCraftMetadata(uri);
};

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const uri = slug.join("/");

  const data = await getRequestEntryByUri(uri);

  if (!data.entry) {
    notFound();
  }

  return <TemplateRouter entry={data.entry} />;
}
