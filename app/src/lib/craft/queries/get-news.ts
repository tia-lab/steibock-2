import { craftQuery } from "@/lib/craft/client";
import { NewsIndexQuery } from "@/queries";

export type NewsOrder = "newest" | "oldest" | "titleAsc" | "titleDesc";

const newsOrderBy: Record<NewsOrder, string> = {
  newest: "postDate DESC",
  oldest: "postDate ASC",
  titleAsc: "title ASC",
  titleDesc: "title DESC",
};

export const getNews = (limit = 12, order: NewsOrder = "newest") => {
  return craftQuery(
    NewsIndexQuery,
    { limit, orderBy: newsOrderBy[order] },
    {
      tags: ["craft", "craft:news", "craft:assets"],
      revalidate: false,
    },
  );
};
