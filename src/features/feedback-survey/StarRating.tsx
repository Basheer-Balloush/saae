import { useRef } from "react";
import {
  NA_LABEL,
  RATING_LABELS,
  type AnswerValue,
  type Lang,
} from "@/features/feedback-survey/lib/feedback-survey";

export function StarRating({
  id,
  label,
  value,
  onChange,
  allowNA,
  lang,
  invalid,
}: {
  id: string;
  label: string;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
  allowNA: boolean;
  lang: Lang;
  invalid?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = typeof value === "number" ? value : 0;
  const options: AnswerValue[] = allowNA ? [1, 2, 3, 4, 5, "na"] : [1, 2, 3, 4, 5];
  const focusIdx = value === undefined ? 0 : options.indexOf(value);

  const onKey = (e: React.KeyboardEvent, idx: number) => {
    const rtl = lang === "ar";
    let next = idx;
    if (e.key === "ArrowRight") next = rtl ? idx - 1 : idx + 1;
    else if (e.key === "ArrowLeft") next = rtl ? idx + 1 : idx - 1;
    else if (e.key === "ArrowUp") next = idx + 1;
    else if (e.key === "ArrowDown") next = idx - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = options.length - 1;
    else return;
    e.preventDefault();
    next = (next + options.length) % options.length;
    onChange(options[next]!);
    refs.current[next]?.focus();
  };

  const errId = `${id}-err`;
  return (
    <fieldset
      className={`fb-q ${invalid ? "is-invalid" : ""}`}
      aria-describedby={invalid ? errId : undefined}
    >
      <legend className="fb-q-label">{label}</legend>
      <div className="fb-stars-row">
        <div role="radiogroup" aria-label={label} className="fb-stars">
          {options.map((opt, idx) => {
            if (opt === "na") {
              return (
                <button
                  key="na"
                  ref={(el) => {
                    refs.current[idx] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={value === "na"}
                  tabIndex={idx === (focusIdx < 0 ? 0 : focusIdx) ? 0 : -1}
                  className={`fb-na ${value === "na" ? "is-on" : ""}`}
                  onClick={() => onChange("na")}
                  onKeyDown={(e) => onKey(e, idx)}
                >
                  {NA_LABEL[lang]}
                </button>
              );
            }
            const filled = opt <= current;
            return (
              <button
                key={opt}
                ref={(el) => {
                  refs.current[idx] = el;
                }}
                type="button"
                role="radio"
                aria-checked={value === opt}
                aria-label={`${opt} – ${RATING_LABELS[lang][opt]}`}
                tabIndex={idx === (focusIdx < 0 ? 0 : focusIdx) ? 0 : -1}
                className={`fb-star ${filled ? "is-on" : ""}`}
                onClick={() => onChange(opt)}
                onKeyDown={(e) => onKey(e, idx)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" />
                </svg>
              </button>
            );
          })}
        </div>
        <span className="fb-star-value" aria-live="polite">
          {typeof value === "number"
            ? `${value}/5 · ${RATING_LABELS[lang][value]}`
            : value === "na"
              ? NA_LABEL[lang]
              : ""}
        </span>
      </div>
      {invalid && (
        <p id={errId} className="fb-err" role="alert">
          {lang === "ar"
            ? "يرجى اختيار تقييم لهذا السؤال."
            : "Please choose a rating for this question."}
        </p>
      )}
    </fieldset>
  );
}
