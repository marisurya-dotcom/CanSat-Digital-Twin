/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SimulationConfig } from '../types/cansat';
import { Sliders, X, RotateCcw, Check } from 'lucide-react';
import { DEFAULT_CONFIG } from '../simulation/missionEngine';

interface SimulationControlsModalProps {
  config: SimulationConfig;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newConfig: Partial<SimulationConfig>) => void;
}

export const SimulationControlsModal: React.FC<SimulationControlsModalProps> = ({
  config,
  isOpen,
  onClose,
  onSave,
}) => {
  const [targetAlt, setTargetAlt] = useState(config.targetAltitude);
  const [speed, setSpeed] = useState(config.simulationSpeed);
  const [battery, setBattery] = useState(config.initialBattery);
  const [parachuteD, setParachuteD] = useState(config.parachuteDiameter);
  const [windSpeed, setWindSpeed] = useState(config.windSpeed);
  const [windDir, setWindDir] = useState(config.windDirection);
  const [packetLoss, setPacketLoss] = useState(config.packetLossRate);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApply = () => {
    if (targetAlt < 100 || targetAlt > 2000) {
      setValidationError('Target altitude must be between 100m and 2000m.');
      return;
    }
    if (battery < 20 || battery > 100) {
      setValidationError('Initial battery must be between 20% and 100%.');
      return;
    }
    if (parachuteD < 0.2 || parachuteD > 1.2) {
      setValidationError('Parachute diameter must be between 0.20m and 1.20m.');
      return;
    }

    setValidationError(null);
    onSave({
      targetAltitude: Number(targetAlt),
      simulationSpeed: Number(speed),
      initialBattery: Number(battery),
      parachuteDiameter: Number(parachuteD),
      windSpeed: Number(windSpeed),
      windDirection: Number(windDir),
      packetLossRate: Number(packetLoss),
    });
    onClose();
  };

  const handleResetDefaults = () => {
    setTargetAlt(DEFAULT_CONFIG.targetAltitude);
    setSpeed(DEFAULT_CONFIG.simulationSpeed);
    setBattery(DEFAULT_CONFIG.initialBattery);
    setParachuteD(DEFAULT_CONFIG.parachuteDiameter);
    setWindSpeed(DEFAULT_CONFIG.windSpeed);
    setWindDir(DEFAULT_CONFIG.windDirection);
    setPacketLoss(DEFAULT_CONFIG.packetLossRate);
    setValidationError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col text-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 border border-sky-200 rounded-xl text-sky-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Mission Simulation Parameters
              </h2>
              <p className="text-xs font-mono text-slate-500">
                AEROSPACE DIGITAL TWIN CALIBRATION
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

        {/* Form Body */}
        <div className="p-6 space-y-5 text-sm">
          {validationError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-mono">
              {validationError}
            </div>
          )}

          {/* 1. Target Altitude */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                Target Launch Apogee Altitude
              </label>
              <span className="font-mono text-xs font-bold text-sky-600">
                {targetAlt} m
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="1500"
              step="25"
              value={targetAlt}
              onChange={(e) => setTargetAlt(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>200m (Low Test)</span>
              <span>500m (Competition Standard)</span>
              <span>1500m (High Altitude)</span>
            </div>
          </div>

          {/* 2. Simulation Speed */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                Clock Rate Multiplier
              </label>
              <span className="font-mono text-xs font-bold text-sky-600">
                {speed}x Real-Time
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 5, 10, 20].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`py-1.5 text-xs font-mono font-medium rounded-lg border transition-colors ${
                    speed === s
                      ? 'bg-sky-600 border-sky-600 text-white font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          {/* 3. Parachute Diameter */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                Parachute Canopy Diameter
              </label>
              <span className="font-mono text-xs font-bold text-sky-600">
                {(parachuteD * 100).toFixed(0)} cm ({parachuteD} m)
              </span>
            </div>
            <input
              type="range"
              min="0.30"
              max="0.70"
              step="0.02"
              value={parachuteD}
              onChange={(e) => setParachuteD(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>30cm (Fast Descent)</span>
              <span>42cm (Nominal ~7.5 m/s)</span>
              <span>70cm (High Drag)</span>
            </div>
          </div>

          {/* 4. Initial Battery Level */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                Initial Battery Level
              </label>
              <span className="font-mono text-xs font-bold text-sky-600">
                {battery}%
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="100"
              step="5"
              value={battery}
              onChange={(e) => setBattery(Number(e.target.value))}
              className="w-full accent-sky-600 cursor-pointer"
            />
          </div>

          {/* 5. Wind Conditions */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">
                  Wind Speed
                </label>
                <span className="font-mono text-xs font-bold text-amber-600">
                  {windSpeed} m/s
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="12"
                step="0.5"
                value={windSpeed}
                onChange={(e) => setWindSpeed(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-700">
                  Wind Direction
                </label>
                <span className="font-mono text-xs font-bold text-amber-600">
                  {windDir}°
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="355"
                step="5"
                value={windDir}
                onChange={(e) => setWindDir(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>
          </div>

          {/* 6. Packet Loss Rate */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-700">
                Simulated RF Packet Loss Rate
              </label>
              <span className="font-mono text-xs font-bold text-rose-600">
                {packetLoss}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={packetLoss}
              onChange={(e) => setPacketLoss(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors shadow-xs shadow-sky-600/20"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
