/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TelemetryPoint } from '../types/cansat';
import { GRAVITY } from '../simulation/physics';

interface TelemetryCardsProps {
  telemetry: TelemetryPoint;
  targetAltitude: number;
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({
  telemetry,
  targetAltitude,
}) => {
  const gForce = (telemetry.acceleration / GRAVITY).toFixed(2);
  const isDescending = telemetry.velocity < -0.2;
  const isAscending = telemetry.velocity > 0.5;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
      {/* 1. Altitude */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500 font-medium">
            Altitude
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            TGT:{targetAltitude}m
          </span>
        </div>
        <div className="mt-1 flex items-baseline">
          <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">
            {telemetry.altitude.toFixed(1)}
          </span>
          <span className="text-[10px] uppercase font-mono text-slate-400 ml-1">
            m
          </span>
        </div>
        <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>PROGRESS</span>
          <span className="text-sky-600 font-semibold">
            {Math.min(100, (telemetry.altitude / targetAltitude) * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* 2. Vertical Velocity */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500 font-medium">
            Velocity
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            VZ
          </span>
        </div>
        <div className="mt-1 flex items-baseline">
          <span
            className={`text-xl font-mono font-bold tabular-nums ${
              isAscending
                ? 'text-emerald-600'
                : isDescending
                ? 'text-sky-600'
                : 'text-slate-900'
            }`}
          >
            {telemetry.velocity > 0 ? `+${telemetry.velocity.toFixed(2)}` : telemetry.velocity.toFixed(2)}
          </span>
          <span className="text-[10px] uppercase font-mono text-slate-400 ml-1">
            m/s
          </span>
        </div>
        <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>ESA SAFE</span>
          <span
            className={
              isDescending
                ? Math.abs(telemetry.velocity) >= 6 && Math.abs(telemetry.velocity) <= 11
                  ? 'text-emerald-600 font-semibold'
                  : 'text-amber-600 font-semibold'
                : 'text-slate-400'
            }
          >
            {isDescending
              ? Math.abs(telemetry.velocity) <= 11
                ? 'PASS'
                : 'HIGH'
              : 'N/A'}
          </span>
        </div>
      </div>

      {/* 3. Proper Acceleration */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500 font-medium">
            Acceleration
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            AZ
          </span>
        </div>
        <div className="mt-1 flex items-baseline">
          <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">
            {telemetry.acceleration > 0 ? `+${telemetry.acceleration.toFixed(1)}` : telemetry.acceleration.toFixed(1)}
          </span>
          <span className="text-[10px] uppercase font-mono text-slate-400 ml-1">
            m/s²
          </span>
        </div>
        <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>LOAD</span>
          <span className="text-slate-700 font-semibold">{gForce} G</span>
        </div>
      </div>

      {/* 4. Atmospheric Pressure */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500 font-medium">
            Pressure
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            BARO
          </span>
        </div>
        <div className="mt-1 flex items-baseline">
          <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">
            {telemetry.pressure.toFixed(1)}
          </span>
          <span className="text-[10px] uppercase font-mono text-slate-400 ml-1">
            hPa
          </span>
        </div>
        <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>DELTA</span>
          <span className="text-slate-600">
            {(telemetry.pressure - 1013.25).toFixed(1)}
          </span>
        </div>
      </div>

      {/* 5. Ambient Temperature */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500 font-medium">
            Temperature
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            THERM
          </span>
        </div>
        <div className="mt-1 flex items-baseline">
          <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">
            {telemetry.temperature.toFixed(1)}
          </span>
          <span className="text-[10px] uppercase font-mono text-slate-400 ml-1">
            °C
          </span>
        </div>
        <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>LAPSE</span>
          <span className="text-slate-600">-6.5 K/km</span>
        </div>
      </div>

      {/* 6. Battery Power */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500 font-medium">
            Battery
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            1S LIPO
          </span>
        </div>
        <div className="mt-1 flex items-baseline">
          <span
            className={`text-xl font-mono font-bold tabular-nums ${
              telemetry.batteryLevel > 30 ? 'text-slate-900' : 'text-rose-600'
            }`}
          >
            {telemetry.batteryLevel.toFixed(1)}
          </span>
          <span className="text-[10px] uppercase font-mono text-slate-400 ml-1">
            %
          </span>
        </div>
        <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>VOLTS</span>
          <span className="text-amber-600 font-semibold">
            {telemetry.batteryVoltage.toFixed(2)}V
          </span>
        </div>
      </div>

      {/* 7. RF Signal RSSI */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500 font-medium">
            Signal RSSI
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            433MHz
          </span>
        </div>
        <div className="mt-1 flex items-baseline">
          <span
            className={`text-xl font-mono font-bold tabular-nums ${
              telemetry.packetLost
                ? 'text-rose-600'
                : telemetry.rssi > -85
                ? 'text-emerald-600'
                : 'text-amber-600'
            }`}
          >
            {telemetry.packetLost ? 'DROP' : telemetry.rssi}
          </span>
          <span className="text-[10px] uppercase font-mono text-slate-400 ml-1">
            {telemetry.packetLost ? '' : 'dBm'}
          </span>
        </div>
        <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>PKT #</span>
          <span className="text-sky-600 font-semibold">{telemetry.packetId}</span>
        </div>
      </div>

      {/* 8. Horizontal GPS Drift */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider font-mono text-slate-500 font-medium">
            Recovery
          </span>
          <span className="text-[9px] font-mono text-slate-400">
            DRIFT
          </span>
        </div>
        <div className="mt-1 flex items-baseline">
          <span className="text-xl font-mono font-bold text-slate-900 tabular-nums">
            {telemetry.distanceFromLaunch.toFixed(1)}
          </span>
          <span className="text-[10px] uppercase font-mono text-slate-400 ml-1">
            m
          </span>
        </div>
        <div className="mt-1 text-[10px] font-mono text-slate-400 flex items-center justify-between">
          <span>PAD DIST</span>
          <span className="text-slate-700 font-semibold">TRACK</span>
        </div>
      </div>
    </div>
  );
};
