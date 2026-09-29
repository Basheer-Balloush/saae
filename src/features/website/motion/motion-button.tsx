import * as React from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type MotionButtonVariant = "primary" | "secondary";

interface MotionButtonBaseProps {
  /** Visible label. Rendered as the only text, so it is the accessible name. */
  label: string;
  variant?: MotionButtonVariant;
  /** Extra classes merged after the built-in ones. */
  classes?: string;
  /** Optional fade-up entrance on mount. Off by default. */
  animate?: boolean;
  /** Entrance delay in milliseconds. Only used when `animate` is true. */
  delay?: number;
}

export type MotionButtonButtonProps = MotionButtonBaseProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
    href?: undefined;
    children?: never;
  };

export type MotionButtonAnchorProps = MotionButtonBaseProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "children"> & {
    href: string;
    children?: never;
  };

export type MotionButtonProps = MotionButtonButtonProps | MotionButtonAnchorProps;

function MotionButtonContent({ label }: { label: string }) {
  return (
    <>
      <span
        aria-hidden="true"
        data-slot="motion-button-circle"
        className="absolute inset-y-1 start-1 w-12 rounded-full bg-[var(--motion-button-fill,var(--primary))] transition-[width] duration-500 ease-out group-hover:w-[calc(100%-0.5rem)] group-focus-visible:w-[calc(100%-0.5rem)] group-active:w-[calc(100%-0.5rem)] motion-reduce:transition-none"
      />
      <span
        aria-hidden="true"
        data-slot="motion-button-icon"
        className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--motion-button-icon,var(--primary-foreground))] transition-transform duration-500 ease-out group-hover:translate-x-[0.4rem] group-focus-visible:translate-x-[0.4rem] group-active:translate-x-[0.4rem] rtl:group-hover:-translate-x-[0.4rem] rtl:group-focus-visible:-translate-x-[0.4rem] rtl:group-active:-translate-x-[0.4rem] motion-reduce:transition-none"
      >
        <ArrowRight aria-hidden="true" className="size-6 rtl:-scale-x-100" />
      </span>
      <span
        data-slot="motion-button-label"
        className="relative z-10 max-w-full whitespace-nowrap pe-6 ps-14 text-lg font-medium tracking-tight text-[var(--motion-button-label,var(--foreground))] transition-colors duration-500 group-hover:text-[var(--motion-button-label-active,var(--primary-foreground))] group-focus-visible:text-[var(--motion-button-label-active,var(--primary-foreground))] group-active:text-[var(--motion-button-label-active,var(--primary-foreground))] motion-reduce:transition-none"
      >
        {label}
      </span>
    </>
  );
}

function rootClassName(
  variant: MotionButtonVariant,
  animate: boolean,
  mounted: boolean,
  className: string | undefined,
  classes: string | undefined,
) {
  return cn(
    "group relative inline-flex min-h-14 w-fit min-w-44 cursor-pointer items-center rounded-full p-1 outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    variant === "secondary"
      ? "border border-[var(--motion-button-border,var(--input))] bg-transparent"
      : "bg-[var(--motion-button-surface,var(--background))]",
    animate &&
      "transition-[opacity,transform] duration-500 ease-out motion-reduce:transition-none",
    animate && !mounted && "translate-y-2 opacity-0",
    className,
    classes,
  );
}

export default function MotionButton(props: MotionButtonProps) {
  const variant = props.variant ?? "primary";
  const animate = props.animate ?? false;
  const delay = props.delay ?? 0;

  const [mounted, setMounted] = React.useState(!animate);
  React.useEffect(() => {
    if (!animate) return;
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  // The mount delay must not leak into hover/focus transitions, so it only
  // applies until the entrance has played.
  const mountStyle: React.CSSProperties | undefined =
    animate && !mounted && delay ? { transitionDelay: `${delay}ms` } : undefined;
  const style: React.CSSProperties = { ...mountStyle, ...props.style };
  const className = rootClassName(variant, animate, mounted, props.className, props.classes);
  const content = <MotionButtonContent label={props.label} />;

  if (props.href !== undefined) {
    const {
      label: _label,
      variant: _variant,
      classes: _classes,
      animate: _animate,
      delay: _delay,
      ...anchorProps
    } = props;
    return (
      <a
        {...anchorProps}
        target={anchorProps.target}
        rel={anchorProps.target === "_blank" ? (anchorProps.rel ?? "noopener noreferrer") : anchorProps.rel}
        data-slot="motion-button"
        data-variant={variant}
        style={style}
        className={className}
      >
        {content}
      </a>
    );
  }

  const {
    label: _label,
    variant: _variant,
    classes: _classes,
    animate: _animate,
    delay: _delay,
    ...buttonProps
  } = props;
  return (
    <button
      type="button"
      {...buttonProps}
      data-slot="motion-button"
      data-variant={variant}
      style={style}
      className={className}
    >
      {content}
    </button>
  );
}
