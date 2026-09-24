/**
 * One row of single-choice filter chips (category, level, price).
 * Desktop: chips wrap. Phone: one swipeable row (lms-db.css), so a long
 * category list no longer stacks into several ragged lines.
 */
export type FilterChipOption = { value: string; label: string; count?: number };

export function FilterChips({
  label,
  showLabel = false,
  options,
  value,
  onChange,
}: {
  label: string;
  showLabel?: boolean;
  options: FilterChipOption[];
  value: string;
  onChange: (value: string) => void;
}) {
  const chips = (
    <div className="course-filters" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          <span>{o.label}</span>
          {o.count !== undefined ? <span className="chip-count">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
  if (!showLabel) return chips;
  return (
    <div className="filter-row">
      <span className="filter-label" aria-hidden="true">
        {label}
      </span>
      {chips}
    </div>
  );
}
