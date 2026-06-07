'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { EarningsBreakdown } from '@/types/admin';

interface EarningsBarChartProps {
  earnings: EarningsBreakdown;
}

const BARS = [
  { key: 'llcRevenue',          label: 'LLC Formations',     color: '#10b981' },
  { key: 'paypalRevenue',       label: 'PayPal Accounts',    color: '#3b82f6' },
  { key: 'invoiceCommissions',  label: 'Invoice Commissions', color: '#34088f' },
];

const formatUSD = (v: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e0d9f7] rounded-xl px-4 py-2.5 shadow-lg text-xs font-inter">
      <p className="font-bold text-gray-700 mb-0.5">{label}</p>
      <p className="font-bold text-[#34088f]">{formatUSD(payload[0].value)}</p>
    </div>
  );
}

export function EarningsBarChart({ earnings }: EarningsBarChartProps) {
  const data = BARS.map((b) => ({
    name: b.label,
    amount: (earnings as any)[b.key] as number,
    color: b.color,
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barSize={36} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fill: '#6b7280', fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
          tick={{ fontSize: 10, fontFamily: 'Inter, sans-serif', fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f4f0fe', radius: 6 }} />
        <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
