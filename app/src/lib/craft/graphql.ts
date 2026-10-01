import { initGraphQLTada } from "gql.tada";
import type { introspection } from "../../graphql-env";

export const graphql = initGraphQLTada<{
  introspection: introspection;
  scalars: {
    DateTime: string;
    Date: string;
    Time: string;
    Json: unknown;
    Mixed: unknown;
    QueryArgument: unknown;
  };
}>();
