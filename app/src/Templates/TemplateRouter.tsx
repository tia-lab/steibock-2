import { EntryByUriQuery } from "@/queries";
import type { ResultOf } from "gql.tada";
import { CollectionTemplate } from "./Collection";
import { LegalTemplate } from "./Legal";
import { NewsTemplate } from "./News";
import { PageTemplate } from "./Page";

type Entry = NonNullable<ResultOf<typeof EntryByUriQuery>["entry"]>;

type Props = {
  entry: Entry;
};

export const TemplateRouter = ({ entry }: Props) => {
  switch (entry.__typename) {
    case "page_Entry":
      return <PageTemplate entry={entry} />;
    case "legalPage_Entry":
      return <LegalTemplate entry={entry} />;
    case "collectionPage_Entry":
      return <CollectionTemplate entry={entry} />;
    case "news_Entry":
      return <NewsTemplate entry={entry} />;
    default:
      return null;
  }
};
