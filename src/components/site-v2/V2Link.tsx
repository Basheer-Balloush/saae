import { Link } from "@tanstack/react-router";
import type { ComponentProps } from "react";

type LinkProps = Omit<ComponentProps<typeof Link>, "to" | "hash" | "params">;

export type V2LinkProps = LinkProps & {
  /**
   * Route path. Typed as a plain string because the v2 chrome links to routes
   * that later migration phases add (for example `/partners`, created in
   * Phase 1). The cast is confined to this one component.
   */
  to: string;
  hash?: string;
  /** Route params for dynamic segments; loosely typed for the same reason. */
  params?: Record<string, string>;
};

/** Internal navigation for the v2 chrome. Always a router Link, never an <a>. */
export function V2Link({ to, hash, params, ...rest }: V2LinkProps) {
  const Any = Link as unknown as React.ComponentType<Record<string, unknown>>;
  return <Any to={to} hash={hash} params={params} {...rest} />;
}

export default V2Link;
