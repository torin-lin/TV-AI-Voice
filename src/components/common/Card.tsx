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
      className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow ${className}`}
    >
      {children}
    </div>
  );
};
