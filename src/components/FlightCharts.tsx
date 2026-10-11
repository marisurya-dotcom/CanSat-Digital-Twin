/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TelemetryPoint } from '../types/cansat';

interface FlightChartsProps {
  history: TelemetryPoint[];
  targetAltitude: number;
}

export const FlightCharts: React.FC<FlightChartsProps> = ({
  history,
  targetAltitude,
}) => {
  const [selectedChannel, setSelectedChannel] = useState<'dynamics' | 'environmental' | 'power'>('dynamics');

  const displayData = history.length > 250
    ? downsamplePoints(history, 200)
    : history;

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs flex flex-col">
      {/* Header & Chart Channel Selector */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-800">
            Flight Telemetry Graphs
          </span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs font-mono text-slate-500">
            {history.length} SAMPLES
          </span>
        </div>

        {/* Channel Segmented Switcher */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setSelectedChannel('dynamics')}
            className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap font-medium ${
              selectedChannel === 'dynamics'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Flight Dynamics (Alt & Vel)
          </button>
          <button
            onClick={() => setSelectedChannel('environmental')}
            className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap font-medium ${
              selectedChannel === 'environmental'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Atmosphere (Press & Temp)
          </button>
          <button
            onClick={() => setSelectedChannel('power')}
            className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap font-medium ${
              selectedChannel === 'power'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Battery & Power (V & mA)
          </button>
        </div>
      </div>

      {/* Main Graph Area */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {selectedChannel === 'dynamics' && (
          <>
            <SvgTimeSeriesChart
              title="Altitude vs Time"
              unit="m"
              data={displayData}
              getValue={(p) => p.altitude}
              color="#0284c7" // sky-600
              minY={0}
              maxY={Math.max(targetAltitude * 1.15, ...displayData.map((d) => d.altitude), 100)}
              targetLine={{ value: targetAltitude, label: `Target ${targetAltitude}m` }}
            />
            <SvgTimeSeriesChart
              title="Vertical Velocity vs Time"
              unit="m/s"
              data={displayData}
              getValue={(p) => p.velocity}
              color="#0ea5e9" // sky-500
              minY={-15}
              maxY={Math.max(40, ...displayData.map((d) => d.velocity))}
              zeroLine
              safeZone={{ min: -11, max: -6, label: 'ESA Descent Window (-6 to -11 m/s)' }}
            />
          </>
        )}

        {selectedChannel === 'environmental' && (
          <>
            <SvgTimeSeriesChart
              title="Atmospheric Pressure vs Time"
              unit="hPa"
              data={displayData}
              getValue={(p) => p.pressure}
              color="#7c3aed" // violet
              minY={900}
              maxY={1025}
            />
            <SvgTimeSeriesChart
              title="Temperature vs Time"
              unit="°C"
              data={displayData}
              getValue={(p) => p.temperature}
              color="#ea580c" // orange
              minY={5}
              maxY={20}
            />
          </>
        )}

        {selectedChannel === 'power' && (
          <>
            <SvgTimeSeriesChart
              title="Battery State of Charge vs Time"
              unit="%"
              data={displayData}
              getValue={(p) => p.batteryLevel}
              color="#16a34a" // emerald
              minY={0}
              maxY={100}
            />
            <SvgTimeSeriesChart
              title="Current Draw vs Time"
              unit="mA"
              data={displayData}
              getValue={(p) => p.currentDraw}
              color="#ca8a04" // yellow
              minY={40}
              maxY={90}
            />
          </>
        )}
      </div>
    </div>
  );
};

interface SvgTimeSeriesChartProps {
  title: string;
  unit: string;
  data: TelemetryPoint[];
  getValue: (p: TelemetryPoint) => number;
  color: string;
  minY: number;
  maxY: number;
  zeroLine?: boolean;
  targetLine?: { value: number; label: string };
  safeZone?: { min: number; max: number; label: string };
}

const SvgTimeSeriesChart: React.FC<SvgTimeSeriesChartProps> = ({
  title,
  unit,
  data,
  color,
  minY,
  maxY,
  zeroLine,
  targetLine,
  safeZone,
  getValue,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const w = 480;
  const h = 190;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 26;

  const innerW = w - padLeft - padRight;
  const innerH = h - padTop - padBottom;

  const maxTime = Math.max(10, ...(data.map((d) => d.time) || [0]));
  const minTime = 0;

  const scaleX = (t: number) => padLeft + ((t - minTime) / (maxTime - minTime || 1)) * innerW;
  const scaleY = (v: number) => padTop + innerH - ((v - minY) / (maxY - minY || 1)) * innerH;

  let pathD = '';
  if (data.length > 0) {
    pathD = data
      .map((pt, idx) => {
        const x = scaleX(pt.time);
        const y = Math.min(padTop + innerH, Math.max(padTop, scaleY(getValue(pt))));
        return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  }

  const latestPoint = data.length > 0 ? data[data.length - 1] : null;
  const activePt = hoverIndex !== null && data[hoverIndex] ? data[hoverIndex] : latestPoint;
  const activeVal = activePt ? getValue(activePt) : null;

  return (
    <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-3 flex flex-col relative select-none">
      {/* Title & Live Value */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-700">{title}</span>
        <div className="flex items-baseline font-mono">
          <span className="text-sm font-bold text-slate-900 tabular-nums">
            {activeVal !== null ? activeVal.toFixed(2) : '--'}
          </span>
          <span className="text-[11px] text-slate-500 ml-1">{unit}</span>
          {activePt && (
            <span className="text-[10px] text-slate-400 ml-2">
              (T+{activePt.time.toFixed(1)}s)
            </span>
          )}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="w-full relative">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-auto overflow-visible block"
          onMouseLeave={() => setHoverIndex(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const relX = ((e.clientX - rect.left) / rect.width) * w;
            if (data.length > 1) {
              const t = minTime + ((relX - padLeft) / innerW) * (maxTime - minTime);
              let closest = 0;
              let minDiff = Infinity;
              data.forEach((p, idx) => {
                const diff = Math.abs(p.time - t);
                if (diff < minDiff) {
                  minDiff = diff;
                  closest = idx;
                }
              });
              setHoverIndex(closest);
            }
          }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const yVal = minY + ratio * (maxY - minY);
            const yPos = scaleY(yVal);
            return (
              <g key={ratio}>
                <line
                  x1={padLeft}
                  y1={yPos}
                  x2={w - padRight}
                  y2={yPos}
                  stroke="#e2e8f0"
                  strokeWidth="0.8"
                  strokeDasharray="2 2"
                />
                <text
                  x={padLeft - 6}
                  y={yPos + 3}
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {yVal.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Safe Descent Zone Envelope */}
          {safeZone && (
            <rect
              x={padLeft}
              y={scaleY(safeZone.max)}
              width={innerW}
              height={Math.abs(scaleY(safeZone.min) - scaleY(safeZone.max))}
              fill="#22c55e"
              fillOpacity="0.12"
            />
          )}

          {/* Zero Line */}
          {zeroLine && minY < 0 && maxY > 0 && (
            <line
              x1={padLeft}
              y1={scaleY(0)}
              x2={w - padRight}
              y2={scaleY(0)}
              stroke="#94a3b8"
              strokeWidth="1.2"
            />
          )}

          {/* Target Reference Line */}
          {targetLine && (
            <g>
              <line
                x1={padLeft}
                y1={scaleY(targetLine.value)}
                x2={w - padRight}
                y2={scaleY(targetLine.value)}
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
              <text
                x={w - padRight}
                y={scaleY(targetLine.value) - 4}
                fill="#d97706"
                fontSize="8"
                fontFamily="monospace"
                textAnchor="end"
              >
                {targetLine.label}
              </text>
            </g>
          )}

          {/* Main Telemetry Curve */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Active Hover / Current Scrubber Point */}
          {activePt && (
            <g>
              <line
                x1={scaleX(activePt.time)}
                y1={padTop}
                x2={scaleX(activePt.time)}
                y2={padTop + innerH}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              <circle
                cx={scaleX(activePt.time)}
                cy={scaleY(getValue(activePt))}
                r="4.5"
                fill={color}
                stroke="#ffffff"
                strokeWidth="1.8"
              />
            </g>
          )}

          {/* Time X-Axis Ticks */}
          {[0, 0.5, 1].map((r) => {
            const t = minTime + r * (maxTime - minTime);
            return (
              <text
                key={r}
                x={scaleX(t)}
                y={h - 6}
                fill="#94a3b8"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {t.toFixed(0)}s
              </text>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

function downsamplePoints(points: TelemetryPoint[], maxPoints: number): TelemetryPoint[] {
  if (points.length <= maxPoints) return points;
  const step = Math.ceil(points.length / maxPoints);
  const sampled: TelemetryPoint[] = [];
  for (let i = 0; i < points.length; i += step) {
    sampled.push(points[i]);
  }
  if (sampled[sampled.length - 1] !== points[points.length - 1]) {
    sampled.push(points[points.length - 1]);
  }
  return sampled;
}
