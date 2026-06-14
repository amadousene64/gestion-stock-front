import type { HTMLAttributes } from 'react';

export default function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`bg-surface rounded-card shadow-card ${className}`} {...props}>
      {children}
    </div>
  );
}
