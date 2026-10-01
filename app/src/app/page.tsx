import { getRequestEntryByUri, HOME_URI } from "@/lib/craft/queries";
import { generateCraftMetadata } from "@/lib/craft/metadata";
import { TemplateRouter } from "@/Templates";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const generateMetadata = async (): Promise<Metadata> => {
  return generateCraftMetadata(HOME_URI);
};

export default async function Home() {
  const data = await getRequestEntryByUri(HOME_URI);

  if (!data.entry) {
    notFound();
  }

  return <TemplateRouter entry={data.entry} />;
}
