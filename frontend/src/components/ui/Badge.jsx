import React from 'react';
import { JOB_STATUS_BADGE_STYLES, JOB_STATUS_LABELS } from '../../utils/constants';

export const Badge = ({
  status,
  label,
  variant = 'default',
  size = 'md',
  showDot = true,
  className = '',
}) => {
  // If status is passed (like 'received', 'analysis', etc.)
  if (status && JOB_STATUS_BADGE_STYLES[status]) {
    const style = JOB_STATUS_BADGE_STYLES[status];
    const displayText = label || JOB_STATUS_LABELS[status] || status;
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full border px-2.5 py-0.5 text-xs ${style.bg} ${style.text} ${style.border} ${className}`}
      >
        {showDot && <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />}
        {displayText}
      </span>
    );
  }

  // Variant mapping
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    primary: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.25',
    md: 'text-xs px-2.5 py-0.5',
    lg: 'text-sm px-3 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${variants[variant] || variants.default} ${sizes[size]} ${className}`}
    >
      {showDot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />}
      {label}
    </span>
  );
};

export default Badge;
