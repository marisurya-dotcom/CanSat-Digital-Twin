/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MissionPerformance, SimulationConfig } from '../types/cansat';
import { Download, CheckCircle, AlertTriangle, FileText, X, Award, RotateCcw } from 'lucide-react';

interface MissionReportModalProps {
  performance: MissionPerformance;
  config: SimulationConfig;
  isOpen: boolean;
  onClose: () => void;
  onDownloadCsv: () => void;
  onDownloadJson: () => void;
  onRelaunch: () => void;
}

export const MissionReportModal: React.FC<MissionReportModalProps> = ({
  performance,
  config,
  isOpen,
  onClose,
  onDownloadCsv,
  onDownloadJson,
  onRelaunch,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                CanSat Mission Performance Evaluation
              </h2>
              <p className="text-xs font-mono text-slate-500">
                POST-FLIGHT TELEMETRY AUDIT & RECOVERY DEBRIEF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-sm">
          {/* Mission Verdict Banner */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3.5 ${
              performance.competitionCompliant
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                : 'bg-amber-50/80 border-amber-200 text-amber-800'
            }`}
          >
            {performance.competitionCompliant ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-1">
              <div className="font-bold text-sm">
                {performance.competitionCompliant
                  ? 'Mission Success: Full Competition Criteria Met'
                  : 'Mission Warning: Performance Deviations Detected'}
              </div>
              <ul className="text-xs space-y-1 text-slate-600 font-mono">
                {performance.complianceNotes.map((note, i) => (
                  <li key={i}>• {note}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-[10px] text-slate-500 uppercase">Max Apogee</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {performance.maxAltitude} m
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Target: {config.targetAltitude} m
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-[10px] text-slate-500 uppercase">Total Duration</div>
              <div className="text-xl font-bold text-sky-600 mt-1">
                {performance.totalDuration} s
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Ascent: {performance.ascentDuration}s · Descent: {performance.descentDuration}s
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-[10px] text-slate-500 uppercase">Avg Descent Vel</div>
              <div className="text-xl font-bold text-emerald-600 mt-1">
                {performance.avgDescentVelocity} m/s
              </div>
              <div className="text-[10px] text-emerald-600 mt-0.5">
                ESA Norm: 6.0 - 11.0 m/s
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-[10px] text-slate-500 uppercase">Max Descent Vel</div>
              <div className="text-xl font-bold text-amber-600 mt-1">
                {performance.maxDescentVelocity} m/s
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Peak parachute transient
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-[10px] text-slate-500 uppercase">Battery Consumed</div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {performance.batteryConsumed}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Nominal 1S LiPo draw
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
              <div className="text-[10px] text-slate-500 uppercase">Packet Reliability</div>
              <div className="text-xl font-bold text-sky-600 mt-1">
                {performance.packetSuccessRate}%
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {performance.packetsReceived} / {performance.packetsSent} pkts (Drop: {performance.packetsLost})
              </div>
            </div>
          </div>

          {/* Recovery Coordinates & Drift Summary */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 font-mono text-xs space-y-2">
            <div className="text-xs uppercase tracking-wider text-slate-700 font-semibold">
              Ground Landing Recovery Audit
            </div>
            <div className="grid grid-cols-2 gap-3 text-slate-700">
              <div>
                <span className="text-slate-400">TOUCHDOWN IMPACT:</span>{' '}
                <span className="text-emerald-600 font-semibold">0.0 m (Verified)</span>
              </div>
              <div>
                <span className="text-slate-400">HORIZONTAL DRIFT:</span>{' '}
                <span className="text-sky-600 font-semibold">{performance.horizontalDrift} m</span>
              </div>
              <div>
                <span className="text-slate-400">BEACON STROBE:</span>{' '}
                <span className="text-emerald-600">ACTIVE ON PAD FREQ</span>
              </div>
              <div>
                <span className="text-slate-400">CHASSIS INTEGRITY:</span>{' '}
                <span className="text-slate-900">100% NOMINAL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <button
              onClick={onDownloadCsv}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors shadow-xs shadow-sky-600/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sensor CSV</span>
            </button>
            <button
              onClick={onDownloadJson}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Export JSON Report</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onRelaunch}
              className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Relaunch Simulation</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
