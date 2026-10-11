/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TelemetryPoint, MissionEvent } from '../types/cansat';
import { Radio } from 'lucide-react';

interface PacketConsoleProps {
  telemetry: TelemetryPoint;
  history: TelemetryPoint[];
  events: MissionEvent[];
  packetsSent: number;
  packetsReceived: number;
  packetsLost: number;
}

export const PacketConsole: React.FC<PacketConsoleProps> = ({
  telemetry,
  history,
  events,
  packetsSent,
  packetsReceived,
  packetsLost,
}) => {
  const [filterLossOnly, setFilterLossOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'stream' | 'events'>('stream');

  const successRate = packetsSent > 0 ? ((packetsReceived / packetsSent) * 100).toFixed(1) : '100.0';
  const displayedPackets = filterLossOnly
    ? history.filter((p) => p.packetLost)
    : history.slice(-40);

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs flex flex-col">
      {/* Top Header & Telemetry Link Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 bg-white border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-sky-600" />
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-800">
            Ground Station Telemetry Demodulator
          </span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs font-mono text-emerald-600 font-medium">
            433.050 MHz FSK
          </span>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
          <button
            onClick={() => setActiveTab('stream')}
            className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap font-medium ${
              activeTab === 'stream'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Live Packets ({history.length})
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap font-medium ${
              activeTab === 'events'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Mission Events ({events.length})
          </button>
        </div>
      </div>

      {/* Link Budget Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 border-b border-slate-200/80 text-xs font-mono">
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between shadow-xs">
          <span className="text-slate-500">TX PACKETS:</span>
          <span className="text-slate-900 font-bold">{packetsSent}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between shadow-xs">
          <span className="text-slate-500">RX SUCCESS:</span>
          <span className="text-emerald-600 font-bold">{packetsReceived}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between shadow-xs">
          <span className="text-slate-500">DROPPED:</span>
          <span className={packetsLost > 0 ? 'text-rose-600 font-bold' : 'text-slate-600 font-bold'}>
            {packetsLost}
          </span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex items-center justify-between shadow-xs">
          <span className="text-slate-500">RELIABILITY:</span>
          <span className="text-sky-600 font-bold">{successRate}%</span>
        </div>
      </div>

      {/* Main Terminal Stream View */}
      {activeTab === 'stream' ? (
        <div className="p-3.5 flex flex-col space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-mono text-[10px]">
              FORMAT: $CANSAT,ID,MET,STAGE,ALT,VEL,ACC,TEMP,PRESS,LAT,LON,BATT,RSSI*CRC
            </span>
            <button
              onClick={() => setFilterLossOnly(!filterLossOnly)}
              className={`text-xs px-2.5 py-0.5 rounded-md transition-colors ${
                filterLossOnly
                  ? 'bg-rose-100 text-rose-700 border border-rose-300'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {filterLossOnly ? 'Show All Packets' : 'Filter Dropped Packets'}
            </button>
          </div>

          {/* Scrolling Terminal Frame */}
          <div className="h-60 overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] space-y-1 select-text">
            {displayedPackets.length === 0 ? (
              <div className="text-slate-500 italic py-8 text-center">
                Awaiting telemetry transmitter lock. Launch mission to stream radio packets...
              </div>
            ) : (
              displayedPackets.map((pt, i) => {
                const checksum = ((pt.packetId * 37 + Math.floor(pt.altitude)) % 255)
                  .toString(16)
                  .padStart(2, '0')
                  .toUpperCase();

                const sentence = `$CANSAT,${String(pt.packetId).padStart(4, '0')},T+${pt.time.toFixed(1)},${pt.stage},${pt.altitude.toFixed(1)},${pt.velocity.toFixed(1)},${pt.acceleration.toFixed(1)},${pt.temperature.toFixed(1)},${pt.pressure.toFixed(1)},${pt.latitude.toFixed(4)},${pt.longitude.toFixed(4)},${pt.batteryLevel.toFixed(1)}%,${pt.rssi}dBm*${checksum}`;

                return (
                  <div
                    key={`${pt.packetId}-${i}`}
                    className={`flex items-center justify-between px-2 py-0.5 rounded transition-colors ${
                      pt.packetLost
                        ? 'bg-rose-950/50 text-rose-300 border-l-2 border-rose-500'
                        : 'hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <span className="truncate">{sentence}</span>
                    <span className="ml-2 shrink-0 text-[10px] uppercase font-semibold">
                      {pt.packetLost ? (
                        <span className="text-rose-400">CRC ERR [DROP]</span>
                      ) : (
                        <span className="text-emerald-400">ACK [OK]</span>
                      )}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* Mission Chronological Events Log */
        <div className="p-3.5">
          <div className="h-60 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-xs space-y-2">
            {events.length === 0 ? (
              <div className="text-slate-400 italic py-8 text-center">
                No flight events recorded yet.
              </div>
            ) : (
              events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg bg-white border border-slate-200/90 shadow-xs"
                >
                  <span className="text-sky-600 text-[11px] font-bold shrink-0 pt-0.5">
                    T+{ev.time.toFixed(1)}s
                  </span>
                  <div className="flex-1 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-800">
                        {ev.title}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase">
                        · {ev.stage}
                      </span>
                    </div>
                    <p className="text-slate-600 text-[11px] font-sans">
                      {ev.description}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
