import { craftQuery } from "@/lib/craft/client";
import { NavigationQuery } from "@/queries";

export const getNavigation = (handle = "main") => {
  return craftQuery(
    NavigationQuery,
    { handle: [handle] },
    {
      tags: ["craft", "craft:navigation", "craft:entry-links"],
      revalidate: false,
    },
  );
};
