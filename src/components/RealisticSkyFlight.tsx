/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { TelemetryPoint, MissionStage } from '../types/cansat';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  Camera,
  Wind,
  Layers,
  Sparkles,
  Compass,
} from 'lucide-react';

interface RealisticSkyFlightProps {
  telemetry: TelemetryPoint;
  targetAltitude: number;
  windSpeed: number;
  windDirection: number;
}

interface CloudParticle {
  x: number; // 0 to 1 relative to width
  y: number; // 0 to 1 relative to height
  size: number;
  speed: number;
  opacity: number;
  shapePuffs: { dx: number; dy: number; r: number }[];
}

interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  maxLife: number;
  age: number;
}

export const RealisticSkyFlight: React.FC<RealisticSkyFlightProps> = ({
  telemetry,
  targetAltitude,
  windSpeed,
  windDirection,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraMode, setCameraMode] = useState<'follow' | 'closeup' | 'wide'>('follow');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [showInternalElectronics, setShowInternalElectronics] = useState(false);

  // Parallax Clouds state stored in ref for continuity
  const cloudsRef = useRef<CloudParticle[]>([]);
  const smokeRef = useRef<SmokeParticle[]>([]);
  const chuteDeployAnimRef = useRef<number>(0); // 0 (closed) to 1 (full open)
  const parachuteDeflateRef = useRef<number>(0); // 0 (inflated) to 1 (collapsed on ground)

  // Initialize procedural soft clouds
  useEffect(() => {
    const clouds: CloudParticle[] = [];
    const cloudCount = 14;

    for (let i = 0; i < cloudCount; i++) {
      const puffs = [];
      const puffCount = 5 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffCount; p++) {
        puffs.push({
          dx: (Math.random() - 0.5) * 80,
          dy: (Math.random() - 0.5) * 35,
          r: 25 + Math.random() * 35,
        });
      }

      clouds.push({
        x: Math.random() * 1.4 - 0.2,
        y: Math.random() * 1.2 - 0.1,
        size: 0.6 + Math.random() * 0.8,
        speed: 0.00015 + Math.random() * 0.0003,
        opacity: 0.35 + Math.random() * 0.45,
        shapePuffs: puffs,
      });
    }
    cloudsRef.current = clouds;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const render = () => {
      tick += 0.016;
      const w = canvas.width;
      const h = canvas.height;

      // Handle parachute inflation and deflation animations
      if (telemetry.stage === 'DEPLOYMENT') {
        chuteDeployAnimRef.current = Math.min(1, chuteDeployAnimRef.current + 0.035);
      } else if (telemetry.stage === 'DESCENT') {
        chuteDeployAnimRef.current = 1.0;
      } else if (telemetry.stage === 'LANDING' || telemetry.stage === 'COMPLETED') {
        parachuteDeflateRef.current = Math.min(1, parachuteDeflateRef.current + 0.025);
      } else {
        chuteDeployAnimRef.current = 0.0;
        parachuteDeflateRef.current = 0.0;
      }

      // Clear canvas
      ctx.clearRect(0, 0, w, h);

      // 1. Draw Daylight Sky Environment & Sunlight
      drawRealisticSky(ctx, w, h, telemetry.altitude, targetAltitude, tick);

      // 2. Draw Soft Parallax Cumulus Clouds
      drawParallaxClouds(ctx, w, h, cloudsRef.current, telemetry, tick);

      // 3. Draw Distant Horizon & Ground when low altitude
      drawGroundAndHorizon(ctx, w, h, telemetry.altitude, tick);

      // 4. Update & Draw Rocket/Separation Smoke Trail
      updateAndDrawSmoke(ctx, smokeRef.current, telemetry, tick);

      // 5. Draw CanSat & Parachute Assembly with Camera Transforms
      drawCanSatAssembly(
        ctx,
        w,
        h,
        telemetry,
        cameraMode,
        zoomLevel,
        tick,
        showInternalElectronics,
        chuteDeployAnimRef.current,
        parachuteDeflateRef.current,
        windSpeed,
        windDirection
      );

      // 6. Draw Subtle Vignette & Atmospheric Sun Ray Highlights
      drawAtmosphericLighting(ctx, w, h, tick);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [telemetry, cameraMode, zoomLevel, showInternalElectronics, targetAltitude, windSpeed, windDirection]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200/80 bg-white shadow-lg flex flex-col select-none">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Left: Mission & Flight Mode Status Pill */}
        <div className="pointer-events-auto flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200/90 shadow-sm text-xs font-medium text-slate-700">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
          <span className="font-semibold text-slate-900 tracking-tight">
            CanSat Sky Simulator
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-sky-600 font-mono font-bold uppercase">
            {telemetry.stage.replace('_', ' ')}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500 font-mono">
            {telemetry.altitude.toFixed(1)} m
          </span>
        </div>

        {/* Right: Camera Mode & Zoom Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-full border border-slate-200/90 shadow-sm text-xs">
          <button
            onClick={() => setCameraMode('follow')}
            className={`px-3 py-1 rounded-full transition-colors whitespace-nowrap font-medium ${
              cameraMode === 'follow'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Auto-track CanSat through the sky"
          >
            Sky Follow
          </button>
          <button
            onClick={() => setCameraMode('closeup')}
            className={`px-3 py-1 rounded-full transition-colors whitespace-nowrap font-medium ${
              cameraMode === 'closeup'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Close-up detail of satellite chassis"
          >
            Chassis Detail
          </button>
          <button
            onClick={() => setCameraMode('wide')}
            className={`px-3 py-1 rounded-full transition-colors whitespace-nowrap font-medium ${
              cameraMode === 'wide'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            title="Distant high-altitude column view"
          >
            Wide View
          </button>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* Internal Electronics X-Ray toggle */}
          <button
            onClick={() => setShowInternalElectronics(!showInternalElectronics)}
            className={`p-1.5 rounded-full transition-colors ${
              showInternalElectronics
                ? 'bg-sky-100 text-sky-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Inspect internal electronics & PCB stack"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* Zoom In/Out */}
          <button
            onClick={() => setZoomLevel((z) => Math.min(1.8, z + 0.15))}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
            className="p-1.5 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Sky Canvas Viewport */}
      <div className="relative w-full h-[520px] bg-sky-100 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={960}
          height={520}
          className="w-full h-full object-cover block cursor-grab active:cursor-grabbing"
        />

        {/* Floating Telemetry HUD: Top-Left Primary Flight Metric */}
        <div className="absolute top-16 left-4 pointer-events-none flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur-md border border-white/70 shadow-sm rounded-xl px-3.5 py-2.5 text-slate-800 font-mono w-48">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 flex items-center justify-between">
              <span>Altimeter</span>
              <span className="text-sky-600 font-bold">LIVE</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5 tabular-nums">
              {telemetry.altitude.toFixed(1)}{' '}
              <span className="text-xs font-normal text-slate-500">m</span>
            </div>
            <div className="w-full bg-slate-200/80 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-sky-500 h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(100, (telemetry.altitude / targetAltitude) * 100)}%`,
                }}
              />
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md border border-white/70 shadow-sm rounded-xl px-3.5 py-2 text-slate-800 font-mono w-48 flex items-center justify-between text-xs">
            <span className="text-slate-500 uppercase text-[10px]">Velocity</span>
            <span
              className={`font-bold tabular-nums ${
                telemetry.velocity >= 0 ? 'text-emerald-600' : 'text-sky-600'
              }`}
            >
              {telemetry.velocity > 0 ? `+${telemetry.velocity.toFixed(2)}` : telemetry.velocity.toFixed(2)} m/s
            </span>
          </div>
        </div>

        {/* Floating Telemetry HUD: Top-Right Environmental Sensors */}
        <div className="absolute top-16 right-4 pointer-events-none flex flex-col gap-2">
          <div className="bg-white/90 backdrop-blur-md border border-white/70 shadow-sm rounded-xl px-3.5 py-2.5 text-slate-800 font-mono w-44 text-right">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">
              Atmosphere
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">
              {telemetry.temperature.toFixed(1)} °C
            </div>
            <div className="text-xs text-slate-600 tabular-nums">
              {telemetry.pressure.toFixed(1)} hPa
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur-md border border-white/70 shadow-sm rounded-xl px-3.5 py-2 text-slate-800 font-mono w-44 flex items-center justify-between text-xs">
            <span className="text-slate-500 uppercase text-[10px]">Battery</span>
            <span
              className={`font-bold tabular-nums ${
                telemetry.batteryLevel > 30 ? 'text-emerald-600' : 'text-rose-600'
              }`}
            >
              {telemetry.batteryLevel.toFixed(1)}% ({telemetry.batteryVoltage.toFixed(2)}V)
            </span>
          </div>
        </div>

        {/* Floating Telemetry HUD: Bottom-Left Attitude & Orientation */}
        <div className="absolute bottom-4 left-4 pointer-events-none bg-white/90 backdrop-blur-md border border-white/70 shadow-sm rounded-xl px-3.5 py-2 text-slate-800 font-mono text-xs flex items-center gap-4">
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Pitch</span>
            <span className="font-bold text-slate-800">{telemetry.pitch > 0 ? `+${telemetry.pitch}` : telemetry.pitch}°</span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Roll</span>
            <span className="font-bold text-slate-800">{telemetry.roll}°</span>
          </div>
          <div className="h-4 w-px bg-slate-200" />
          <div>
            <span className="text-[10px] text-slate-400 block uppercase">Wind Drift</span>
            <span className="font-bold text-sky-600">{telemetry.distanceFromLaunch.toFixed(1)} m</span>
          </div>
        </div>

        {/* Floating Telemetry HUD: Bottom-Right Mission Timer */}
        <div className="absolute bottom-4 right-4 pointer-events-none bg-white/90 backdrop-blur-md border border-white/70 shadow-sm rounded-xl px-3.5 py-2 text-slate-800 font-mono text-xs flex items-center gap-2">
          <span className="text-[10px] text-slate-400 uppercase">Clock:</span>
          <span className="font-bold text-sky-700 tracking-wider text-sm">
            {telemetry.timestamp}
          </span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// RENDER HELPER FUNCTIONS (Natural Daylight Sky)
// ==========================================

/**
 * Renders natural bright blue sky with altitude-dependent gradients and warm sunlight
 */
function drawRealisticSky(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  altitude: number,
  targetAlt: number,
  tick: number
) {
  const altFraction = Math.min(1, altitude / Math.max(600, targetAlt));

  // Natural Sky Gradient:
  // Low altitude: soft airy azure and pale horizon white-cyan
  // High altitude: deeper rich cobalt daylight blue
  const skyGrad = ctx.createLinearGradient(0, 0, 0, h);

  if (altFraction < 0.3) {
    skyGrad.addColorStop(0, '#38bdf8'); // sky-400
    skyGrad.addColorStop(0.4, '#7dd3fc'); // sky-300
    skyGrad.addColorStop(0.8, '#bae6fd'); // sky-200
    skyGrad.addColorStop(1, '#f0f9ff'); // light horizon haze
  } else if (altFraction < 0.7) {
    skyGrad.addColorStop(0, '#0284c7'); // sky-600
    skyGrad.addColorStop(0.35, '#38bdf8'); // sky-400
    skyGrad.addColorStop(0.75, '#7dd3fc'); // sky-300
    skyGrad.addColorStop(1, '#e0f2fe'); // soft horizon
  } else {
    // High stratospheric altitude near apogee (500m+)
    skyGrad.addColorStop(0, '#1d4ed8'); // blue-700
    skyGrad.addColorStop(0.3, '#0284c7'); // sky-600
    skyGrad.addColorStop(0.7, '#38bdf8'); // sky-400
    skyGrad.addColorStop(1, '#bae6fd');
  }

  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h);

  // Warm Natural Daylight Sun (Top-right corner with soft lens glow)
  const sunX = w * 0.82;
  const sunY = h * 0.15;
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 180);
  sunGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  sunGrad.addColorStop(0.2, 'rgba(254, 240, 138, 0.55)');
  sunGrad.addColorStop(0.6, 'rgba(253, 224, 71, 0.12)');
  sunGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 180, 0, Math.PI * 2);
  ctx.fill();

  // Crisp sun disc
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 22, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draws realistic fluffy white cumulus clouds with multi-layer parallax motion
 */
