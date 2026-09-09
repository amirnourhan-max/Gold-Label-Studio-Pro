export const shellRoutes = [
  "dashboard",
  "product-registration",
  "label-print",
  "label-designer",
  "packaging",
  "returns",
  "products",
  "settings",
] as const;

export type ShellRoute = (typeof shellRoutes)[number];

export function isShellRoute(value: string | null): value is ShellRoute {
  return value !== null && shellRoutes.includes(value as ShellRoute);
}
