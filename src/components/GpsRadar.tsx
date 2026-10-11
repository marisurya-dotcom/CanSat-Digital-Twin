/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect } from 'react';
import { TelemetryPoint } from '../types/cansat';
import { Wind } from 'lucide-react';

interface GpsRadarProps {
  telemetry: TelemetryPoint;
  history: TelemetryPoint[];
  windSpeed: number;
  windDirection: number;
}

export const GpsRadar: React.FC<GpsRadarProps> = ({
  telemetry,
  history,
  windSpeed,
  windDirection,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    // Light Radar Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // Radar Range Rings
    const maxRangeM = Math.max(150, telemetry.distanceFromLaunch * 1.3);
    const scale = (Math.min(w, h) * 0.42) / maxRangeM;

    const ringDistances = [maxRangeM * 0.33, maxRangeM * 0.66, maxRangeM];
    ringDistances.forEach((dist) => {
      const radius = dist * scale;
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${dist.toFixed(0)}m`, cx, cy - radius - 3);
    });

    // Crosshair axes (N-S, E-W)
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(cx, 22);
    ctx.lineTo(cx, h - 22);
    ctx.moveTo(22, cy);
    ctx.lineTo(w - 22, cy);
    ctx.stroke();

    // Cardinal Labels
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N (0°)', cx, 16);
    ctx.fillText('S (180°)', cx, h - 6);
    ctx.textAlign = 'right';
    ctx.fillText('W (270°)', 18, cy + 4);
    ctx.textAlign = 'left';
    ctx.fillText('E (90°)', w - 18, cy + 4);

    // Wind Vector Arrow
    const windRad = ((windDirection - 90) * Math.PI) / 180.0;
    const windLen = 38;
    const wx2 = cx + Math.cos(windRad) * windLen;
    const wy2 = cy + Math.sin(windRad) * windLen;

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(wx2, wy2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Wind arrow head
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(wx2, wy2, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Launch Pad Center Marker (0, 0)
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Historical Flight Trail
    if (history.length > 1) {
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.2;
      ctx.beginPath();

      history.forEach((pt, idx) => {
        const bearingRad = (windDirection * Math.PI) / 180.0;
        const ptX = cx + pt.distanceFromLaunch * Math.sin(bearingRad) * scale;
        const ptY = cy - pt.distanceFromLaunch * Math.cos(bearingRad) * scale;

        if (idx === 0) ctx.moveTo(ptX, ptY);
        else ctx.lineTo(ptX, ptY);
      });
      ctx.stroke();
    }

    // Current CanSat Position Marker
    const bearingRad = (windDirection * Math.PI) / 180.0;
    const currentX = cx + telemetry.distanceFromLaunch * Math.sin(bearingRad) * scale;
    const currentY = cy - telemetry.distanceFromLaunch * Math.cos(bearingRad) * scale;

    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(currentX, currentY, 8, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#0284c7';
    ctx.beginPath();
    ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Recovery Dispersion Ellipse at Ground
    if (telemetry.stage === 'LANDING' || telemetry.stage === 'COMPLETED') {
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(currentX, currentY, 16, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [telemetry, history, windSpeed, windDirection]);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-white border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-800">
            GPS Recovery & Drift Radar
          </span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs font-mono text-sky-600 font-semibold">
            DRIFT: {telemetry.distanceFromLaunch.toFixed(1)}m
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-500">
          <div className="flex items-center gap-1">
            <Wind className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {windSpeed.toFixed(1)} m/s @ {windDirection}°
            </span>
          </div>
        </div>
      </div>

      {/* Main Radar View & Data readout */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Canvas Display */}
        <div className="md:col-span-2 relative flex items-center justify-center bg-slate-50 rounded-xl border border-slate-200/80 p-2">
          <canvas
            ref={canvasRef}
            width={440}
            height={320}
            className="w-full max-w-[440px] h-auto block rounded-lg"
          />
        </div>

        {/* Coordinate Readouts & Recovery Card */}
        <div className="space-y-3 font-mono text-xs">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Launch Pad Origin
            </div>
            <div className="text-slate-800 font-medium">
              COORD: <span className="text-emerald-600 font-bold">28.572900° N, 80.649000° W</span>
            </div>
            <div className="text-slate-500 text-[11px]">
              ELEVATION: 5.0m ASL
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Simulated Position
            </div>
            <div className="text-slate-800">
              LAT: <span className="text-sky-700 font-bold">{telemetry.latitude.toFixed(6)}°</span>
            </div>
            <div className="text-slate-800">
              LON: <span className="text-sky-700 font-bold">{telemetry.longitude.toFixed(6)}°</span>
            </div>
            <div className="text-slate-800">
              ALT: <span className="text-slate-900 font-bold">{telemetry.altitude.toFixed(1)} m</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1.5">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              Recovery Vector
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>DISTANCE:</span>
              <span className="text-sky-600 font-bold">{telemetry.distanceFromLaunch.toFixed(1)} m</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>BEARING:</span>
              <span className="text-amber-600 font-bold">{windDirection}°</span>
            </div>
            <div className="flex items-center justify-between text-slate-700">
              <span>STATUS:</span>
              <span className={telemetry.stage === 'COMPLETED' ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                {telemetry.stage === 'COMPLETED' ? 'BEACON ACTIVE' : 'IN FLIGHT'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
