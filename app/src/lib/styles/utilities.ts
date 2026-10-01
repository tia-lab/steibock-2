type CssProperty = Extract<keyof React.CSSProperties, string>;
type UtilityTokenSource = Record<string, unknown>;

export interface UtilityDefinition {
  prefix: string;
  properties: CssProperty[];
}

export interface UtilityConfig {
  namespace: string;
  definitions: readonly UtilityDefinition[];
  tokens: UtilityTokenSource;
}

export const createUtility = <
  const TTokens extends UtilityTokenSource,
  const TDefinitions extends readonly UtilityDefinition[],
>(
  tokens: TTokens,
  definitions: TDefinitions,
  namespace: string,
) => ({
  namespace,
  definitions,
  tokens,
});

const renderUtilityBlock = (
  className: string,
  properties: CssProperty[],
  value: string,
) => [
  `.${className} {`,
  ...properties.map((property) => `\t${toKebabCase(property)}: ${value};`),
  "}",
].join("\n");

const toKebabCase = (value: string) =>
  value.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);

export const renderUtilities = (utilities: readonly UtilityConfig[]) =>
  utilities
    .flatMap(({ namespace, definitions, tokens }) =>
      definitions.flatMap((definition) =>
        Object.keys(tokens).map((tokenName) =>
          renderUtilityBlock(
            `${definition.prefix}-${tokenName}`,
            definition.properties,
            `var(--${namespace}-${tokenName})`,
          ),
        ),
      ),
    )
    .join("\n\n");
