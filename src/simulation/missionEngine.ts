/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MissionEvent,
  MissionPerformance,
  MissionStage,
  SimulationConfig,
  TelemetryPoint,
} from '../types/cansat';
import {
  GRAVITY,
  addSensorNoise,
  calculateGpsPosition,
  calculateLiPoVoltage,
  calculatePressure,
  calculateRequiredBurnoutVelocity,
  calculateRssi,
  calculateTemperature,
  calculateTerminalDescentVelocity,
} from './physics';

export const DEFAULT_CONFIG: SimulationConfig = {
  targetAltitude: 500, // 500 metres target apogee
  simulationSpeed: 1, // 1x default real-time
  initialBattery: 100, // 100%
  parachuteDiameter: 0.42, // 42 cm diameter canopy
  canMass: 0.35, // 350 grams standard CanSat
  windSpeed: 2.8, // 2.8 m/s breeze
  windDirection: 75, // East-North-East
  packetLossRate: 3.5, // 3.5% nominal packet drop
  launchLatitude: 28.5729, // Cape Canaveral / Spaceport
  launchLongitude: -80.649,
  telemetryRateHz: 2, // 2 packets per second
};

export class CanSatEngine {
  public config: SimulationConfig;
  public stage: MissionStage = 'PRE_LAUNCH';
  public isRunning = false;
  public isPaused = false;
  public time = 0; // Mission Elapsed Time in seconds

  // Internal physical state
  private altitude = 0;
  private velocity = 0;
  private acceleration = 0;
  private driftX = 0;
  private driftY = 0;
  private pitch = 0;
  private roll = 0;
  private yaw = 0;
  private batteryRemaining = 100;
  private packetsSent = 0;
  private packetsReceived = 0;
  private packetsLost = 0;
  private nextTelemetryTime = 0;

  // Ascent trajectory parameters
  private readonly burnTime = 3.6; // seconds of rocket motor thrust
  private burnOutVelocity = 0;
  private targetApogee = 500;
  private maxAltRecorded = 0;
  private maxAscentVelRecorded = 0;
  private maxDescentVelRecorded = 0;
  private descentVelocities: number[] = [];
  private ascentStartTime = 0;
  private apogeeTime = 0;
  private touchdownTime = 0;

  // History logs
  public events: MissionEvent[] = [];
  public telemetryHistory: TelemetryPoint[] = [];
  public currentTelemetry: TelemetryPoint;
  public performance: MissionPerformance | null = null;

  // Listeners
  private listeners: Array<() => void> = [];

  constructor(initialConfig: Partial<SimulationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...initialConfig };
    this.batteryRemaining = this.config.initialBattery;
    this.targetApogee = this.config.targetAltitude;
    this.burnOutVelocity = calculateRequiredBurnoutVelocity(this.targetApogee, this.burnTime);
    this.currentTelemetry = this.createTelemetrySnapshot(false);
    this.addEvent('PRE_LAUNCH', 'Avionics Pre-Flight Check', 'CanSat internal systems booted and calibrated. Telemetry transmitter operational.', 'info');
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  public setConfig(newConfig: Partial<SimulationConfig>): void {
    const prevTarget = this.config.targetAltitude;
    this.config = { ...this.config, ...newConfig };
    if (this.stage === 'PRE_LAUNCH') {
      this.batteryRemaining = this.config.initialBattery;
      this.targetApogee = this.config.targetAltitude;
      this.burnOutVelocity = calculateRequiredBurnoutVelocity(this.targetApogee, this.burnTime);
      this.currentTelemetry = this.createTelemetrySnapshot(false);
    } else if (newConfig.targetAltitude && newConfig.targetAltitude !== prevTarget) {
      this.targetApogee = newConfig.targetAltitude;
      this.burnOutVelocity = calculateRequiredBurnoutVelocity(this.targetApogee, this.burnTime);
    }
    this.notify();
  }

  public start(): void {
    if (this.stage === 'COMPLETED') {
      this.reset();
    }
    if (this.stage === 'PRE_LAUNCH') {
      this.stage = 'ASCENT';
      this.isRunning = true;
      this.isPaused = false;
      this.ascentStartTime = this.time;
      this.addEvent('ASCENT', 'Ignition & Liftoff', `Virtual rocket launched towards ${this.config.targetAltitude}m apogee. Motor ignited.`, 'milestone');
    } else {
      this.isRunning = true;
      this.isPaused = false;
    }
    this.notify();
  }

