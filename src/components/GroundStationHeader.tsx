/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MissionStage } from '../types/cansat';
import { Play, Pause, RotateCcw, Sliders, Download, Code } from 'lucide-react';

interface GroundStationHeaderProps {
  stage: MissionStage;
  time: number;
  isRunning: boolean;
  isPaused: boolean;
  simulationSpeed: number;
  activeTab: 'overview' | 'telemetry' | 'radar' | 'debrief' | 'pythonCode';
  onTabChange: (tab: 'overview' | 'telemetry' | 'radar' | 'debrief' | 'pythonCode') => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onSpeedChange: (speed: number) => void;
  onOpenSettings: () => void;
  onDownloadCsv: () => void;
  hasData: boolean;
}

export const GroundStationHeader: React.FC<GroundStationHeaderProps> = ({
  stage,
  time,
  isRunning,
  isPaused,
  simulationSpeed,
  activeTab,
  onTabChange,
  onStart,
  onPause,
  onResume,
  onReset,
  onSpeedChange,
  onOpenSettings,
  onDownloadCsv,
  hasData,
}) => {
  // Format MET: T+00:00:00.0
  const minutes = Math.floor(time / 60);
  const seconds = (time % 60).toFixed(1).padStart(4, '0');
  const metDisplay = `T+${String(minutes).padStart(2, '0')}:${seconds}`;

  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-40 select-none shadow-xs">
      {/* Top 3-Zone Bar */}
      <div className="flex items-center justify-between gap-8 px-6 py-3 border-b border-slate-100">
        {/* Zone 1: Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center font-bold text-white shadow-xs">
            CS
          </div>
          <span className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap">
            CanSat Sky Mission Twin
          </span>
          <span className="text-xs font-mono text-sky-700 px-2 py-0.5 bg-sky-50 border border-sky-200/80 rounded-md">
            SIMULATED FLIGHT
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => onTabChange('overview')}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'overview'
                ? 'text-sky-600 border-b-2 border-sky-600 font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Sky Simulator & Cockpit
          </button>
          <button
            onClick={() => onTabChange('telemetry')}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'telemetry'
                ? 'text-sky-600 border-b-2 border-sky-600 font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Telemetry & Radio
          </button>
          <button
            onClick={() => onTabChange('radar')}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'radar'
                ? 'text-sky-600 border-b-2 border-sky-600 font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            GPS Drift Radar
          </button>
          <button
            onClick={() => onTabChange('debrief')}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
              activeTab === 'debrief'
                ? 'text-sky-600 border-b-2 border-sky-600 font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            Flight Debrief
          </button>
          <button
            onClick={() => onTabChange('pythonCode')}
            className={`transition-colors whitespace-nowrap shrink-0 pb-0.5 flex items-center gap-1.5 ${
              activeTab === 'pythonCode'
                ? 'text-sky-600 border-b-2 border-sky-600 font-semibold'
                : 'hover:text-slate-900'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Python & Streamlit
          </button>
        </nav>

        {/* Zone 3: Primary Action & Quick Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shadow-xs"
            title="Configure Target Altitude, Wind, Parachute, Packet Loss"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
            <span>Config</span>
          </button>

          {hasData && (
            <button
              onClick={onDownloadCsv}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shadow-xs"
              title="Download Sensor Telemetry CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}

          {/* Primary Action Button */}
          {!isRunning || isPaused ? (
            <button
              onClick={isPaused ? onResume : onStart}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors whitespace-nowrap shadow-xs shadow-sky-600/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isPaused ? 'Resume Mission' : stage === 'COMPLETED' ? 'Relaunch' : 'Launch Mission'}</span>
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-4 py-1.5 text-xs font-semibold text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors whitespace-nowrap shadow-xs shadow-amber-500/20"
            >
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause Flight</span>
            </button>
          )}

          <button
            onClick={onReset}
            disabled={stage === 'PRE_LAUNCH' && !isRunning}
            className="p-1.5 text-slate-600 bg-white border border-slate-300 rounded-lg hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 transition-colors shadow-xs"
            title="Reset to Launch Rail"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Sub-Ribbon: Real-time Telemetry State & Clock */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-2 bg-slate-50 border-b border-slate-200/80 text-xs font-mono">
        {/* Left: Clock & State */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-700">
            <span className="text-slate-400">MET:</span>
            <span className="text-sky-700 font-bold text-sm tracking-wider tabular-nums">
              {metDisplay}
            </span>
          </div>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">STAGE:</span>
            <span className={`font-semibold ${getStageColor(stage)}`}>
              {stage.replace('_', ' ')}
            </span>
          </div>

          <span className="text-slate-300">|</span>

          <div className="flex items-center gap-1.5 text-slate-500">
            <span>LINK:</span>
            <span className="text-emerald-600 font-medium">433.050 MHz · 9600 BAUD</span>
          </div>
        </div>

        {/* Right: Simulation Speed Selector */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">SPEED:</span>
          <div className="flex items-center bg-white p-0.5 rounded border border-slate-200 shadow-xs">
            {[1, 2, 5, 10, 20].map((s) => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-2 py-0.5 text-[11px] rounded transition-colors ${
                  simulationSpeed === s
                    ? 'bg-sky-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};

function getStageColor(stage: MissionStage): string {
  switch (stage) {
    case 'PRE_LAUNCH':
      return 'text-slate-600';
    case 'ASCENT':
      return 'text-amber-600';
    case 'DEPLOYMENT':
      return 'text-purple-600';
    case 'DESCENT':
      return 'text-sky-600';
    case 'LANDING':
      return 'text-rose-600';
    case 'COMPLETED':
      return 'text-emerald-600';
  }
}
