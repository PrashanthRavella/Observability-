import React, { useRef } from 'react';
import ReactECharts from 'echarts-for-react';

interface DynamicChartProps {
    type: string;
    title: string;
    description: string;
    data: any[];
}

export const DynamicChart: React.FC<DynamicChartProps> = ({ type, title, description, data }) => {
    const chartRef = useRef<ReactECharts>(null);

    const getOption = () => {
        if (!data || data.length === 0) return {};

        const isTime = !!data[0].timestamp || !!data[0].time;
        const keys = Object.keys(data[0]);
        const valueKey = keys.find(k => typeof data[0][k] === 'number') || keys[1];
        const categoryKey = keys.find(k => k !== valueKey) || keys[0];

        const baseOption: any = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: type === 'pie' || type === 'gauge' ? 'item' : 'axis',
                backgroundColor: 'rgba(10, 12, 18, 0.95)',
                borderColor: 'rgba(59, 130, 246, 0.2)',
                borderWidth: 1,
                padding: [12, 16],
                textStyle: { color: '#D1D5DB', fontFamily: 'Outfit', fontSize: 11 },
                shadowColor: 'rgba(0, 0, 0, 0.5)',
                shadowBlur: 10,
                transitionDuration: 0.2,
                borderRadius: 12
            },
            title: { show: false },
            animationDuration: 1000,
            animationDurationUpdate: 500
        };

        if (type === 'gauge') {
            const val = data.length > 0 ? Number(data[0][valueKey]) : 0;
            return {
                ...baseOption,
                series: [{
                    type: 'gauge',
                    progress: {
                        show: true,
                        width: 12,
                        itemStyle: { 
                            color: {
                                type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
                                colorStops: [{ offset: 0, color: '#3b82f6' }, { offset: 1, color: '#6366f1' }]
                            }
                        }
                    },
                    axisLine: {
                        lineStyle: { width: 12, color: [[1, 'rgba(255,255,255,0.05)']] }
                    },
                    axisTick: { show: false },
                    splitLine: { length: 5, lineStyle: { color: 'rgba(255,255,255,0.1)' } },
                    axisLabel: { color: '#4B5563', fontSize: 10, distance: 20 },
                    pointer: { itemStyle: { color: '#818cf8' }, width: 4 },
                    detail: {
                        valueAnimation: true,
                        fontSize: 28,
                        color: '#F9FAFB',
                        fontWeight: 'bold',
                        fontFamily: 'Outfit',
                        offsetCenter: [0, '70%'],
                        formatter: `{value}`
                    },
                    data: [{ value: val }]
                }]
            };
        }

        if (type === 'pie') {
            return {
                ...baseOption,
                series: [{
                    type: 'pie',
                    radius: ['45%', '75%'],
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderRadius: 8,
                        borderColor: '#0a0c12',
                        borderWidth: 3
                    },
                    color: ['#3b82f6', '#6366f1', '#10b981', '#f59e0b', '#ef4444'],
                    label: { show: false },
                    data: data.map(d => ({ name: d[categoryKey], value: d[valueKey] }))
                }]
            };
        }

        // Line and Bar
        let xAxisData = data.map(d => isTime ? new Date(d[categoryKey]).toLocaleTimeString() : d[categoryKey]);
        let seriesData = data.map(d => d[valueKey]);

        return {
            ...baseOption,
            grid: { top: 40, right: 10, bottom: 20, left: 40, containLabel: true },
            xAxis: {
                type: 'category',
                data: xAxisData,
                axisLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
                axisLabel: { color: '#6B7280', fontSize: 9, fontFamily: 'Outfit' },
                splitLine: { show: false }
            },
            yAxis: {
                type: 'value',
                splitLine: { lineStyle: { color: 'rgba(255,255,255,0.03)', type: 'dashed' } },
                axisLabel: { color: '#6B7280', fontSize: 9, fontFamily: 'Outfit' }
            },
            series: [{
                type,
                data: seriesData,
                smooth: true,
                symbol: 'circle',
                symbolSize: 4,
                showSymbol: false,
                areaStyle: type === 'line' ? {
                    color: {
                        type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                        colorStops: [
                            { offset: 0, color: 'rgba(59, 130, 246, 0.3)' },
                            { offset: 1, color: 'rgba(59, 130, 246, 0)' }
                        ]
                    }
                } : undefined,
                itemStyle: { 
                    color: '#3b82f6', 
                    borderRadius: type === 'bar' ? [6, 6, 0, 0] : 0,
                    shadowBlur: type === 'line' ? 10 : 0,
                    shadowColor: 'rgba(59, 130, 246, 0.5)'
                },
                barMaxWidth: 20,
                lineStyle: { width: 3, color: '#3b82f6' },
                animationEasing: 'cubicOut'
            }]
        };
    };

    return (
        <div className="flex flex-col h-full w-full">
            <div className="mb-4">
                <h3 className="text-xs font-bold text-gray-200 tracking-tight uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1 h-3 bg-accent rounded-full"></span>
                    {title}
                </h3>
                <p className="text-[10px] text-gray-600 font-medium italic mt-0.5">{description}</p>
            </div>
            <div className="flex-1 min-h-0">
                <ReactECharts 
                    ref={chartRef}
                    option={getOption()} 
                    style={{ height: '100%', width: '100%' }} 
                    notMerge={false}
                    lazyUpdate={true}
                />
            </div>
        </div>
    );
};
