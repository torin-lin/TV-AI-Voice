import React from 'react';
import { KBRecommendation } from '../../../types/database';

interface Props {
  recommendation: KBRecommendation;
}

const SCORE_COLOR = (s: number) => s >= 20 ? 'bg-red-100 text-red-700' : s >= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600';

const RecommendationResult: React.FC<Props> = ({ recommendation: rec }) => {
  return (
    <div className="space-y-4">
      {/* 测试计划摘要 */}
      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-5 border border-blue-200">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📋</span>
          <h4 className="font-bold text-gray-900">测试计划</h4>
          {rec.usedAI && <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">🤖 AI 分析</span>}
        </div>
        <div className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{rec.testPlanSummary}</div>
      </div>

      {/* 风险分析 */}
      {rec.riskAnalysis && (
        <div className="bg-orange-50 rounded-xl p-5 border border-orange-200">
          <div className="flex items-center gap-2 mb-3">
            <span>⚠️</span>
            <h4 className="font-bold text-gray-900 text-sm">风险分析</h4>
          </div>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{rec.riskAnalysis}</div>
        </div>
      )}

      {/* 推荐测试用例 */}
      {rec.recommendedCases.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h4 className="font-bold text-gray-900 mb-3">🧪 推荐测试用例 ({rec.recommendedCases.length})</h4>
          <div className="space-y-2">
            {rec.recommendedCases.map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 bg-gray-50 rounded-lg">
                <span className="text-xs text-gray-400 font-mono mt-0.5 shrink-0 w-5">{i + 1}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold shrink-0 ${SCORE_COLOR(c.score)}`}>{c.score >= 100 ? 'AI' : c.score + '分'}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900">{c.caseName}</span>
                  {c.reason && <p className="text-xs text-gray-500 mt-0.5">{c.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 需要复测的问题 */}
      {rec.retestIssues.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h4 className="font-bold text-gray-900 mb-3">🔄 需要复测的问题 ({rec.retestIssues.length})</h4>
          <div className="space-y-2">
            {rec.retestIssues.map((r, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${SCORE_COLOR(r.score)}`}>{r.score}分</span>
                <span className="text-sm text-gray-900 flex-1 truncate">{r.title}</span>
                <span className="text-xs text-gray-400 max-w-[200px] truncate">{r.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 无匹配 */}
      {rec.recommendedCases.length === 0 && rec.retestIssues.length === 0 && (
        <div className="bg-gray-50 rounded-xl p-8 text-center text-gray-400">
          <p>未匹配到相关用例和问题，建议丰富知识库内容</p>
        </div>
      )}

      <div className="text-xs text-gray-400 text-right">
        生成时间: {new Date(rec.createdAt).toLocaleString('zh-CN')}
      </div>
    </div>
  );
};

export default RecommendationResult;
