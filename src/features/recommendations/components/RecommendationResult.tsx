import React from 'react';
import { Recommendation } from '../store/recommendationsSlice';
import { Tag } from '../../../components/common/Tag';

interface RecommendationResultProps {
  recommendation: Recommendation;
}

/**
 * 推荐结果显示组件
 * 显示 AI 生成的推荐结果
 */
const RecommendationResult: React.FC<RecommendationResultProps> = ({
  recommendation,
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
    <div className="space-y-4">
      {/* 版本信息 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">版本号</p>
          <p className="text-lg font-semibold text-gray-900">
            {recommendation.versionNumber}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">风险等级</p>
          <div className="mt-1">
            <Tag
              variant="primary"
              className={getRiskLevelColor(recommendation.riskLevel)}
            >
              {recommendation.riskLevel}
            </Tag>
          </div>
        </div>
      </div>

      {/* 修改内容 */}
      <div>
        <p className="text-sm text-gray-600 mb-2">修改内容</p>
        <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
          {recommendation.changeDescription}
        </p>
      </div>

      {/* 推荐的测试用例 */}
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-2">
          推荐的测试用例
        </p>
        <div className="flex flex-wrap gap-2">
          {recommendation.recommendedTestCases.map((testCase) => (
            <Tag key={testCase} variant="secondary">
              {testCase}
            </Tag>
          ))}
        </div>
      </div>

      {/* 推荐的回归测试 */}
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-2">
          推荐的回归测试
        </p>
        <div className="flex flex-wrap gap-2">
          {recommendation.recommendedRegressions.map((regression) => (
            <Tag key={regression} variant="secondary">
              {regression}
            </Tag>
          ))}
        </div>
      </div>

      {/* 推荐理由 */}
      <div>
        <p className="text-sm font-semibold text-gray-900 mb-2">推荐理由</p>
        <p className="text-gray-700 bg-blue-100 p-3 rounded-lg border border-blue-300">
          {recommendation.reasoning}
        </p>
      </div>

      {/* 置信度 */}
      <div>
        <p className="text-sm text-gray-600 mb-2">推荐置信度</p>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2 rounded-full"
              style={{ width: `${recommendation.confidence * 100}%` }}
            ></div>
          </div>
          <span className="text-sm font-semibold text-gray-900 w-12">
            {(recommendation.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* 生成时间 */}
      <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
        生成时间: {new Date(recommendation.createdAt).toLocaleString('zh-CN')}
      </div>
    </div>
  );
};

export default RecommendationResult;
