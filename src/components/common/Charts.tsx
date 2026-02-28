import React from 'react';

interface ChartData {
  labels: string[];
  data: number[];
}

interface LineChartProps {
  data: ChartData;
}

interface PieChartProps {
  data: ChartData;
}

/**
 * 折线图组件
 */
export const LineChart: React.FC<LineChartProps> = ({ data }) => {
  const maxValue = Math.max(...data.data);
  const chartHeight = 200;

  return (
    <div className="w-full h-64 flex items-end justify-between gap-2 p-4 bg-gray-50 rounded-lg">
      {data.data.map((value, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <div
            className="w-full bg-gradient-to-t from-blue-600 to-cyan-500 rounded-t-lg transition-all hover:opacity-80"
            style={{
              height: `${(value / maxValue) * chartHeight}px`,
            }}
          ></div>
          <span className="text-xs text-gray-600">{data.labels[index]}</span>
          <span className="text-xs font-semibold text-gray-900">{value}</span>
        </div>
      ))}
    </div>
  );
};

/**
 * 饼图组件
 */
export const PieChart: React.FC<PieChartProps> = ({ data }) => {
  const total = data.data.reduce((sum, val) => sum + val, 0);
  const colors = [
    '#10B981',
    '#F59E0B',
    '#EF4444',
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
  ];

  let currentAngle = 0;
  const slices = data.data.map((value, index) => {
    const sliceAngle = (value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 100 + 80 * Math.cos(startRad);
    const y1 = 100 + 80 * Math.sin(startRad);
    const x2 = 100 + 80 * Math.cos(endRad);
    const y2 = 100 + 80 * Math.sin(endRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;

    const pathData = [
      `M 100 100`,
      `L ${x1} ${y1}`,
      `A 80 80 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    return (
      <g key={index}>
        <path d={pathData} fill={colors[index % colors.length]} />
      </g>
    );
  });

  return (
    <div className="flex items-center justify-between">
      <svg width="200" height="200" viewBox="0 0 200 200">
        {slices}
        <circle cx="100" cy="100" r="40" fill="white" />
      </svg>
      <div className="flex-1 space-y-2">
        {data.labels.map((label, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: colors[index % colors.length] }}
            ></div>
            <span className="text-sm text-gray-700">
              {label}: {data.data[index]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
