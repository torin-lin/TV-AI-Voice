import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 通用卡片组件
 */
export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
};