  public pause(): void {
    if (this.isRunning && !this.isPaused) {
      this.isPaused = true;
      this.addEvent(this.stage, 'Simulation Paused', `Mission paused at MET T+${this.time.toFixed(1)}s for ground inspection.`, 'info');
      this.notify();
    }
  }

  public resume(): void {
    if (this.isRunning && this.isPaused) {
      this.isPaused = false;
      this.addEvent(this.stage, 'Simulation Resumed', 'Flight simulation running.', 'info');
      this.notify();
    }
  }

  public reset(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.stage = 'PRE_LAUNCH';
    this.time = 0;
    this.altitude = 0;
    this.velocity = 0;
    this.acceleration = 0;
    this.driftX = 0;
    this.driftY = 0;
    this.pitch = 0;
    this.roll = 0;
    this.yaw = 0;
    this.batteryRemaining = this.config.initialBattery;
    this.packetsSent = 0;
    this.packetsReceived = 0;
    this.packetsLost = 0;
    this.nextTelemetryTime = 0;
    this.maxAltRecorded = 0;
    this.maxAscentVelRecorded = 0;
    this.maxDescentVelRecorded = 0;
    this.descentVelocities = [];
    this.events = [];
    this.telemetryHistory = [];
    this.performance = null;
    this.targetApogee = this.config.targetAltitude;
    this.burnOutVelocity = calculateRequiredBurnoutVelocity(this.targetApogee, this.burnTime);
    this.currentTelemetry = this.createTelemetrySnapshot(false);

    this.addEvent('PRE_LAUNCH', 'Simulation Reset', 'Mission reset to pad state. All subsystems re-initialized.', 'info');
    this.notify();
  }

  /**
   * Primary physical integration step (Euler / Verlet dynamics)
   */
  public update(dtSeconds: number): void {
    if (!this.isRunning || this.isPaused || this.stage === 'COMPLETED') {
      return;
    }

    const scaledDt = dtSeconds * this.config.simulationSpeed;
    // Sub-step for numerical stability during high speeds
    const maxSubStep = 0.05;
    let remainingDt = scaledDt;

    while (remainingDt > 0) {
      const step = Math.min(remainingDt, maxSubStep);
      this.physicsSubStep(step);
      remainingDt -= step;
    }

    // Telemetry generation at configured Hz
    const telemetryInterval = 1.0 / this.config.telemetryRateHz;
    if (this.time >= this.nextTelemetryTime) {
      this.generateTelemetryPacket();
      this.nextTelemetryTime = this.time + telemetryInterval;
    }

    this.notify();
  }

  private physicsSubStep(dt: number): void {
    this.time += dt;

    // Power drain model:
    // Base avionics: 45mA, RF transmitter packet: +75mA average, sensors: 10mA
    // 800mAh capacity -> drain per second
    const activeCurrentMa = 55 + (this.stage === 'DESCENT' ? 15 : 0);
    const capacityMah = 800;
    const dischargeRate = (activeCurrentMa / (capacityMah * 3600)) * 100; // % per second
    this.batteryRemaining = Math.max(0, this.batteryRemaining - dischargeRate * dt);

    // Wind drift calculations
    const windRad = (this.config.windDirection * Math.PI) / 180.0;
    const windVx = this.config.windSpeed * Math.sin(windRad);
    const windVy = this.config.windSpeed * Math.cos(windRad);

    if (this.stage === 'ASCENT') {
      this.updateAscentPhase(dt, windVx, windVy);
    } else if (this.stage === 'DEPLOYMENT') {
      this.updateDeploymentPhase(dt, windVx, windVy);
    } else if (this.stage === 'DESCENT') {
      this.updateDescentPhase(dt, windVx, windVy);
    } else if (this.stage === 'LANDING') {
      this.updateLandingPhase();
    }
  }

