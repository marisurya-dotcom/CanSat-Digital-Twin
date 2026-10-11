/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { TelemetryPoint, MissionStage } from '../types/cansat';
import { Eye, Layers, Compass, Wind, Sparkles } from 'lucide-react';

interface DigitalTwinCanvasProps {
  telemetry: TelemetryPoint;
  targetAltitude: number;
}

export const DigitalTwinCanvas: React.FC<DigitalTwinCanvasProps> = ({
  telemetry,
  targetAltitude,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'closeup' | 'flightProfile'>('closeup');
  const [showWireframe, setShowWireframe] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let localTick = 0;

    const render = () => {
      localTick += 0.03;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (viewMode === 'closeup') {
        renderCloseupView(ctx, width, height, telemetry, localTick, showWireframe);
      } else {
        renderFlightProfileView(ctx, width, height, telemetry, targetAltitude, localTick);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [telemetry, viewMode, targetAltitude, showWireframe]);

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      {/* Visualizer Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
            Digital Twin Visualizer
          </span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs font-mono text-cyan-400">
            {telemetry.stage.replace('_', ' ')}
          </span>
          <span className="text-xs text-slate-500">·</span>
          <span className="text-xs font-mono text-slate-400">
            {telemetry.altitude.toFixed(1)} m
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-slate-700/60 text-xs">
            <button
              onClick={() => setViewMode('closeup')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'closeup'
                  ? 'bg-cyan-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CanSat Unit
            </button>
            <button
              onClick={() => setViewMode('flightProfile')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap ${
                viewMode === 'flightProfile'
                  ? 'bg-cyan-600 text-white font-medium shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Trajectory Arc
            </button>
          </div>

          {viewMode === 'closeup' && (
            <button
              onClick={() => setShowWireframe(!showWireframe)}
              title="Toggle Internal Chassis View"
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                showWireframe
                  ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <div className="relative flex-1 min-h-[340px] w-full bg-slate-950 overflow-hidden cursor-crosshair">
        <canvas
          ref={canvasRef}
          width={640}
          height={400}
          className="w-full h-full object-cover block"
        />

        {/* Telemetry HUD Overlays in Canvas Corners */}
        <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-sm border border-slate-800 px-3 py-2 rounded-lg text-xs font-mono space-y-1">
          <div className="flex items-center justify-between gap-4 text-slate-400">
            <span>ATTITUDE:</span>
            <span className="text-cyan-300">
              P:{telemetry.pitch > 0 ? `+${telemetry.pitch}` : telemetry.pitch}° R:{telemetry.roll}°
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-400">
            <span>VERTICAL V:</span>
            <span className={telemetry.velocity >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
              {telemetry.velocity > 0 ? `+${telemetry.velocity}` : telemetry.velocity} m/s
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-400">
            <span>BARO PRESS:</span>
            <span className="text-slate-200">{telemetry.pressure.toFixed(1)} hPa</span>
          </div>
        </div>

        <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-sm border border-slate-800 px-3 py-2 rounded-lg text-xs font-mono space-y-1 text-right">
          <div className="text-slate-400">
            SIMULATED TWIN <span className="text-emerald-400">● SYNC</span>
          </div>
          <div className="text-slate-300">
            DRIFT: <span className="text-cyan-300 font-bold">{telemetry.distanceFromLaunch.toFixed(1)} m</span>
          </div>
          <div className="text-slate-400 text-[10px]">
            WGS84: {telemetry.latitude.toFixed(4)}, {telemetry.longitude.toFixed(4)}
          </div>
        </div>

        {/* Stage Status Ribbon at Canvas Bottom */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 bg-slate-900/80 backdrop-blur-sm border border-slate-800/80 rounded-lg text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">STAGE EVENT:</span>
            <span className="text-cyan-400 font-medium">
              {getStageDescription(telemetry.stage)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>SCALE: 115mm × 66mm CAN</span>
            <span>MASS: 350g</span>
          </div>
        </div>
      </div>
    </div>
  );
};

function getStageDescription(stage: MissionStage): string {
  switch (stage) {
    case 'PRE_LAUNCH':
      return 'On Launch Rail (Standby)';
    case 'ASCENT':
      return 'Rocket Thrust & Boost Phase';
    case 'DEPLOYMENT':
      return 'Apogee Ejection & Parachute Unfurling';
    case 'DESCENT':
      return 'Controlled Parachute Glideslope';
    case 'LANDING':
      return 'Touchdown & Acoustic Beacon Active';
    case 'COMPLETED':
      return 'Mission Completed - Ground Recovery';
  }
}

/**
 * High-detail rendered close-up 3D isometric view of the CanSat
 */
function renderCloseupView(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  telemetry: TelemetryPoint,
  tick: number,
  wireframe: boolean
) {
  // Background Sky/Atmosphere dynamic gradient based on altitude
  const altFraction = Math.min(1, telemetry.altitude / 800);
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  if (telemetry.stage === 'PRE_LAUNCH' || (telemetry.stage === 'LANDING' && telemetry.altitude < 1)) {
    // Pad ground environment
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.7, '#1e293b');
    grad.addColorStop(1, '#064e3b'); // green pad surface at bottom
  } else {
    // High atmosphere
    const topColor = altFraction > 0.6 ? '#020617' : '#091e3a';
    const bottomColor = altFraction > 0.6 ? '#0b192c' : '#1e3a8a';
    grad.addColorStop(0, topColor);
    grad.addColorStop(1, bottomColor);
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Background atmospheric grid / altitude lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  const gridSpacing = 40;
  for (let x = 0; x < width; x += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSpacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Draw passing wind / cloud particles during descent or ascent
  if (telemetry.stage === 'ASCENT' || telemetry.stage === 'DESCENT') {
    const isDescent = telemetry.stage === 'DESCENT';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const px = ((i * 53 + tick * (isDescent ? 40 : 15)) % width);
      const py = ((i * 37 + tick * (isDescent ? -120 : 180)) % height + height) % height;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + (isDescent ? 12 : -8), py + (isDescent ? -20 : 25));
      ctx.stroke();
    }
  }

  // Ground plane if near surface
  if (telemetry.altitude < 10) {
    const groundY = height - 40 + telemetry.altitude * 3;
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, groundY, width, height - groundY);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.stroke();

    // Touchdown target concentric rings
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
    ctx.beginPath();
    ctx.ellipse(width / 2, groundY + 15, 90, 20, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // CanSat Center Coordinates
  const cx = width / 2;
  const cy = height / 2 + (telemetry.stage === 'DESCENT' ? 35 : 0);

  ctx.save();
  ctx.translate(cx, cy);

  // Pitch tilt & pendulum oscillation
  const pitchRad = (telemetry.pitch * Math.PI) / 180.0;
  ctx.rotate(pitchRad * 0.45);

  // Parachute Canopy Rendering (only during DEPLOYMENT or DESCENT)
  if (telemetry.stage === 'DEPLOYMENT' || telemetry.stage === 'DESCENT') {
    renderParachute(ctx, tick, telemetry.stage === 'DEPLOYMENT');
  }

  // If in rocket ascent, render outer rocket fairing envelope indicator
  if (telemetry.stage === 'ASCENT') {
    renderRocketShroud(ctx, tick);
  }

  // Draw CanSat Standard Soda-Can Chassis (66mm diameter x 115mm height)
  renderCanSatChassis(ctx, tick, telemetry, wireframe);

  ctx.restore();
}

/**
 * Draws the parachute canopy, suspension lines, and aerodynamic flutter
 */
function renderParachute(ctx: CanvasRenderingContext2D, tick: number, isDeploying: boolean) {
  const chuteY = isDeploying ? -95 : -140;
  const canopyWidth = isDeploying ? 70 : 130;
  const canopyHeight = isDeploying ? 30 : 55;
  const flutter = Math.sin(tick * 6) * 3;

  // Suspension Lines (shroud lines from can top ring to canopy edge)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 1;
  const lineOrigins = [-canopyWidth / 2 + 5, -canopyWidth / 4, 0, canopyWidth / 4, canopyWidth / 2 - 5];

  lineOrigins.forEach((lx) => {
    ctx.beginPath();
    ctx.moveTo(0, -50); // Attachment eyelet at top of CanSat
    ctx.lineTo(lx, chuteY + canopyHeight - 6);
    ctx.stroke();
  });

  // Parachute Canopy Dome
  const canopyGrad = ctx.createLinearGradient(0, chuteY - canopyHeight, 0, chuteY + 10);
  canopyGrad.addColorStop(0, '#f97316'); // aerospace orange
  canopyGrad.addColorStop(0.5, '#ea580c');
  canopyGrad.addColorStop(1, '#ffffff'); // white contrast panel

  ctx.fillStyle = canopyGrad;
  ctx.strokeStyle = '#c2410c';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(-canopyWidth / 2, chuteY + canopyHeight - 6 + flutter);
  // Top parabolic arc
  ctx.bezierCurveTo(
    -canopyWidth / 2,
    chuteY - canopyHeight,
    canopyWidth / 2,
    chuteY - canopyHeight,
    canopyWidth / 2,
    chuteY + canopyHeight - 6 - flutter
  );
  // Bottom scalloped hem
  ctx.bezierCurveTo(
    canopyWidth / 4,
    chuteY + canopyHeight - 12,
    -canopyWidth / 4,
    chuteY + canopyHeight - 12,
    -canopyWidth / 2,
    chuteY + canopyHeight - 6 + flutter
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Canopy gore stripes (alternating high-visibility orange & white)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1.2;
  [-canopyWidth / 3, 0, canopyWidth / 3].forEach((gx) => {
    ctx.beginPath();
    ctx.moveTo(gx, chuteY - canopyHeight + 4);
    ctx.lineTo(gx * 1.1, chuteY + canopyHeight - 8);
    ctx.stroke();
  });

  // Spill hole vent at apex
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.ellipse(0, chuteY - canopyHeight + 5, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draws Rocket Fairing during rocket ascent
 */
function renderRocketShroud(ctx: CanvasRenderingContext2D, tick: number) {
  // Translucent rocket payload bay outline
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  ctx.beginPath();
  ctx.moveTo(-36, -70);
  ctx.lineTo(0, -115); // Nosecone tip
  ctx.lineTo(36, -70);
  ctx.lineTo(36, 85);
  ctx.lineTo(-36, 85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  // Rocket exhaust flames below
  const flameHeight = 45 + Math.sin(tick * 15) * 12;
  const flameGrad = ctx.createLinearGradient(0, 85, 0, 85 + flameHeight);
  flameGrad.addColorStop(0, '#fef08a');
  flameGrad.addColorStop(0.4, '#f97316');
  flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-18, 85);
  ctx.lineTo(0, 85 + flameHeight);
  ctx.lineTo(18, 85);
  ctx.closePath();
  ctx.fill();
}

/**
 * Draws CanSat cylindrical body, sensors, circuit boards, solar strips, and antenna
 */
function renderCanSatChassis(
  ctx: CanvasRenderingContext2D,
  tick: number,
  telemetry: TelemetryPoint,
  wireframe: boolean
) {
  const canW = 54;
  const canH = 96;

  // Helical 433MHz Antenna on Top
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(12, -canH / 2);
  // Spiral antenna coils
  for (let y = -canH / 2; y > -canH / 2 - 28; y -= 4) {
    const xOff = Math.sin((y + tick * 8) * 0.8) * 4;
    ctx.lineTo(12 + xOff, y);
  }
  ctx.stroke();

  // Radio RF radiation wave ripples
  if (telemetry.stage !== 'COMPLETED' && !telemetry.packetLost) {
    ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + Math.sin(tick * 8) * 0.3})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(12, -canH / 2 - 28, 14 + (tick * 12) % 24, -Math.PI * 0.8, -Math.PI * 0.2);
    ctx.stroke();
  }

  // Top Cap Ellipse
  ctx.fillStyle = '#64748b';
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, -canH / 2, canW / 2, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Main Cylinder Hull
  if (wireframe) {
    // Internal avionics & PCB stack
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 1;
    ctx.strokeRect(-canW / 2, -canH / 2, canW, canH);

    // PCB stack boards (Sensor, Microcontroller, Radio)
    const pcbs = [-25, 0, 25];
    pcbs.forEach((py) => {
      ctx.fillStyle = '#059669';
      ctx.fillRect(-canW / 2 + 4, py - 2, canW - 8, 4);
      // Small chip
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-6, py - 6, 12, 4);
    });

    // 1S LiPo Battery Pack in center
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-15, 30, 30, 14);
  } else {
    // Metallic Anodized Aerospace Aluminum Hull
    const hullGrad = ctx.createLinearGradient(-canW / 2, 0, canW / 2, 0);
    hullGrad.addColorStop(0, '#334155');
    hullGrad.addColorStop(0.3, '#64748b');
    hullGrad.addColorStop(0.6, '#94a3b8');
    hullGrad.addColorStop(0.85, '#475569');
    hullGrad.addColorStop(1, '#1e293b');

    ctx.fillStyle = hullGrad;
    ctx.fillRect(-canW / 2, -canH / 2, canW, canH);

    // Structural Ribs / Grooves
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.6)';
    ctx.lineWidth = 1.5;
    [-20, 0, 20].forEach((ry) => {
      ctx.beginPath();
      ctx.moveTo(-canW / 2, ry);
      ctx.lineTo(canW / 2, ry);
      ctx.stroke();
    });

    // Outer Solar Panel cell patch
    ctx.fillStyle = '#1e1b4b'; // Deep blue solar cell
    ctx.strokeStyle = '#4338ca';
    ctx.lineWidth = 1;
    ctx.fillRect(-canW / 2 + 6, -16, canW - 12, 32);
    ctx.strokeRect(-canW / 2 + 6, -16, canW - 12, 32);

    // Mission Label Stencil
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CANSAT-01', 0, 2);

    // Barometer & Pitot Sensor Port
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-14, 28, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Flight Status LED (Green nominal, Orange descending, Red beacon)
    const ledColor =
      telemetry.stage === 'LANDING' || telemetry.stage === 'COMPLETED'
        ? Math.sin(tick * 10) > 0 ? '#ef4444' : '#7f1d1d'
        : telemetry.stage === 'DESCENT'
        ? '#10b981'
        : '#06b6d4';

    ctx.fillStyle = ledColor;
    ctx.beginPath();
    ctx.arc(14, 28, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bottom Rim Ellipse
  ctx.fillStyle = '#475569';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(0, canH / 2, canW / 2, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * Trajectory Arc flight profile visualization showing the full mission corridor
 */
function renderFlightProfileView(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  telemetry: TelemetryPoint,
  targetAltitude: number,
  tick: number
) {
  // Dark space obsidian canvas
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, width, height);

  const padLeft = 60;
  const padRight = 50;
  const padBottom = 45;
  const padTop = 35;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Grid lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;

  // Altitude Y axis lines (0m, 250m, 500m, etc.)
  const altSteps = [0, targetAltitude * 0.5, targetAltitude, targetAltitude * 1.2];
  altSteps.forEach((alt) => {
    const y = padTop + plotH - (alt / (targetAltitude * 1.25)) * plotH;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${alt.toFixed(0)}m`, padLeft - 8, y + 3);
  });

  // Ground base line
  const groundY = padTop + plotH;
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padLeft, groundY);
  ctx.lineTo(width - padRight, groundY);
  ctx.stroke();

  // Theoretical Flight Curve (Ascent Arc + Parachute Descent Slope)
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);

  const xLaunch = padLeft + 20;
  const xApogee = padLeft + plotW * 0.35;
  const yApogee = padTop + plotH - (targetAltitude / (targetAltitude * 1.25)) * plotH;
  const xLanding = padLeft + plotW * 0.9;

  ctx.beginPath();
  ctx.moveTo(xLaunch, groundY);
  // Quadratic ascent curve to apogee
  ctx.quadraticCurveTo(padLeft + plotW * 0.15, yApogee - 5, xApogee, yApogee);
  // Linear descent slope to landing zone
  ctx.lineTo(xLanding, groundY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Apogee threshold annotation line
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
  ctx.beginPath();
  ctx.moveTo(padLeft, yApogee);
  ctx.lineTo(width - padRight, yApogee);
  ctx.stroke();

  ctx.fillStyle = '#f59e0b';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`TARGET APOGEE: ${targetAltitude}m`, padLeft + 10, yApogee - 6);

  // Calculate current CanSat marker position on graph
  let curX = xLaunch;
  let curY = groundY;

  const curAltClamped = Math.max(0, telemetry.altitude);
  curY = padTop + plotH - (curAltClamped / (targetAltitude * 1.25)) * plotH;

  if (telemetry.stage === 'PRE_LAUNCH') {
    curX = xLaunch;
  } else if (telemetry.stage === 'ASCENT') {
    const fraction = Math.min(1, curAltClamped / targetAltitude);
    curX = xLaunch + (xApogee - xLaunch) * Math.sqrt(fraction);
  } else if (telemetry.stage === 'DEPLOYMENT') {
    curX = xApogee;
  } else {
    // Descent or Landing
    const descentFraction = 1 - Math.min(1, curAltClamped / targetAltitude);
    curX = xApogee + (xLanding - xApogee) * descentFraction;
  }

  // Draw Launch Pad Marker
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(xLaunch, groundY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PAD (0,0)', xLaunch, groundY + 16);

  // Draw Projected Landing Marker
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(xLanding, groundY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillText('RECOVERY ZONE', xLanding, groundY + 16);

  // Draw Current Position Pulsing Beacon
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(curX, curY, 8 + Math.sin(tick * 8) * 3, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(curX, curY, 4, 0, Math.PI * 2);
  ctx.fill();

  // Current Position Data Tag
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`ALT: ${telemetry.altitude.toFixed(1)}m`, curX + 12, curY - 5);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '9px monospace';
  ctx.fillText(`V: ${telemetry.velocity > 0 ? `+${telemetry.velocity}` : telemetry.velocity} m/s`, curX + 12, curY + 8);
}
