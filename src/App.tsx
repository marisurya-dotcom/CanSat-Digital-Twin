/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CanSatEngine, DEFAULT_CONFIG } from './simulation/missionEngine';
import { RealisticSkyFlight } from './components/RealisticSkyFlight';
import { GroundStationHeader } from './components/GroundStationHeader';
import { TelemetryCards } from './components/TelemetryCards';
import { FlightCharts } from './components/FlightCharts';
import { GpsRadar } from './components/GpsRadar';
import { PacketConsole } from './components/PacketConsole';
import { MissionReportModal } from './components/MissionReportModal';
import { SimulationControlsModal } from './components/SimulationControlsModal';
import { PythonPackageViewer } from './components/PythonPackageViewer';
import { TelemetryPoint, MissionEvent, MissionStage, SimulationConfig } from './types/cansat';
import { Download, Play, Info } from 'lucide-react';

export default function App() {
  const engineRef = useRef<CanSatEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new CanSatEngine(DEFAULT_CONFIG);
  }
  const engine = engineRef.current;

  // React state synchronized with engine
  const [telemetry, setTelemetry] = useState<TelemetryPoint>(engine.currentTelemetry);
  const [history, setHistory] = useState<TelemetryPoint[]>(engine.telemetryHistory);
  const [stage, setStage] = useState<MissionStage>(engine.stage);
  const [time, setTime] = useState<number>(engine.time);
  const [isRunning, setIsRunning] = useState<boolean>(engine.isRunning);
  const [isPaused, setIsPaused] = useState<boolean>(engine.isPaused);
  const [config, setConfig] = useState<SimulationConfig>(engine.config);
  const [events, setEvents] = useState<MissionEvent[]>(engine.events);

  // UI state
  const [activeTab, setActiveTab] = useState<'overview' | 'telemetry' | 'radar' | 'debrief' | 'pythonCode'>('overview');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Sync listener from engine
  useEffect(() => {
    const unsubscribe = engine.subscribe(() => {
      setTelemetry({ ...engine.currentTelemetry });
      setStage(engine.stage);
      setTime(engine.time);
      setIsRunning(engine.isRunning);
      setIsPaused(engine.isPaused);
      setConfig({ ...engine.config });
      setEvents([...engine.events]);
      setHistory([...engine.telemetryHistory]);

      // Automatically show debrief modal when mission completes
      if (engine.stage === 'COMPLETED' && engine.performance) {
        setIsReportOpen(true);
      }
    });

    return unsubscribe;
  }, [engine]);

  // Main animation / simulation tick loop
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();

    const loop = (currentTimestamp: number) => {
      const dt = Math.min(0.1, (currentTimestamp - lastTimestamp) / 1000.0);
      lastTimestamp = currentTimestamp;

      if (engine.isRunning && !engine.isPaused) {
        engine.update(dt);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  // Handlers
  const handleStart = useCallback(() => {
    engine.start();
  }, [engine]);

  const handlePause = useCallback(() => {
    engine.pause();
  }, [engine]);

  const handleResume = useCallback(() => {
    engine.resume();
  }, [engine]);

  const handleReset = useCallback(() => {
    engine.reset();
  }, [engine]);

  const handleSpeedChange = useCallback((spd: number) => {
    engine.setConfig({ simulationSpeed: spd });
  }, [engine]);

  const handleSaveConfig = useCallback((newCfg: Partial<SimulationConfig>) => {
    engine.setConfig(newCfg);
  }, [engine]);

  const handleDownloadCsv = useCallback(() => {
    const csvContent = engine.exportCsv();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cansat_telemetry_flight_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [engine]);

  const handleDownloadJson = useCallback(() => {
    const jsonContent = engine.exportMissionJson();
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `cansat_mission_report_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [engine]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-sky-500/20 selection:text-sky-900">
      {/* 3-Zone Clean Aerospace Ground Station Header */}
      <GroundStationHeader
        stage={stage}
        time={time}
        isRunning={isRunning}
        isPaused={isPaused}
        simulationSpeed={config.simulationSpeed}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onReset={handleReset}
        onSpeedChange={handleSpeedChange}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onDownloadCsv={handleDownloadCsv}
        hasData={history.length > 0}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-[1560px] w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Tab 1: Mission Cockpit (Overview with Large Sky Simulator) */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* 1. Precision Metric Telemetry Cards Strip */}
            <TelemetryCards telemetry={telemetry} targetAltitude={config.targetAltitude} />

            {/* 2. Large Central Sky Flight Simulator Viewport */}
            <section className="w-full">
              <RealisticSkyFlight
                telemetry={telemetry}
                targetAltitude={config.targetAltitude}
                windSpeed={config.windSpeed}
                windDirection={config.windDirection}
              />
            </section>

            {/* 3. Telemetry Graphs & Ground Station Systems Below the Sky Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Flight Dynamics Graphs (7 columns) */}
              <div className="lg:col-span-7 flex flex-col">
                <FlightCharts history={history} targetAltitude={config.targetAltitude} />
              </div>

              {/* Right: GPS Drift Radar (5 columns) */}
              <div className="lg:col-span-5 flex flex-col">
                <GpsRadar
                  telemetry={telemetry}
                  history={history}
                  windSpeed={config.windSpeed}
                  windDirection={config.windDirection}
                />
              </div>
            </div>

            {/* 4. Full Demodulated Packet Console & Mission Event Audit */}
            <div className="w-full">
              <PacketConsole
                telemetry={telemetry}
                history={history}
                events={events}
                packetsSent={telemetry.packetId}
                packetsReceived={history.filter((p) => !p.packetLost).length}
                packetsLost={history.filter((p) => p.packetLost).length}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Dedicated Radio Telemetry & Packet Stream */}
        {activeTab === 'telemetry' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <TelemetryCards telemetry={telemetry} targetAltitude={config.targetAltitude} />
            <PacketConsole
              telemetry={telemetry}
              history={history}
              events={events}
              packetsSent={telemetry.packetId}
              packetsReceived={history.filter((p) => !p.packetLost).length}
              packetsLost={history.filter((p) => p.packetLost).length}
            />
          </div>
        )}

        {/* Tab 3: Dedicated GPS Recovery & Trajectory Radar */}
        {activeTab === 'radar' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <TelemetryCards telemetry={telemetry} targetAltitude={config.targetAltitude} />
            <GpsRadar
              telemetry={telemetry}
              history={history}
              windSpeed={config.windSpeed}
              windDirection={config.windDirection}
            />
          </div>
        )}

        {/* Tab 4: Flight Debrief & Performance Scorecard */}
        {activeTab === 'debrief' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {engine.performance ? (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                      Post-Flight Mission Debrief & Competition Audit
                    </h2>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      TELEMETRY DATA RECORDER · RECOVERY AUDIT
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDownloadCsv}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors shadow-xs shadow-sky-600/20"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Sensor CSV</span>
                    </button>
                    <button
                      onClick={handleDownloadJson}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
                    >
                      <span>Export JSON Log</span>
                    </button>
                  </div>
                </div>

                {/* Scorecard Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                    <span className="text-slate-500 uppercase text-[11px]">Apogee Achieved</span>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {engine.performance.maxAltitude} m
                    </div>
                    <span className="text-slate-400 text-[10px]">Target: {config.targetAltitude} m</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                    <span className="text-slate-500 uppercase text-[11px]">Flight Duration</span>
                    <div className="text-2xl font-bold text-sky-600 mt-1">
                      {engine.performance.totalDuration} s
                    </div>
                    <span className="text-slate-400 text-[10px]">Ascent: {engine.performance.ascentDuration}s</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                    <span className="text-slate-500 uppercase text-[11px]">Avg Descent Velocity</span>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">
                      {engine.performance.avgDescentVelocity} m/s
                    </div>
                    <span className="text-slate-400 text-[10px]">ESA Norm: 6.0 - 11.0 m/s</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
                    <span className="text-slate-500 uppercase text-[11px]">Radio Reliability</span>
                    <div className="text-2xl font-bold text-sky-600 mt-1">
                      {engine.performance.packetSuccessRate}%
                    </div>
                    <span className="text-slate-400 text-[10px]">{engine.performance.packetsReceived} of {engine.performance.packetsSent} pkts</span>
                  </div>
                </div>

                {/* Full Flight Charts in Debrief */}
                <FlightCharts history={history} targetAltitude={config.targetAltitude} />
              </div>
            ) : (
              <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center space-y-4 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center mx-auto text-sky-600">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-slate-900">
                    Flight Simulation Standby
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Launch the virtual CanSat and let it complete its ascent and parachute descent to view the final performance debrief and competition evaluation report.
                  </p>
                </div>
                <button
                  onClick={handleStart}
                  className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 rounded-lg hover:bg-sky-500 transition-colors shadow-xs shadow-sky-600/20"
                >
                  Launch Virtual Mission Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Python & Streamlit Source Code */}
        {activeTab === 'pythonCode' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <PythonPackageViewer />
          </div>
        )}
      </main>

      {/* Ground Station Clean Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs font-mono text-slate-500 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span>CANSAT SKY DIGITAL TWIN v2.0</span>
          <span>·</span>
          <span>ISA ATMOSPHERE MODEL (1976)</span>
          <span>·</span>
          <span>PARACHUTE COEFFICIENT CD: 1.35</span>
        </div>
        <div className="text-slate-400">
          MATHEMATICALLY SIMULATED FLIGHT DATA · VIRTUAL AEROSPACE TESTBENCH
        </div>
      </footer>

      {/* Modals */}
      <SimulationControlsModal
        config={config}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveConfig}
      />

      {engine.performance && (
        <MissionReportModal
          performance={engine.performance}
          config={config}
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          onDownloadCsv={handleDownloadCsv}
          onDownloadJson={handleDownloadJson}
          onRelaunch={() => {
            setIsReportOpen(false);
            engine.reset();
            engine.start();
          }}
        />
      )}
    </div>
  );
}
