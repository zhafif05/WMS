import React from 'react';
import Card from './Card';

export const StatCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color = 'blue',
  className = '',
  onClick,
}) => {
  const colorMap = {
    blue: {
      bg: 'bg-blue-50 text-blue-600 border-blue-100',
      bar: 'bg-blue-600',
    },
    emerald: {
      bg: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      bar: 'bg-emerald-600',
    },
    amber: {
      bg: 'bg-amber-50 text-amber-600 border-amber-100',
      bar: 'bg-amber-600',
    },
    purple: {
      bg: 'bg-purple-50 text-purple-600 border-purple-100',
      bar: 'bg-purple-600',
    },
    rose: {
      bg: 'bg-rose-50 text-rose-600 border-rose-100',
      bar: 'bg-rose-600',
    },
    slate: {
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      bar: 'bg-slate-700',
    },
  };

  const scheme = colorMap[color] || colorMap.blue;

  return (
    <Card
      hoverEffect={!!onClick}
      onClick={onClick}
      className={`relative overflow-hidden cursor-pointer ${className}`}
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          {Icon && (
            <div className={`p-2.5 rounded-xl border ${scheme.bg} flex items-center justify-center shrink-0`}>
              <Icon className="w-5 h-5" />
            </div>
          )}
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900">{value}</span>
          {trend && (
            <span
              className={`text-xs font-semibold ${
                trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-rose-600' : 'text-slate-500'
              }`}
            >
              {trend > 0 ? `+${trend}` : trend}
            </span>
          )}
        </div>
        {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
      </div>
      <div className={`h-1 w-full ${scheme.bar}`} />
    </Card>
  );
};

export default StatCard;
