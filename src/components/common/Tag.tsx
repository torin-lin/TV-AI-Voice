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
  const baseClasses = 'inline-block px-2.5 py-0.5 rounded-full text-xs font-medium';

  const variantClasses = {
    primary: 'bg-blue-200 text-blue-700',
    secondary: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};
