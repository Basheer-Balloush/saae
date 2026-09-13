import type { ReactNode } from "react";

type Props = {
  id: string;
  eyebrow?: string;
  titleSpans: string[];
  lede?: string;
  /** Rendered inside the copy column, under the lede (the catalog search). */
  copyChildren?: ReactNode;
  /** Rendered beside the copy column (the verify card). */
  children?: ReactNode;
};

/** The sub-page hero band shared by the inner LMS pages. */
export function SubHero({ id, eyebrow, titleSpans, lede, copyChildren, children }: Props) {
  return (
    <section className="lms-hero lms-subhero" aria-labelledby={id}>
      <div className="hero-grid" aria-hidden="true" />
      <div className="page-shell lms-hero-inner">
        <div className="lms-hero-copy">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 id={id}>
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
