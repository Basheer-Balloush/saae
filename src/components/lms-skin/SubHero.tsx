import type { ReactNode } from "react";

type Props = {
  id: string;
  eyebrow?: string;
  titleSpans: string[];
  /** Extra class for the h1, e.g. a smaller size for long course names. */
  titleClassName?: string;
  lede?: string;
  /** Rendered at the top of the copy column (breadcrumbs). */
  before?: ReactNode;
  /** Rendered inside the copy column, under the lede (the catalog search). */
  copyChildren?: ReactNode;
  /** Rendered beside the copy column (the verify card, a course cover). */
  children?: ReactNode;
};

/** The sub-page hero band shared by the inner LMS pages. */
export function SubHero({ id, eyebrow, titleSpans, titleClassName, lede, before, copyChildren, children }: Props) {
  return (
    <section className="lms-hero lms-subhero" aria-labelledby={id}>
      <div className="hero-grid" aria-hidden="true" />
      <div className={`page-shell lms-hero-inner${children ? " has-aside" : ""}`}>
        <div className="lms-hero-copy">
          {before}
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 id={id} className={titleClassName}>
            {titleSpans.map((span, i) => (
              <span key={i}>
                {i > 0 ? " " : null}
                {span}
              </span>
            ))}
          </h1>
          {lede ? <p className="lms-sublede">{lede}</p> : null}
          {copyChildren}
        </div>
        {children}
      </div>
    </section>
  );
}