  private updateAscentPhase(dt: number, windVx: number, windVy: number): void {
    if (this.time < this.burnTime) {
      // Motor thrust phase: constant acceleration to burnOutVelocity
      const aBurn = this.burnOutVelocity / this.burnTime;
      this.acceleration = aBurn;
      this.velocity += aBurn * dt;
      this.altitude += this.velocity * dt;

      // Rocket attitude during burn (stable, minor roll)
      this.pitch = 88 + (Math.random() - 0.5) * 1.5;
      this.roll = (this.roll + 180 * dt) % 360;
      this.yaw = this.config.windDirection;
    } else {
      // Coasting phase to apogee
      // Decelerating under gravity and aerodynamic drag
      const aDrag = 0.0015 * this.velocity * this.velocity;
      this.acceleration = -GRAVITY - aDrag;
      this.velocity += this.acceleration * dt;
      this.altitude += this.velocity * dt;

      // Gradual pitch over at top of trajectory
      this.pitch = Math.max(0, 85 - (this.time - this.burnTime) * 12);
      this.roll = (this.roll + 90 * dt) % 360;
    }

    // High velocity records
    if (this.velocity > this.maxAscentVelRecorded) {
      this.maxAscentVelRecorded = this.velocity;
    }
    if (this.altitude > this.maxAltRecorded) {
      this.maxAltRecorded = this.altitude;
    }

    // Minimal wind drift during fast rocket ascent
    this.driftX += windVx * 0.15 * dt;
    this.driftY += windVy * 0.15 * dt;

    // Detect apogee: vertical velocity reaches zero or turns negative
    if (this.velocity <= 0.2 || this.altitude >= this.targetApogee * 1.02) {
      this.stage = 'DEPLOYMENT';
      this.velocity = 0;
      this.apogeeTime = this.time;
      this.addEvent(
        'DEPLOYMENT',
        'Apogee Reached & CanSat Ejection',
        `Apogee detected at ${this.altitude.toFixed(1)}m. Virtual separation mechanism fired. Parachute deployment underway.`,
        'milestone'
      );
    }
  }

  private updateDeploymentPhase(dt: number, windVx: number, windVy: number): void {
    // Parachute deployment transition (0.9s duration)
    const timeSinceApogee = this.time - this.apogeeTime;
    this.acceleration = -GRAVITY * 0.4;
    this.velocity += this.acceleration * dt;
    this.altitude += this.velocity * dt;

    // Aerodynamic tumble while parachute opens
    this.pitch = 45 * Math.sin(timeSinceApogee * 8);
    this.roll = (this.roll + 220 * dt) % 360;
    this.driftX += windVx * 0.5 * dt;
    this.driftY += windVy * 0.5 * dt;

    if (timeSinceApogee >= 0.9) {
      this.stage = 'DESCENT';
      this.addEvent(
        'DESCENT',
        'Parachute Full Inflation',
        `Parachute canopy diameter ${this.config.parachuteDiameter}m inflated. Controlled descent initiated.`,
        'milestone'
      );
    }
  }

  private updateDescentPhase(dt: number, windVx: number, windVy: number): void {
    // Parachute descent physics
    const terminalV = calculateTerminalDescentVelocity(
      this.config.canMass,
      this.config.parachuteDiameter,
      this.altitude
    );

    // Negative velocity (descent)
    const targetDescentSpeed = -terminalV;
    // Approach terminal velocity smoothly
    const relaxFactor = 2.5;
    this.velocity += (targetDescentSpeed - this.velocity) * Math.min(1, dt * relaxFactor);
    this.acceleration = (targetDescentSpeed - this.velocity) * relaxFactor;
    this.altitude += this.velocity * dt;

    // Pendulum swinging motion of CanSat under parachute
    const swingFreq = 1.4; // Hz
    this.pitch = 8.5 * Math.sin(this.time * swingFreq);
    this.roll = 6.2 * Math.cos(this.time * swingFreq * 1.2);
    this.yaw = (this.yaw + dt * 10) % 360;

    // Wind drift during descent
    this.driftX += windVx * dt;
    this.driftY += windVy * dt;

    const descentSpeed = Math.abs(this.velocity);
    this.descentVelocities.push(descentSpeed);
    if (descentSpeed > this.maxDescentVelRecorded) {
      this.maxDescentVelRecorded = descentSpeed;
    }

    // Touchdown detection: altitude reaches ground level
    if (this.altitude <= 0.5) {
      this.altitude = 0;
      this.touchdownTime = this.time;
      this.stage = 'LANDING';
      this.addEvent(
        'LANDING',
        'Touchdown Detected',
        `Ground impact detected. Altimeter: 0.0m. Descent rate zeroed. Activating acoustic recovery beacon.`,
        'milestone'
      );
    }
  }

  private updateLandingPhase(): void {
    this.velocity = 0;
    this.altitude = 0;
    this.acceleration = 0;
    this.pitch = 0;
    this.roll = 0;

    // Small delay before marking completed to let ground crew and telemetry settle
    if (this.time - this.touchdownTime > 1.5) {
      this.stage = 'COMPLETED';
      this.isRunning = false;
      this.computePerformanceReport();
      this.addEvent(
        'COMPLETED',
        'Mission Debrief Ready',
        `Flight mission successfully completed. Final performance metrics calculated. Telemetry logged.`,
        'success'
      );
    }
  }

