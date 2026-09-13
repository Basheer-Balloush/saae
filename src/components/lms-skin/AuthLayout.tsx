import type { ReactNode } from "react";

/** The auth card: brand panel beside the form column (login, signup, password pages). */
export function AuthLayout({ titleId, children }: { titleId: string; children: ReactNode }) {
  return (
    <section className="auth-wrap" aria-labelledby={titleId}>
      <div className="page-shell">
        <div className="auth-card">
          <div className="auth-brand">
            <img
              className="auth-logo"
              src="/cinematic/saae-logo-full.svg"
              alt="Syrian Association for AI & Entrepreneurship"
              width="402"
              height="609"
              decoding="async"
            />
          </div>
          <div className="auth-form">{children}</div>
        </div>
      </div>
    </section>
  );
}
