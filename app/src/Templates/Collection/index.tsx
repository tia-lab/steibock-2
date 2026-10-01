import { ImageCraft, TransitionLink, Wrapper } from "@/Components";
import { getNews, type NewsOrder } from "@/lib/craft/queries";
import {
  CollectionPageConfigFragment,
  EntryByUriQuery,
  NewsIndexQuery,
} from "@/queries";
import { Footer } from "@/Sections/Footer";
import type { FragmentOf, ResultOf } from "gql.tada";
import { readFragment } from "gql.tada";
import $ from "./style.module.scss";

type Entry = NonNullable<ResultOf<typeof EntryByUriQuery>["entry"]>;
type CollectionEntry = Extract<
  Entry,
  { __typename: "collectionPage_Entry" }
>;
type NewsItem = Extract<
  NonNullable<NonNullable<ResultOf<typeof NewsIndexQuery>["entries"]>[number]>,
  { __typename: "news_Entry" }
>;

type Props = {
  entry: CollectionEntry;
};

const normalizeLimit = (value: unknown) => {
  const limit = Number(value);

  return Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 12;
};

const normalizeOrder = (value: unknown): NewsOrder => {
  if (
    value === "oldest" ||
    value === "titleAsc" ||
    value === "titleDesc"
  ) {
    return value;
  }

  return "newest";
};

const isNewsItem = (entry: unknown): entry is NewsItem => {
  return (
    typeof entry === "object" &&
    entry !== null &&
    (entry as { __typename?: string }).__typename === "news_Entry"
  );
};

export const CollectionTemplate = async ({ entry }: Props) => {
  const config = readFragment(
    CollectionPageConfigFragment,
    entry as FragmentOf<typeof CollectionPageConfigFragment>,
  ).collection?.[0];

  const data =
    config?.__typename === "newsCollection_Entry"
      ? await getNews(
          normalizeLimit(config.itemsLimit),
          normalizeOrder(config.collectionOrderBy),
        )
      : null;
  const items = data?.entries?.filter(isNewsItem) ?? [];

  return (
    <>
      <main>
        <section className={$.section}>
          <Wrapper>
            <h1 className={$.title}>{entry.title}</h1>
            <div className={$.grid}>
              {items.map((item) => (
                <article key={item.id} className={$.article}>
                  <TransitionLink
                    href={item.uri ? `/${item.uri}` : "#"}
                    transition="fade"
                    className={$.link}
                  >
                    {item.image[0] ? (
                      <div className={$.image}>
                        <ImageCraft
                          image={item.image[0]}
                          sizes="(min-width: 768px) 33vw, 100vw"
                          className="object-fit"
                        />
                      </div>
                    ) : null}
                    <h2>{item.title}</h2>
                  </TransitionLink>
                  {item.postDate ? <time>{item.postDate}</time> : null}
                  {item.excerpt ? <p>{item.excerpt}</p> : null}
                </article>
              ))}
            </div>
          </Wrapper>
        </section>
      </main>
      <Footer />
    </>
  );
};
