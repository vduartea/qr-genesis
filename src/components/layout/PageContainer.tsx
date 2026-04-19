import { cn } from "@/lib/utils";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
  xl: "max-w-7xl",
};

export function PageContainer({
  className,
  size = "xl",
  children,
  ...props
}: PageContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-6 py-12 md:py-16", sizes[size], className)} {...props}>
      {children}
    </div>
  );
}
