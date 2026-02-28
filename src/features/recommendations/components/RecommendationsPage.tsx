import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import {
  generateRecommendation,
  clearHistory,
} from '../store/recommendationsSlice';
import RecommendationForm from './RecommendationForm';
import RecommendationResult from './RecommendationResult';
import RecommendationHistory from './RecommendationHistory';
import { Button } from '../../../components/common/Button';

/**
 * AI 推荐引擎页面
 * 主页面容器，管理推荐生成和历史记录
 */
const RecommendationsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { currentRecommendation, history, loading, error } = useSelector(
    (state: RootState) => state.recommendations
  );

  const [showHistory, setShowHistory] = useState(false);

  // 处理生成推荐
  const handleGenerateRecommendation = async (data: {
    versionNumber: string;
    changeDescription: string;
    riskLevel: '低' | '中' | '高';
  }) => {
    try {
      await dispatch(generateRecommendation(data)).unwrap();
    } catch (error) {
      console.error('生成推荐失败:', error);
    }
  };

  // 处理清除历史
  const handleClearHistory = () => {
    if (window.confirm('确定要清除所有推荐历史吗？')) {
      dispatch(clearHistory());
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">AI 推荐引擎</h1>
          <p className="text-gray-600 mt-2">
            基于版本修改内容和风险等级，智能推荐测试用例和回归测试
          </p>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：推荐表单 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">生成推荐</h2>
              <RecommendationForm
                onSubmit={handleGenerateRecommendation}
                loading={loading}
              />
            </div>
          </div>

          {/* 右侧：推荐结果和历史 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 推荐结果 */}
            {currentRecommendation && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">推荐结果</h2>
                <RecommendationResult recommendation={currentRecommendation} />
              </div>
            )}

            {/* 推荐历史 */}
            {history.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">推荐历史</h2>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowHistory(!showHistory)}
                      variant="secondary"
                      size="sm"
                    >
                      {showHistory ? '隐藏' : '显示'}
                    </Button>
                    <Button
                      onClick={handleClearHistory}
                      variant="danger"
                      size="sm"
                    >
                      清除
                    </Button>
                  </div>
                </div>

                {showHistory && (
                  <RecommendationHistory recommendations={history} />
                )}

                {!showHistory && (
                  <p className="text-gray-600">
                    共 {history.length} 条推荐记录
                  </p>
                )}
              </div>
            )}

            {/* 空状态 */}
            {!currentRecommendation && history.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <p className="text-gray-500 text-lg">
                  填写左侧表单生成推荐
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationsPage;