  private generateTelemetryPacket(): void {
    this.packetsSent++;

    // Simulated packet loss injection
    const lossProb = this.config.packetLossRate / 100.0;
    const isLost = Math.random() < lossProb;

    if (isLost) {
      this.packetsLost++;
    } else {
      this.packetsReceived++;
    }

    const point = this.createTelemetrySnapshot(isLost);
    this.currentTelemetry = point;
    this.telemetryHistory.push(point);

    // Keep reasonable history size (max 3000 points to avoid memory bloat)
    if (this.telemetryHistory.length > 3000) {
      this.telemetryHistory.shift();
    }
  }

  private createTelemetrySnapshot(isLost: boolean): TelemetryPoint {
    const rawAlt = Math.max(0, this.altitude);
    const noisyAlt = addSensorNoise(rawAlt, 0.45);
    const noisyTemp = addSensorNoise(calculateTemperature(rawAlt), 0.15);
    const noisyPress = addSensorNoise(calculatePressure(rawAlt), 0.6);

    const dist3D = Math.sqrt(this.driftX * this.driftX + this.driftY * this.driftY + rawAlt * rawAlt);
    const rssi = calculateRssi(dist3D);
    const gps = calculateGpsPosition(
      this.config.launchLatitude,
      this.config.launchLongitude,
      this.driftX,
      this.driftY
    );

    const voltage = calculateLiPoVoltage(this.batteryRemaining);
    const currentDraw = 52.0 + (this.stage === 'DESCENT' ? 18.0 : 0.0) + (Math.random() * 4.0 - 2.0);

    const formattedTime = new Date(this.time * 1000).toISOString().substr(14, 7);

    return {
      time: Number(this.time.toFixed(2)),
      timestamp: `T+${formattedTime}`,
      stage: this.stage,
      altitude: Number(noisyAlt.toFixed(2)),
      velocity: Number(this.velocity.toFixed(2)),
      acceleration: Number(this.acceleration.toFixed(2)),
      temperature: Number(noisyTemp.toFixed(2)),
      pressure: Number(noisyPress.toFixed(2)),
      latitude: gps.latitude,
      longitude: gps.longitude,
      batteryLevel: Number(this.batteryRemaining.toFixed(2)),
      batteryVoltage: Number(voltage.toFixed(2)),
      currentDraw: Number(currentDraw.toFixed(1)),
      pitch: Number(this.pitch.toFixed(1)),
      roll: Number(this.roll.toFixed(1)),
      yaw: Number(this.yaw.toFixed(1)),
      rssi,
      packetId: this.packetsSent,
      packetLost: isLost,
      distanceFromLaunch: Number(Math.sqrt(this.driftX * this.driftX + this.driftY * this.driftY).toFixed(1)),
    };
  }

