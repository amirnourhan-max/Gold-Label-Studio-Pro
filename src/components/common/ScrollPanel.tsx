import type { ComponentPropsWithoutRef } from "react";

export function ScrollPanel({ children, role = "region", tabIndex = 0, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div {...props} role={role} tabIndex={tabIndex}>{children}</div>;
}
