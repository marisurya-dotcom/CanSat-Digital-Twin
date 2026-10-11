/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type MissionStage =
  | 'PRE_LAUNCH'
  | 'ASCENT'
  | 'DEPLOYMENT'
  | 'DESCENT'
  | 'LANDING'
  | 'COMPLETED';

export interface TelemetryPoint {
  time: number; // Elapsed time in seconds
  timestamp: string; // ISO or formatted HH:mm:ss.SS
  stage: MissionStage;
  altitude: number; // metres (m)
  velocity: number; // vertical velocity (m/s)
  acceleration: number; // vertical acceleration (m/s^2)
  temperature: number; // Celsius (°C)
  pressure: number; // hPa
  latitude: number; // degrees
  longitude: number; // degrees
  batteryLevel: number; // percentage (0 - 100%)
  batteryVoltage: number; // Volts (V)
  currentDraw: number; // mA
  pitch: number; // degrees (-90 to 90)
  roll: number; // degrees (-180 to 180)
  yaw: number; // degrees (0 to 360)
  rssi: number; // dBm (-120 to -40)
  packetId: number;
  packetLost: boolean;
  distanceFromLaunch: number; // horizontal distance in metres
}

export interface SimulationConfig {
  targetAltitude: number; // 200 - 1500m (default 500m)
  simulationSpeed: number; // 1x, 2x, 5x, 10x, 20x
  initialBattery: number; // 50 - 100%
  parachuteDiameter: number; // metres (e.g. 0.45m)
  canMass: number; // kg (e.g. 0.35kg standard CanSat)
  windSpeed: number; // m/s (e.g. 3.0 m/s)
  windDirection: number; // degrees (0 - 360)
  packetLossRate: number; // 0 - 25%
  launchLatitude: number; // e.g. 28.5729
  launchLongitude: number; // e.g. -80.6490
  telemetryRateHz: number; // 1Hz or 2Hz
}

export interface MissionEvent {
  id: string;
  time: number;
  stage: MissionStage;
  title: string;
  description: string;
  type: 'info' | 'milestone' | 'warning' | 'success';
}

export interface MissionPerformance {
  maxAltitude: number;
  totalDuration: number;
  ascentDuration: number;
  descentDuration: number;
  maxAscentVelocity: number;
  avgDescentVelocity: number;
  maxDescentVelocity: number;
  landingVelocity: number;
  batteryConsumed: number;
  packetsSent: number;
  packetsReceived: number;
  packetsLost: number;
  packetSuccessRate: number;
  horizontalDrift: number;
  landingDetected: boolean;
  competitionCompliant: boolean;
  complianceNotes: string[];
}
