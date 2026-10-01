import clsx from "clsx";

export interface WrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  fluid?: "left" | "right" | "full";
  container?: boolean;
}

export const Wrapper = ({
  children,
  fluid,
  container,
  className,
  ...props
}: WrapperProps) => {
  return (
    <div
      className={clsx("main-wrapper", className, {
        "is-fluid-left": fluid === "left",
        "is-fluid-right": fluid === "right",
        "is-fluid": fluid === "full",
      })}
      {...props}
    >
      {container ? <div className="container">{children}</div> : children}
    </div>
  );
};
