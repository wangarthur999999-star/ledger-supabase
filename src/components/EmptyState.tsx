import { CircleSlash } from "lucide-react";

interface EmptyStateProps {
  title: string;
  subtitle: string;
}

export default function EmptyState({ title, subtitle }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-16 h-16 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant">
        <CircleSlash size={32} />
      </div>
      <div className="text-center space-y-1">
        <p className="font-bold text-on-surface">{title}</p>
        <p className="text-sm text-on-surface-variant">{subtitle}</p>
      </div>
    </div>
  );
}
