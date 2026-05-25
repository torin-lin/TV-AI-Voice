import React from 'react';

interface TagProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  className?: string;
}

/**
 * 通用标签组件
 */
export const Tag: React.FC<TagProps> = ({
  children,
  variant = 'primary',
  className = '',
}) => {
  const baseClasses = 'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium';

  const variantClasses = {
    primary: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    secondary: 'border-slate-200 bg-slate-50 text-slate-600',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};
