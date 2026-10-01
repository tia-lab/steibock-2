import {
  createElement,
  Fragment,
  type ComponentType,
  type ReactElement,
} from "react";
import { RenderableSectionFragment, SectionFragment } from "@/queries";
import type { FragmentOf } from "gql.tada";
import { readFragment } from "gql.tada";
import { SectionAbout } from "./SectionAbout";
import { SectionContact } from "./SectionContact";
import { SectionContent } from "./SectionContent";
import { SectionCta } from "./SectionCta";
import { SectionHero } from "./SectionHero";
import { SectionNews } from "./SectionNews";
import type { SectionSpacingSource } from "./utils/section-spacing";

type Section = FragmentOf<typeof SectionFragment>;
export type RenderableSection = FragmentOf<typeof RenderableSectionFragment>;

type Props = {
  sections?: ReadonlyArray<Section | null> | null;
};

export type SectionComponentProps = {
  section: RenderableSection;
  spacingOverride?: SectionSpacingSource | null;
};

type SectionComponent = ComponentType<SectionComponentProps>;

const sectionComponents: Record<string, SectionComponent> = {
  sectionAbout_Entry: SectionAbout,
  sectionContact_Entry: SectionContact,
  sectionContent_Entry: SectionContent,
  sectionCta_Entry: SectionCta,
  sectionHero_Entry: SectionHero,
  sectionNews_Entry: SectionNews,
};

const renderRenderableSection = (
  section: RenderableSection,
  index: number,
  keyOverride?: string,
  spacingOverride?: SectionSpacingSource | null,
): ReactElement | null => {
  const data = readFragment(RenderableSectionFragment, section);
  const Component = sectionComponents[data.__typename];

  if (!Component) {
    return null;
  }

  const key = keyOverride ?? ("id" in data && data.id ? data.id : `section-${index}`);

  return createElement(Component, {
    key,
    section,
    spacingOverride,
  });
};

const renderSection = (section: Section, index: number): ReactElement | null => {
  const data = readFragment(SectionFragment, section);

  if (data.__typename === "sectionReference_Entry") {
    const referencedSection = data.referencedSection[0] ?? null;

    if (!referencedSection) {
      return null;
    }

    const referencedData = readFragment(
      RenderableSectionFragment,
      referencedSection,
    );
    const referenceId = data.id ?? `section-reference-${index}`;
    const referencedId =
      "id" in referencedData && referencedData.id
        ? referencedData.id
        : `referenced-section-${index}`;

    return renderRenderableSection(
      referencedSection,
      index,
      `${referenceId}:${referencedId}`,
      data,
    );
  }

  return renderRenderableSection(data, index);
};

export const SectionRouter = ({ sections }: Props) => {
  const children = sections
    ?.filter((section): section is Section => Boolean(section))
    .map(renderSection)
    .filter((section): section is ReactElement => Boolean(section));

  return createElement(Fragment, null, children);
};
