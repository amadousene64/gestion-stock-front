import type { SelectHTMLAttributes } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
}

export default function Select({
  label,
  options,
  placeholder,
  error,
  id,
  className = '',
  ...props
}: SelectProps) {
  const selectId =
    id ?? label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={selectId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={selectId}
        className={[
          'min-h-[48px] w-full rounded-control border bg-surface px-4 py-3',
          'text-base text-ink',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          error ? 'border-danger focus:ring-danger' : 'border-line',
          className,
        ].join(' ')}
        {...props}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map(({ value, label: lbl }) => (
          <option key={value} value={value}>
            {lbl}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
