import React from 'react';
import { Recommendation } from '../store/recommendationsSlice';
import { Tag } from '../../../components/common/Tag';

interface RecommendationHistoryProps {
  recommendations: Recommendation[];
}

/**
 * 推荐历史组件
 * 显示推荐历史记录列表
 */
const RecommendationHistory: React.FC<RecommendationHistoryProps> = ({
  recommendations,
}) => {
  // 获取风险等级的颜色
  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case '低':
        return 'bg-green-100 text-green-800';
      case '中':
        return 'bg-yellow-100 text-yellow-800';
      case '高':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-3">
      {recommendations.map((rec) => (
        <div
          key={rec.id}
          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <p className="font-semibold text-gray-900">{rec.versionNumber}</p>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {rec.changeDescription}
              </p>
            </div>
            <Tag
              variant="primary"
              className={getRiskLevelColor(rec.riskLevel)}
            >
              {rec.riskLevel}
            </Tag>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex gap-4">
              <span>
                测试用例: {rec.recommendedTestCases.length}
              </span>
              <span>
                回归测试: {rec.recommendedRegressions.length}
              </span>
            </div>
            <span>
              {new Date(rec.createdAt).toLocaleString('zh-CN')}
            </span>
          </div>

          {/* 置信度 */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-gradient-to-r from-blue-600 to-cyan-500 h-1.5 rounded-full"
                style={{ width: `${rec.confidence * 100}%` }}
              ></div>
            </div>
            <span className="text-xs font-semibold text-gray-600 w-10">
              {(rec.confidence * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default RecommendationHistory;
