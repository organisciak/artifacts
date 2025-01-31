import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';

type AlertVariant = 'warning' | 'error' | 'info' | 'success';

interface AlertBadgeProps {
  variant?: AlertVariant;
  message: string;
}

const variantStyles: Record<AlertVariant, { bg: string; text: string; icon: React.ElementType }> = {
  warning: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    icon: AlertTriangle
  },
  error: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: AlertCircle
  },
  info: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: Info
  },
  success: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: CheckCircle
  }
};

export function AlertBadge({ variant = 'warning', message }: AlertBadgeProps) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-sm ${styles.text} ${styles.bg} rounded-full`}>
      <Icon className="h-4 w-4" />
      <p>{message}</p>
    </div>
  );
} 