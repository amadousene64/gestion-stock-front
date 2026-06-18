interface PageHeaderProps {
  /** Left side — pass an <h1>, <h2>, or a <div> with title+subtitle. */
  title: React.ReactNode;
  /** Right side — action buttons. Not rendered when falsy. */
  children?: React.ReactNode;
  /** Extra classes on the outer wrapper (e.g. spacing overrides). */
  className?: string;
}

/**
 * Mobile-first page header: title on top, actions below on small screens;
 * side-by-side on sm+ (640 px and up).
 */
export default function PageHeader({ title, children, className = '' }: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="min-w-0">{title}</div>
      {children && <div className="w-full sm:w-auto sm:shrink-0">{children}</div>}
    </div>
  );
}
