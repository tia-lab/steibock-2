"use client";

import { type PageTransitionName } from "@/animations/transitions";
import { useCursorInteraction, usePageTransition } from "@/hooks";
import { LinkFragment } from "@/queries";
import { ModalStore, useModalStore } from "@/store/modal";
import { SidebarStore, useSidebarStore } from "@/store/sidebar";
import clsx from "clsx";
import type { FragmentOf } from "gql.tada";
import { readFragment } from "gql.tada";
import $ from "./style.module.scss";

type LinkEntry = FragmentOf<typeof LinkFragment>;

export interface ButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    | "onClick"
    | "onPointerEnter"
    | "onPointerLeave"
    | "onPointerDown"
    | "onPointerUp"
  > {
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  onPointerEnter?: React.PointerEventHandler<
    HTMLButtonElement | HTMLAnchorElement
  >;
  onPointerLeave?: React.PointerEventHandler<
    HTMLButtonElement | HTMLAnchorElement
  >;
  onPointerDown?: React.PointerEventHandler<
    HTMLButtonElement | HTMLAnchorElement
  >;
  onPointerUp?: React.PointerEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  nextJs?: boolean;
  href?: string;
  link?: LinkEntry | null;
  target?: "_blank" | "_self" | "_parent" | "_top";
  transition?: PageTransitionName;
  size?: "small" | "medium" | "large";
  modal?: ModalStore["type"];
  sidebar?: SidebarStore["type"];
  download?: boolean | string;
  variant?: "default" | "outline";
  children?: React.ReactNode;
}

export const Button = ({
  nextJs = true,
  target,
  onClick,
  size = "medium",
  href,
  link,
  transition,
  type = "button",
  modal,
  sidebar,
  download,
  variant = "default",
  className: externalClassName,
  onPointerEnter,
  onPointerLeave,
  onPointerDown,
  onPointerUp,

  children,
  "aria-label": ariaLabel,
  ...props
}: ButtonProps) => {
  const linkData = link ? readFragment(LinkFragment, link) : null;
  const pageUri = linkData?.pageLink[0]?.uri;
  const linkHref =
    linkData?.externalUrl || (pageUri ? `/${pageUri === "__home__" ? "" : pageUri}` : undefined);
  const resolvedHref = href ?? linkHref;
  const resolvedTarget =
    target ?? (linkData?.isExternal || linkData?.linkTarget === "_blank" ? "_blank" : "_self");
  const resolvedNextJs = nextJs && resolvedTarget !== "_blank";
  const resolvedChildren = children ?? linkData?.title;

  const setModalType = useModalStore((state) => state.setType);
  const setModalOpen = useModalStore((state) => state.updateOpen);
  const setSidebarType = useSidebarStore((state) => state.setType);
  const setSidebarOpen = useSidebarStore((state) => state.updateOpen);
  const { navigate } = usePageTransition();
  const cursorHandlers = useCursorInteraction<
    HTMLButtonElement | HTMLAnchorElement
  >({
    variant: "hover",
  });

  const className = clsx(
    $.button,
    $.button_primary,
    {
      [$.small]: size === "small",
      [$.medium]: size === "medium",
      [$.large]: size === "large",
      [$.outline]: variant === "outline",
    },
    externalClassName,
  );

  const handlePointerEnter: React.PointerEventHandler<
    HTMLButtonElement | HTMLAnchorElement
  > = (event) => {
    onPointerEnter?.(event);
    cursorHandlers.onPointerEnter?.(event);
  };

  const handlePointerLeave: React.PointerEventHandler<
    HTMLButtonElement | HTMLAnchorElement
  > = (event) => {
    onPointerLeave?.(event);
    cursorHandlers.onPointerLeave?.(event);
  };

  const handlePointerDown: React.PointerEventHandler<
    HTMLButtonElement | HTMLAnchorElement
  > = (event) => {
    onPointerDown?.(event);
    cursorHandlers.onPointerDown?.(event);
  };

  const handlePointerUp: React.PointerEventHandler<
    HTMLButtonElement | HTMLAnchorElement
  > = (event) => {
    onPointerUp?.(event);
    cursorHandlers.onPointerUp?.(event);
  };

  if (resolvedHref && !modal) {
    if (resolvedNextJs) {
      return (
        <a
          href={resolvedHref}
          className={className}
          aria-label={ariaLabel ?? "button link"}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onClick={(event) => {
            if (onClick) {
              onClick(event);
            }

            if (
              event.defaultPrevented ||
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey
            ) {
              return;
            }

            event.preventDefault();
            navigate(resolvedHref, { transition });
          }}
        >
          {resolvedChildren}
        </a>
      );
    }

    return (
      <a
        href={resolvedHref}
        target={resolvedTarget}
        rel={resolvedTarget === "_blank" ? "noopener noreferrer" : undefined}
        className={className}
        download={download}
        aria-label={ariaLabel ?? "button link"}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onClick={(event: any) => {
          if (onClick) {
            onClick(event);
          }
        }}
      >
        {resolvedChildren}
      </a>
    );
  }

  return (
    <button
      type={type}
      onClick={(event: any) => {
        if (modal) {
          setModalType(modal);
          setModalOpen(true);
        } else if (sidebar) {
          setSidebarType(sidebar);
          setSidebarOpen(true);
        }
        if (onClick) {
          onClick(event);
        }
      }}
      className={className}
      aria-label={ariaLabel ?? "type button"}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      {...props}
    >
      {resolvedChildren}
    </button>
  );
};
