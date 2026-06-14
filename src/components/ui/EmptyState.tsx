import { Plus } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({ message, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mb-4 text-2xl select-none">
        📦
      </div>
      <p className="text-sm text-muted max-w-xs leading-relaxed">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-500 hover:text-brand-600 transition-colors"
        >
          <Plus size={16} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
