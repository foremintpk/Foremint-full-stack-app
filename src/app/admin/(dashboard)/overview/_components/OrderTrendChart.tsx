'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DailyTrendPoint } from '@/types/admin';

interface OrderTrendChartProps {
  data: DailyTrendPoint[];
}

const formatLabel = (date: string) => {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e0d9f7] rounded-xl px-4 py-3 shadow-lg text-xs font-inter min-w-[140px]">
      <p className="font-bold text-gray-500 mb-2 uppercase tracking-wide" style={{ fontSize: 10 }}>
        {formatLabel(label)}
      </p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-gray-600 font-medium">{p.name}</span>
          </div>
          <span className="font-bold text-gray-900">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function CustomLegend({ payload }: any) {
  return (
    <div className="flex items-center justify-center gap-6 mt-2">
      {payload?.map((entry: any) => (
        <div key={entry.value} className="flex items-center gap-1.5">
          <span className="w-3 h-1.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-gray-500 font-inter font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}

export function OrderTrendChart({ data }: OrderTrendChartProps) {
  const hasData = data.some((d) => d.llcOrders > 0 || d.paypalOrders > 0);

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-48 text-xs text-gray-400 font-inter font-medium">
        No order activity in this period
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    LLC: d.llcOrders,
    PayPal: d.paypalOrders,
  }));

  // Downsample to max 30 points so the x-axis stays readable
  const maxPoints = 30;
  const step = Math.max(1, Math.ceil(chartData.length / maxPoints));
  const sampled = chartData.filter((_, i) => i % step === 0);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={sampled} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradLLC" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradPayPal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatLabel}
          tick={{ fontSize: 10, fontFamily: 'Inter, sans-serif', fill: '#9ca3af', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 10, fontFamily: 'Inter, sans-serif', fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
        <Area
          type="monotone"
          dataKey="LLC"
          name="LLC Orders"
          stroke="#3b82f6"
          strokeWidth={2.5}
          fill="url(#gradLLC)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: '#3b82f6' }}
        />
        <Area
          type="monotone"
          dataKey="PayPal"
          name="PayPal Orders"
          stroke="#10b981"
          strokeWidth={2.5}
          fill="url(#gradPayPal)"
          dot={false}
          activeDot={{ r: 4, strokeWidth: 0, fill: '#10b981' }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
