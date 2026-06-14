import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, id, className = '', ...props }: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') : undefined);

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          'min-h-[48px] w-full rounded-control border bg-surface px-4 py-3',
          'text-base text-ink placeholder:text-muted',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
          error ? 'border-danger focus:ring-danger' : 'border-line',
          className,
        ].join(' ')}
        {...props}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
