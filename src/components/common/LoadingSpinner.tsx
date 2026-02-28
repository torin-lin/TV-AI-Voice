import React from 'react';

/**
 * 加载动画组件
 */
export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-cyan-500 animate-spin"></div>
      </div>
    </div>
  );
};
