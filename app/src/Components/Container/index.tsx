import clsx from "clsx";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Container = ({
  children,
  className,
  ...props
}: ContainerProps) => {
  return (
    <div className={clsx("container", className)} {...props}>
      {children}
    </div>
  );
};
