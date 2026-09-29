type Size = "xs" | "sm" | "lg";

type Props = {
  price: number;
  salePrice?: number | null;
  isFree: boolean;
  lang: "ar" | "en";
  freeLabel: string;
  className?: string;
  size?: Size;
};

function Amount({
  value,
  lang,
  struck,
  className,
}: {
  value: number;
  lang: "ar" | "en";
  struck?: boolean;
  className?: string;
}) {
  // The line-through lives on this single inline element (not on a flex wrapper),
  // so the rule paints across the amount + currency in both RTL and LTR.
  return (
    <span
      dir="ltr"
      className={`inline-block whitespace-nowrap ${struck ? "line-through decoration-from-font" : ""} ${className ?? ""}`}
    >
      {lang === "ar"
        ? `\u200Eل.س ${Number(value).toLocaleString("en-US")}`
        : `${Number(value).toLocaleString("en-US")} SYP`}
    </span>
  );
}

/**
 * Optional sale price: when set (and lower than the regular price) the
 * original price is shown struck through before the discounted price.
 */
export function CoursePrice({
  price,
  salePrice,
  isFree,
  lang,
  freeLabel,
  className,
  size = "lg",
}: Props) {
  if (isFree) return <span className={className}>{freeLabel}</span>;

  const hasSale = salePrice != null && Number(salePrice) >= 0 && Number(salePrice) < Number(price);
  const oldSize = size === "lg" ? "text-base font-medium" : size === "sm" ? "text-[11px]" : "text-[10px]";

  return (
    <span className={`inline-flex flex-nowrap items-center gap-2 ${className ?? ""}`}>
      {hasSale && (
        <Amount
          value={Number(price)}
          lang={lang}
          struck
          className={`text-muted-foreground ${oldSize}`}
        />
      )}
      <Amount value={hasSale ? Number(salePrice) : Number(price)} lang={lang} />
    </span>
  );
}
