'use client';

import React, { useEffect, useState } from 'react';

interface OrderDonutChartProps {
  total: number;
  pending: number;
  processing: number;
  completed: number;
}

const SIZE   = 170;
const CX     = SIZE / 2;
const CY     = SIZE / 2;
const RADIUS = 64;
const STROKE = 20;
const CIRC   = 2 * Math.PI * RADIUS;
const GAP    = 4;

const SEGMENTS = [
  { key: 'pending',    color: '#f59e0b', glow: 'rgba(245,158,11,0.3)' },
  { key: 'processing', color: '#3b82f6', glow: 'rgba(59,130,246,0.3)' },
  { key: 'completed',  color: '#10b981', glow: 'rgba(16,185,129,0.3)' },
] as const;

export function OrderDonutChart({ total, pending, processing, completed }: OrderDonutChartProps) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  const values = { pending, processing, completed };
  const isEmpty = total === 0;

  let cumLen = 0;
  const arcs = SEGMENTS.map((seg) => {
    const raw     = isEmpty ? 0 : (values[seg.key] / total) * CIRC;
    const arcLen  = Math.max(0, raw - GAP);
    const offset  = -cumLen;
    cumLen       += raw;
    return { ...seg, arcLen, offset, count: values[seg.key] };
  });

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      aria-label="Order status donut chart"
    >
      <defs>
        {SEGMENTS.map((seg) => (
          <filter key={seg.key} id={`glow-${seg.key}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor={seg.glow} result="color" />
            <feComposite in="color" in2="blur" operator="in" result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        ))}
      </defs>

      {/* Background track */}
      <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={STROKE} />

      {isEmpty ? (
        /* Dashed empty state ring */
        <circle
          cx={CX} cy={CY} r={RADIUS}
          fill="none"
          stroke="#e0d9f7"
          strokeWidth={STROKE}
          strokeDasharray={`${CIRC * 0.65} ${CIRC}`}
          transform={`rotate(-90 ${CX} ${CY})`}
          strokeLinecap="round"
        />
      ) : (
        arcs.filter((a) => a.arcLen > 0).map((arc) => (
          <circle
            key={arc.key}
            cx={CX} cy={CY} r={RADIUS}
            fill="none"
            stroke={arc.color}
            strokeWidth={STROKE}
            strokeDasharray={`${animated ? arc.arcLen : 0} ${CIRC}`}
            strokeDashoffset={arc.offset}
            transform={`rotate(-90 ${CX} ${CY})`}
            strokeLinecap="butt"
            style={{ transition: 'stroke-dasharray 0.75s cubic-bezier(0.4,0,0.2,1)' }}
          />
        ))
      )}

      {/* Center: total number */}
      <text
        x={CX} y={CY - 8}
        textAnchor="middle"
        style={{ fontSize: 32, fontWeight: 800, fill: '#111827', fontFamily: 'Manrope, sans-serif' }}
      >
        {total}
      </text>
      <text
        x={CX} y={CY + 16}
        textAnchor="middle"
        style={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af', fontFamily: 'Inter, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        {isEmpty ? 'No data' : 'Orders'}
      </text>
    </svg>
  );
}