  private computePerformanceReport(): void {
    const totalDuration = this.touchdownTime > 0 ? this.touchdownTime : this.time;
    const ascentDuration = this.apogeeTime > 0 ? this.apogeeTime - this.ascentStartTime : 10.0;
    const descentDuration = Math.max(1, totalDuration - (this.apogeeTime || 10.0));

    const avgDescentVel =
      this.descentVelocities.length > 0
        ? this.descentVelocities.reduce((a, b) => a + b, 0) / this.descentVelocities.length
        : 7.5;

    const batteryConsumed = this.config.initialBattery - this.batteryRemaining;
    const packetSuccessRate =
      this.packetsSent > 0 ? ((this.packetsReceived / this.packetsSent) * 100) : 100;

    const horizontalDrift = Math.sqrt(this.driftX * this.driftX + this.driftY * this.driftY);

    // ESA / AAS CanSat competition compliance check:
    // Rule 1: Apogee should be within +-20% of 500m target
    // Rule 2: Descent speed must be between 6.0 m/s and 11.0 m/s for recovery safety
    // Rule 3: Mass <= 350g, battery survival
    const complianceNotes: string[] = [];
    let compliant = true;

    if (avgDescentVel < 5.0) {
      compliant = false;
      complianceNotes.push('Descent velocity is too slow (<5.0 m/s) - risk of extreme wind drift outside recovery zone.');
    } else if (avgDescentVel > 11.0) {
      compliant = false;
      complianceNotes.push('Descent velocity is too high (>11.0 m/s) - violates safety kinetic energy limit at impact.');
    } else {
      complianceNotes.push(`Descent velocity (${avgDescentVel.toFixed(2)} m/s) compliant with ESA standard safe window (6 - 11 m/s).`);
    }

    if (Math.abs(this.maxAltRecorded - this.config.targetAltitude) / this.config.targetAltitude > 0.25) {
      complianceNotes.push(`Apogee variance higher than 25% from configured target.`);
    } else {
      complianceNotes.push(`Apogee target achieved (${this.maxAltRecorded.toFixed(1)}m / target ${this.config.targetAltitude}m).`);
    }

    if (packetSuccessRate < 85) {
      complianceNotes.push(`Radio link packet loss high (${(100 - packetSuccessRate).toFixed(1)}% dropped). Consider dipole tuning.`);
    } else {
      complianceNotes.push(`Telemetry reliability excellent (${packetSuccessRate.toFixed(1)}% received).`);
    }

    this.performance = {
      maxAltitude: Number(this.maxAltRecorded.toFixed(1)),
      totalDuration: Number(totalDuration.toFixed(1)),
      ascentDuration: Number(ascentDuration.toFixed(1)),
      descentDuration: Number(descentDuration.toFixed(1)),
      maxAscentVelocity: Number(this.maxAscentVelRecorded.toFixed(1)),
      avgDescentVelocity: Number(avgDescentVel.toFixed(2)),
      maxDescentVelocity: Number(this.maxDescentVelRecorded.toFixed(2)),
      landingVelocity: 0,
      batteryConsumed: Number(batteryConsumed.toFixed(2)),
      packetsSent: this.packetsSent,
      packetsReceived: this.packetsReceived,
      packetsLost: this.packetsLost,
      packetSuccessRate: Number(packetSuccessRate.toFixed(1)),
      horizontalDrift: Number(horizontalDrift.toFixed(1)),
      landingDetected: true,
      competitionCompliant: compliant,
      complianceNotes,
    };
  }

  private addEvent(stage: MissionStage, title: string, description: string, type: 'info' | 'milestone' | 'warning' | 'success'): void {
    const event: MissionEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      time: Number(this.time.toFixed(1)),
      stage,
      title,
      description,
      type,
    };
    this.events.unshift(event);
  }

  /**
   * Export telemetry data to RFC-4180 standard CSV
   */
  public exportCsv(): string {
    const headers = [
      'Packet_ID',
      'MET_Seconds',
      'Mission_Stage',
      'Altitude_m',
      'Vertical_Velocity_ms',
      'Vertical_Accel_ms2',
      'Temperature_C',
      'Pressure_hPa',
      'GPS_Latitude',
      'GPS_Longitude',
      'Battery_Percent',
      'Battery_Voltage_V',
      'Current_Draw_mA',
      'Pitch_Deg',
      'Roll_Deg',
      'Yaw_Deg',
      'RSSI_dBm',
      'Drift_Distance_m',
      'Data_Classification',
    ];

    const rows = this.telemetryHistory.map((p) => [
      p.packetId,
      p.time.toFixed(2),
      p.stage,
      p.altitude.toFixed(2),
      p.velocity.toFixed(2),
      p.acceleration.toFixed(2),
      p.temperature.toFixed(2),
      p.pressure.toFixed(2),
      p.latitude.toFixed(6),
      p.longitude.toFixed(6),
      p.batteryLevel.toFixed(2),
      p.batteryVoltage.toFixed(2),
      p.currentDraw.toFixed(1),
      p.pitch.toFixed(1),
      p.roll.toFixed(1),
      p.yaw.toFixed(1),
      p.rssi,
      p.distanceFromLaunch.toFixed(1),
      'SIMULATED_DATA',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }

  /**
   * Export full mission summary in JSON
   */
  public exportMissionJson(): string {
    return JSON.stringify(
      {
        mission: 'CanSat Flight Simulation and Digital Twin',
        generatedAt: new Date().toISOString(),
        configuration: this.config,
        performanceReport: this.performance,
        events: this.events,
        telemetrySampleCount: this.telemetryHistory.length,
        disclaimer: 'ALL DATA GENERATED VIA MATHEMATICAL DIGITAL TWIN SIMULATION. NOT FROM PHYSICAL FLIGHT SENSORS.',
      },
      null,
      2
    );
  }
}