function drawParallaxClouds(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  clouds: CloudParticle[],
  telemetry: TelemetryPoint,
  tick: number
) {
  // Cloud vertical movement shifts based on CanSat vertical velocity!
  // When ascending, clouds rush downwards
  // When descending, clouds gently drift upwards
  const vShift = telemetry.velocity * 0.0004;

  clouds.forEach((cloud) => {
    // Horizontal wind drift
    cloud.x += cloud.speed;
    if (cloud.x > 1.3) cloud.x = -0.3;

    // Vertical altitude parallax
    cloud.y += vShift;
    if (cloud.y > 1.3) cloud.y = -0.3;
    if (cloud.y < -0.3) cloud.y = 1.3;

    const cx = cloud.x * w;
    const cy = cloud.y * h;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(cloud.size, cloud.size);

    // Soft cloud shadow/base
    ctx.fillStyle = `rgba(224, 242, 254, ${cloud.opacity * 0.6})`;
    cloud.shapePuffs.forEach((puff) => {
      ctx.beginPath();
      ctx.arc(puff.dx, puff.dy + 8, puff.r * 1.05, 0, Math.PI * 2);
      ctx.fill();
    });

    // Sunlit bright white cloud body
    ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
    cloud.shapePuffs.forEach((puff) => {
      ctx.beginPath();
      ctx.arc(puff.dx, puff.dy, puff.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  });
}

/**
 * Draws landscape, horizon, launch pad, and ground runway as altitude approaches 0
 */
function drawGroundAndHorizon(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  altitude: number,
  tick: number
) {
  if (altitude > 180) return; // Horizon only visible below 180 metres

  // Calculate ground vertical position (rises up as altitude drops to 0)
  // At altitude = 0, ground line is at h - 90px
  const groundOffset = Math.max(0, (altitude / 180)) * h * 0.7;
  const groundY = h - 100 + groundOffset;

  if (groundY > h + 50) return;

  // Distant Mountain / Hills Ridge
  ctx.fillStyle = '#93c5fd';
  ctx.beginPath();
  ctx.moveTo(0, groundY - 15);
  ctx.bezierCurveTo(w * 0.25, groundY - 35, w * 0.5, groundY - 10, w * 0.75, groundY - 28);
  ctx.lineTo(w, groundY - 12);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  // Green Launch Complex Meadow & Terrain
  const terrainGrad = ctx.createLinearGradient(0, groundY, 0, h);
  terrainGrad.addColorStop(0, '#22c55e'); // vibrant green grass
  terrainGrad.addColorStop(0.3, '#16a34a');
  terrainGrad.addColorStop(1, '#15803d');

  ctx.fillStyle = terrainGrad;
  ctx.fillRect(0, groundY, w, h - groundY);

  // Concrete Launch Pad Runway & Circular Target Rings
  const padX = w / 2;
  const padY = groundY + 45;
  const padRx = 140;
  const padRy = 28;

  // Concrete Oval
  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(padX, padY, padRx, padRy, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Target Concentric Rings on Pad
  ctx.strokeStyle = '#f87171'; // Red target ring
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(padX, padY, padRx * 0.65, padRy * 0.65, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#ef4444';
  ctx.beginPath();
  ctx.ellipse(padX, padY, padRx * 0.3, padRy * 0.3, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Center bullseye
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.ellipse(padX, padY, 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Generates and updates realistic rocket propellant exhaust smoke and separation bursts
 */
function updateAndDrawSmoke(
  ctx: CanvasRenderingContext2D,
  smokeList: SmokeParticle[],
  telemetry: TelemetryPoint,
  tick: number
) {
  // If in rocket ascent, emit exhaust particles from rocket bottom
  if (telemetry.stage === 'ASCENT') {
    for (let i = 0; i < 2; i++) {
      smokeList.push({
        x: 480 + (Math.random() - 0.5) * 8,
        y: 330 + Math.random() * 5,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 3.5 + Math.random() * 2.5, // moving downwards
        radius: 6 + Math.random() * 4,
        alpha: 0.7,
        maxLife: 40,
        age: 0,
      });
    }
  }

  // Draw and age smoke particles
  for (let i = smokeList.length - 1; i >= 0; i--) {
    const p = smokeList[i];
    p.age++;
    p.x += p.vx;
    p.y += p.vy;
    p.radius += 0.4;
    p.alpha = Math.max(0, 0.7 * (1 - p.age / p.maxLife));

    if (p.age >= p.maxLife) {
      smokeList.splice(i, 1);
      continue;
    }

    const grad = ctx.createRadialGradient(p.x, p.y, p.radius * 0.1, p.x, p.y, p.radius);
    grad.addColorStop(0, `rgba(255, 255, 255, ${p.alpha})`);
    grad.addColorStop(0.5, `rgba(241, 245, 249, ${p.alpha * 0.8})`);
    grad.addColorStop(1, `rgba(203, 213, 225, 0)`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Primary CanSat model, Parachute, Shroud Lines, and Aerodynamic Attitude Animation
 */
function drawCanSatAssembly(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  telemetry: TelemetryPoint,
  cameraMode: 'follow' | 'closeup' | 'wide',
  zoomLevel: number,
  tick: number,
  showElectronics: boolean,
  chuteDeployRatio: number,
  chuteDeflateRatio: number,
  windSpeed: number,
  windDirection: number
) {
  ctx.save();

  // Center position of CanSat on canvas
  let canX = w / 2;
  let canY = h / 2 + 30;

  // In landing stage, CanSat touches the runway pad
  if (telemetry.altitude <= 0.5 || telemetry.stage === 'LANDING' || telemetry.stage === 'COMPLETED') {
    canY = h - 90;
  }

  // Camera Zoom & Scaling
  let baseScale = 1.0;
  if (cameraMode === 'closeup') baseScale = 1.45;
  if (cameraMode === 'wide') baseScale = 0.65;
  baseScale *= zoomLevel;

  ctx.translate(canX, canY);
  ctx.scale(baseScale, baseScale);

  // Soft contact drop shadow on ground when close (< 30m)
  if (telemetry.altitude < 30) {
    const shadowDist = telemetry.altitude * 2.8;
    const shadowAlpha = Math.max(0, 0.5 * (1 - telemetry.altitude / 30));
    const shadowScale = Math.max(0.4, 1 - telemetry.altitude / 60);

    ctx.save();
    ctx.translate(0, shadowDist);
    ctx.scale(shadowScale, shadowScale * 0.3);
    ctx.fillStyle = `rgba(15, 23, 42, ${shadowAlpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // CanSat Natural Flight Rotation: Pitch, Roll, and Aerodynamic Pendulum Sway
  // When descending under parachute, CanSat swings gently like a pendulum
  const pendulumAngle =
    telemetry.stage === 'DESCENT'
      ? Math.sin(tick * 2.2) * 0.12 + (telemetry.pitch * Math.PI) / 180 * 0.2
      : (telemetry.pitch * Math.PI) / 180 * 0.4;

  ctx.rotate(pendulumAngle);

  // 1. Draw Parachute Canopy and Shroud Lines (if deployed or descending)
  if (chuteDeployRatio > 0.05) {
    drawParachuteRealistic(ctx, chuteDeployRatio, chuteDeflateRatio, tick, windSpeed);
  }

  // 2. Draw Rocket Stage (if in launch / ascent phase)
  if (telemetry.stage === 'ASCENT') {
    drawRocketBoosterFairing(ctx, tick);
  }

  // 3. Draw High-Detail Miniature CanSat Body
  drawCanSatMiniature(ctx, telemetry, tick, showElectronics);

  ctx.restore();
}

/**
 * Draws High-Detail Realistic Miniature CanSat Body (66mm diameter x 115mm height scale)
 */
function drawCanSatMiniature(
  ctx: CanvasRenderingContext2D,
  telemetry: TelemetryPoint,
  tick: number,
  showElectronics: boolean
) {
  const canW = 52;
  const canH = 92;

  // Helical Flexible Wire Antenna on Top Deck
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(14, -canH / 2);
  // Flexible spring coil with aerodynamic bend
  for (let y = -canH / 2; y > -canH / 2 - 32; y -= 4) {
    const bend = Math.sin((y + tick * 6) * 0.7) * 3.5;
    ctx.lineTo(14 + bend, y);
  }
  ctx.stroke();

  // Radio RF Transmission Pulse Ripples
  if (telemetry.stage !== 'COMPLETED' && !telemetry.packetLost) {
    const pulseR = 12 + ((tick * 20) % 25);
    const pulseAlpha = Math.max(0, 0.6 * (1 - pulseR / 37));
    ctx.strokeStyle = `rgba(14, 165, 233, ${pulseAlpha})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(14, -canH / 2 - 32, pulseR, -Math.PI * 0.8, -Math.PI * 0.2);
    ctx.stroke();
  }

  // Top Rigging Eyelet (where parachute suspension harness attaches)
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -canH / 2 - 3, 4, 0, Math.PI * 2);
  ctx.stroke();

  // Top Cap Ellipse (Machined Anodized Aluminum)
  const topCapGrad = ctx.createLinearGradient(-canW / 2, -canH / 2, canW / 2, -canH / 2);
  topCapGrad.addColorStop(0, '#94a3b8');
  topCapGrad.addColorStop(0.4, '#f8fafc');
  topCapGrad.addColorStop(0.8, '#cbd5e1');
  topCapGrad.addColorStop(1, '#64748b');

  ctx.fillStyle = topCapGrad;
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, -canH / 2, canW / 2, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Main Cylindrical Can Body (Photorealistic Curved Specular Highlight)
  if (showElectronics) {
    // Transparent X-Ray Inspection View (Green PCB boards, chip packages, LiPo battery)
    ctx.fillStyle = 'rgba(241, 245, 249, 0.4)';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-canW / 2, -canH / 2, canW, canH);
    ctx.fillRect(-canW / 2, -canH / 2, canW, canH);

    // PCB Board Stack (Sensors, MCU, Radio)
    [-24, -2, 22].forEach((py, idx) => {
      ctx.fillStyle = '#15803d'; // PCB green
      ctx.fillRect(-canW / 2 + 5, py, canW - 10, 4);

      // Microcontroller chip
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-8, py - 5, 16, 5);

      // Gold soldered vias/pins
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(-18, py + 1, 4, 2);
      ctx.fillRect(14, py + 1, 4, 2);
    });

    // 1S LiPo Battery Pack in base
    ctx.fillStyle = '#d97706';
    ctx.fillRect(-14, 28, 28, 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('3.7V LiPo', 0, 38);
  } else {
    // Realistic Brushed Aluminum Can Body
    const bodyGrad = ctx.createLinearGradient(-canW / 2, 0, canW / 2, 0);
    bodyGrad.addColorStop(0, '#475569'); // Shadow edge
    bodyGrad.addColorStop(0.2, '#94a3b8');
    bodyGrad.addColorStop(0.45, '#ffffff'); // Strong daylight specular sheen
    bodyGrad.addColorStop(0.7, '#cbd5e1');
    bodyGrad.addColorStop(0.9, '#64748b');
    bodyGrad.addColorStop(1, '#334155');

    ctx.fillStyle = bodyGrad;
    ctx.fillRect(-canW / 2, -canH / 2, canW, canH);

    // Can Structural Aluminum Beaded Ribs
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.4)';
    ctx.lineWidth = 1.2;
    [-22, 0, 22].forEach((ry) => {
      ctx.beginPath();
      ctx.moveTo(-canW / 2, ry);
      ctx.lineTo(canW / 2, ry);
      ctx.stroke();
    });

    // Solar Cell Panel Stripe Wrap
    ctx.fillStyle = '#1e1b4b'; // Deep space blue monocrystalline
    ctx.strokeStyle = '#312e81';
    ctx.lineWidth = 1;
    ctx.fillRect(-canW / 2 + 6, -18, canW - 12, 36);
    ctx.strokeRect(-canW / 2 + 6, -18, canW - 12, 36);

    // Solar cell gold grid traces
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 0.6;
    [-8, 0, 8].forEach((gx) => {
      ctx.beginPath();
      ctx.moveTo(gx, -18);
      ctx.lineTo(gx, 18);
      ctx.stroke();
    });

    // Clean Aerospace Typography Label
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CANSAT-01', 0, 2);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '6px monospace';
    ctx.fillText('ESA / AERO-TWIN', 0, 10);

    // Barometer Static Port Hole
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(-15, 28, 2, 0, Math.PI * 2);
    ctx.fill();

    // High-Intensity Status Strobe LED
    const isFlashing = Math.sin(tick * 12) > 0.2;
    const ledColor =
      telemetry.stage === 'LANDING' || telemetry.stage === 'COMPLETED'
        ? isFlashing ? '#ef4444' : '#7f1d1d' // Red recovery beacon
        : telemetry.stage === 'DESCENT'
        ? '#10b981' // Green nominal descent
        : '#0ea5e9'; // Blue active telemetry

    ctx.fillStyle = ledColor;
    ctx.beginPath();
    ctx.arc(15, 28, 2.8, 0, Math.PI * 2);
    ctx.fill();

    if (isFlashing) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.beginPath();
      ctx.arc(15, 28, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Bottom Base Rim Ellipse
  ctx.fillStyle = '#64748b';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(0, canH / 2, canW / 2, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/**
 * Draws Photorealistic Parachute Canopy with Suspension Shroud Lines and Wind Flutter
 */
function drawParachuteRealistic(
  ctx: CanvasRenderingContext2D,
  deployRatio: number,
  deflateRatio: number,
  tick: number,
  windSpeed: number
) {
  // If deflated on ground after landing
  if (deflateRatio > 0.1) {
    const defAlpha = Math.max(0, 1 - deflateRatio * 0.4);
    ctx.save();
    ctx.translate(25 * deflateRatio, 45); // folds over to the right of CanSat
    ctx.rotate(0.3 * deflateRatio);

    ctx.fillStyle = `rgba(249, 115, 22, ${defAlpha})`;
    ctx.beginPath();
    ctx.ellipse(30, 0, 45 * (1 - deflateRatio * 0.3), 12, 0, 0, Math.PI * 2);
    ctx.fill();

    // White gore section
    ctx.fillStyle = `rgba(255, 255, 255, ${defAlpha})`;
    ctx.beginPath();
    ctx.ellipse(30, 0, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    return;
  }

  const chuteDist = -120 * deployRatio;
  const canopyW = 140 * deployRatio;
  const canopyH = 60 * deployRatio;
  const flutter = Math.sin(tick * 8) * (2 + windSpeed * 0.4);

  // 1. Shroud Suspension Lines (Strong nylon cords from top eyelet to canopy hem)
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.7)';
  ctx.lineWidth = 1.2;

  const shroudPoints = [
    -canopyW / 2 + 6,
    -canopyW / 3,
    -canopyW / 8,
    canopyW / 8,
    canopyW / 3,
    canopyW / 2 - 6,
  ];

  shroudPoints.forEach((px) => {
    ctx.beginPath();
    ctx.moveTo(0, -48); // Top rigging loop on CanSat
    ctx.lineTo(px, chuteDist + canopyH - 8 + flutter * 0.5);
    ctx.stroke();
  });

  // 2. Parachute Canopy Dome
  ctx.save();
  ctx.translate(0, chuteDist);

  // Outer Dome Shape (Hemispherical Aerospace Canopy)
  ctx.beginPath();
  ctx.moveTo(-canopyW / 2, canopyH - 8 + flutter);
  // Top curve
  ctx.bezierCurveTo(
    -canopyW / 2,
    -canopyH,
    canopyW / 2,
    -canopyH,
    canopyW / 2,
    canopyH - 8 - flutter
  );
  // Bottom hem scallops
  ctx.bezierCurveTo(
    canopyW / 4,
    canopyH - 14,
    -canopyW / 4,
    canopyH - 14,
    -canopyW / 2,
    canopyH - 8 + flutter
  );
  ctx.closePath();

  // Vibrant Aerospace Orange & White Gore Pattern
  const chuteGrad = ctx.createLinearGradient(-canopyW / 2, 0, canopyW / 2, 0);
  chuteGrad.addColorStop(0, '#ea580c'); // Aerospace orange
  chuteGrad.addColorStop(0.25, '#ffffff'); // White panel
  chuteGrad.addColorStop(0.5, '#f97316'); // Center orange
  chuteGrad.addColorStop(0.75, '#ffffff'); // White panel
  chuteGrad.addColorStop(1, '#ea580c'); // Outer orange

  ctx.fillStyle = chuteGrad;
  ctx.fill();

  ctx.strokeStyle = '#c2410c';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Radial Structural Gore Seams
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 1;
  [-canopyW / 3, -canopyW / 6, 0, canopyW / 6, canopyW / 3].forEach((gx) => {
    ctx.beginPath();
    ctx.moveTo(gx * 0.3, -canopyH + 4);
    ctx.lineTo(gx, canopyH - 10);
    ctx.stroke();
  });

  // Top Apex Vent (Spill Hole to stabilize descent oscillations)
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.ellipse(0, -canopyH + 5, 8, 3, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Draws Rocket Booster and Payload Fairing during rocket ascent phase
 */
function drawRocketBoosterFairing(ctx: CanvasRenderingContext2D, tick: number) {
  // Translucent aerodynamic payload shroud
  ctx.strokeStyle = 'rgba(14, 165, 233, 0.6)';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(-38, -65);
  ctx.lineTo(0, -125); // Ogive nosecone tip
  ctx.lineTo(38, -65);
  ctx.lineTo(38, 85);
  ctx.lineTo(-38, 85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // High-Energy Rocket Motor Propellant Flame
  const flameLen = 50 + Math.sin(tick * 24) * 12;
  const flameGrad = ctx.createLinearGradient(0, 85, 0, 85 + flameLen);
  flameGrad.addColorStop(0, '#ffffff');
  flameGrad.addColorStop(0.2, '#fef08a'); // yellow core
  flameGrad.addColorStop(0.5, '#f97316'); // orange
  flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');

  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(-16, 85);
  ctx.lineTo(0, 85 + flameLen);
  ctx.lineTo(16, 85);
  ctx.closePath();
  ctx.fill();
}

/**
 * Subtle atmospheric daylight vignette and light beam scattering
 */
function drawAtmosphericLighting(ctx: CanvasRenderingContext2D, w: number, h: number, tick: number) {
  // Soft daylight vignette
  const vigGrad = ctx.createRadialGradient(w / 2, h / 2, w * 0.35, w / 2, h / 2, w * 0.7);
  vigGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  vigGrad.addColorStop(1, 'rgba(186, 230, 253, 0.15)');

  ctx.fillStyle = vigGrad;
  ctx.fillRect(0, 0, w, h);
}
