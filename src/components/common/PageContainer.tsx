import type { ComponentPropsWithoutRef } from "react";

export function PageContainer({ children, ...props }: ComponentPropsWithoutRef<"main">) {
  return <main {...props}>{children}</main>;
}
