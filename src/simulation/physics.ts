/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SimulationConfig } from '../types/cansat';

// Physical Constants
export const GRAVITY = 9.80665; // m/s^2
export const SEA_LEVEL_TEMP_K = 288.15; // 15°C in Kelvin
export const SEA_LEVEL_PRESSURE_HPA = 1013.25; // hPa
export const TEMP_LAPSE_RATE = 0.0065; // K/m
export const GAS_CONSTANT_AIR = 287.058; // J/(kg·K)
export const BAROMETRIC_EXPONENT = 5.25588; // (g * M) / (R * L)

/**
 * Standard International Atmosphere (ISA) temperature at altitude (h in metres)
 */
export function calculateTemperature(altitudeM: number): number {
  const clampedAlt = Math.max(0, altitudeM);
  const tempK = SEA_LEVEL_TEMP_K - TEMP_LAPSE_RATE * clampedAlt;
  return tempK - 273.15; // Celsius
}

/**
 * Standard International Atmosphere pressure in hPa at altitude
 */
export function calculatePressure(altitudeM: number): number {
  const clampedAlt = Math.max(0, altitudeM);
  const tempRatio = (SEA_LEVEL_TEMP_K - TEMP_LAPSE_RATE * clampedAlt) / SEA_LEVEL_TEMP_K;
  if (tempRatio <= 0) return 10.0;
  return SEA_LEVEL_PRESSURE_HPA * Math.pow(tempRatio, BAROMETRIC_EXPONENT);
}

/**
 * Air density in kg/m^3 at altitude
 */
export function calculateAirDensity(altitudeM: number): number {
  const tempC = calculateTemperature(altitudeM);
  const tempK = tempC + 273.15;
  const pressurePa = calculatePressure(altitudeM) * 100.0;
  return pressurePa / (GAS_CONSTANT_AIR * tempK);
}

/**
 * Parachute canopy cross-sectional area (A = pi * r^2)
 */
export function calculateParachuteArea(diameterM: number): number {
  const radius = diameterM / 2.0;
  return Math.PI * radius * radius;
}

/**
 * Theoretical terminal descent velocity (m/s) with parachute
 * v_term = sqrt( (2 * m * g) / (rho * Cd * A) )
 */
export function calculateTerminalDescentVelocity(
  massKg: number,
  parachuteDiameterM: number,
  altitudeM: number,
  cd = 1.35
): number {
  const rho = calculateAirDensity(altitudeM);
  const area = calculateParachuteArea(parachuteDiameterM);
  const vTerm = Math.sqrt((2 * massKg * GRAVITY) / (rho * cd * area));
  return vTerm;
}

/**
 * Calculate required rocket motor burnout velocity to reach target apogee
 */
export function calculateRequiredBurnoutVelocity(targetAltitudeM: number, burnTimeS: number): number {
  // Approximate burn altitude: h_burn = 0.5 * a_burn * t_burn^2 = 0.5 * v_bo * t_burn
  // Coast altitude: h_coast = v_bo^2 / (2 * (g + a_drag_avg))
  // Solving for v_bo gives target apogee
  const gEff = GRAVITY * 1.08; // Include nominal rocket aerodynamic drag
  const a = 1 / (2 * gEff);
  const b = 0.5 * burnTimeS;
  const c = -targetAltitudeM;
  // Quadratic formula: a*v^2 + b*v + c = 0
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return 90.0;
  return (-b + Math.sqrt(discriminant)) / (2 * a);
}

/**
 * Convert horizontal distance to GPS offset (WGS84 approx)
 */
export function calculateGpsPosition(
  baseLat: number,
  baseLon: number,
  driftXM: number, // East displacement in metres
  driftYM: number  // North displacement in metres
): { latitude: number; longitude: number } {
  // 1 degree latitude ~ 111,139 meters
  const deltaLat = driftYM / 111139.0;
  // 1 degree longitude ~ 111,139 * cos(lat)
  const latRad = (baseLat * Math.PI) / 180.0;
  const deltaLon = driftXM / (111139.0 * Math.cos(latRad));
  return {
    latitude: Number((baseLat + deltaLat).toFixed(6)),
    longitude: Number((baseLon + deltaLon).toFixed(6)),
  };
}

/**
 * Calculate RF Link Budget RSSI (dBm) based on 3D distance
 */
export function calculateRssi(distanceM: number, txPowerDbm = 14): number {
  const d = Math.max(1.0, distanceM);
  // Free space path loss at 433 MHz: FSPL = 20*log10(d) + 20*log10(433e6) - 147.55
  // Empirical indoor/field receiver calibration:
  const pathLoss = 20 * Math.log10(d) + 25.1;
  const rssi = txPowerDbm - pathLoss;
  // Clamp to realistic receiver dynamic range
  return Math.max(-118, Math.min(-42, Math.round(rssi)));
}

/**
 * Generates calibrated sensor noise
 */
export function addSensorNoise(value: number, stdDev: number): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random() || 0.0001;
  const u2 = Math.random() || 0.0001;
  const randStdNormal = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return value + randStdNormal * stdDev;
}

/**
 * Calculate battery voltage from percentage for 2S or 1S LiPo
 */
export function calculateLiPoVoltage(percentage: number): number {
  // 1S LiPo nominal curve: 4.2V (100%) to 3.3V (0%)
  const clamped = Math.max(0, Math.min(100, percentage));
  if (clamped > 80) {
    return 3.9 + (clamped - 80) * 0.015;
  } else if (clamped > 20) {
    return 3.65 + (clamped - 20) * (0.25 / 60);
  } else {
    return 3.3 + clamped * (0.35 / 20);
  }
}
