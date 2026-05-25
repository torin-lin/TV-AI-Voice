import React from 'react';

/**
 * 加载动画组件
 */
export const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center">
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-4 border-slate-200"></div>
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-r-indigo-400 border-t-indigo-600"></div>
      </div>
    </div>
  );
};
