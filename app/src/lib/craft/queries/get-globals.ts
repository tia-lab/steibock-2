import { craftQuery } from "@/lib/craft/client";
import { GlobalsQuery } from "@/queries";

export const getGlobals = () => {
  return craftQuery(
    GlobalsQuery,
    {},
    {
      tags: [
        "craft",
        "craft:globals",
        "craft:navigation",
        "craft:entry-links",
        "craft:assets",
      ],
      revalidate: false,
    },
  );
};
