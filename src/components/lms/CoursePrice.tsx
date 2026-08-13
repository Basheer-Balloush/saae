type Props = {
  price: number;
  salePrice?: number | null;
  isFree: boolean;
  lang: "ar" | "en";
  freeLabel: string;
  className?: string;
  size?: "sm" | "lg";
};

function Amount({ value, lang }: { value: number; lang: "ar" | "en" }) {
  return (
    <span dir="ltr" className="inline-flex flex-row items-center gap-1">
      {lang === "ar" ? (
        <>
          <span dir="rtl">ل.س</span>
          <span>{Number(value).toLocaleString()}</span>
        </>
      ) : (
        <>
          <span>{Number(value).toLocaleString()}</span>
          <span>SYP</span>
        </>
      )}
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

  return (
    <span className={`inline-flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      {hasSale && (
        <span
          className={`text-muted-foreground line-through ${size === "sm" ? "text-[11px]" : "text-base font-medium"}`}
        >
          <Amount value={Number(price)} lang={lang} />
        </span>
      )}
      <span>
        <Amount value={hasSale ? Number(salePrice) : Number(price)} lang={lang} />
      </span>
    </span>
  );
}
