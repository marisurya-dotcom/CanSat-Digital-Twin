"""
CanSat Mission Simulation & Digital Twin
Python & Streamlit Ground Station Engine
"""

import time
import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

# Page Configuration
st.set_page_config(
    page_title="CanSat Mission Simulation & Digital Twin",
    page_icon="🚀",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Aerospace Styling
st.markdown("""
<style>
    .metric-card {
        background-color: #0f172a;
        border: 1px solid #1e293b;
        border-radius: 8px;
        padding: 12px;
        margin-bottom: 10px;
    }
    .metric-label { font-size: 11px; text-transform: uppercase; color: #94a3b8; font-family: monospace; }
    .metric-value { font-size: 24px; font-weight: bold; color: #f8fafc; font-family: monospace; }
</style>
""", unsafe_allow_html=True)

# Session State Initialization
if "sim_running" not in st.session_state:
    st.session_state.sim_running = False
if "sim_time" not in st.session_state:
    st.session_state.sim_time = 0.0
if "telemetry_data" not in st.session_state:
    st.session_state.telemetry_data = []

# Sidebar Controls
st.sidebar.title("🛠️ Mission Configuration")
target_altitude = st.sidebar.slider("Target Apogee (m)", min_value=200, max_value=1200, value=500, step=50)
parachute_diameter = st.sidebar.slider("Parachute Diameter (m)", min_value=0.30, max_value=0.70, value=0.42, step=0.02)
sim_speed = st.sidebar.selectbox("Simulation Speed", options=[1, 2, 5, 10], index=1)
packet_loss_rate = st.sidebar.slider("Packet Loss Rate (%)", min_value=0.0, max_value=20.0, value=3.0, step=0.5)
wind_speed = st.sidebar.slider("Wind Speed (m/s)", min_value=0.0, max_value=10.0, value=2.5, step=0.5)

col_ctrl1, col_ctrl2 = st.sidebar.columns(2)
with col_ctrl1:
    if st.button("🚀 Launch Mission", use_container_width=True):
        st.session_state.sim_running = True
        st.session_state.sim_time = 0.0
        st.session_state.telemetry_data = []
with col_ctrl2:
    if st.button("🔄 Reset", use_container_width=True):
        st.session_state.sim_running = False
        st.session_state.sim_time = 0.0
        st.session_state.telemetry_data = []

# Physics Calculations
GRAVITY = 9.80665

def get_isa_atmosphere(altitude):
    clamped = max(0.0, altitude)
    temp_c = 15.0 - 0.0065 * clamped
    pressure_hpa = 1013.25 * ((temp_c + 273.15) / 288.15) ** 5.25588
    return temp_c, pressure_hpa

def simulate_step(t, target_alt, chute_d):
    burn_time = 3.5
    apogee_time = 10.0
    
    if t < burn_time:
        stage = "ASCENT"
        a = 28.0
        v = a * t
        alt = 0.5 * a * (t ** 2)
    elif t < apogee_time:
        stage = "ASCENT"
        t_coast = t - burn_time
        a = -GRAVITY
        v = max(0.0, 95.0 - GRAVITY * t_coast)
        alt = min(target_alt, 170.0 + 95.0 * t_coast - 0.5 * GRAVITY * (t_coast ** 2))
    else:
        # Parachute descent
        t_descent = t - apogee_time
        terminal_v = np.sqrt((2 * 0.35 * GRAVITY) / (1.2 * 1.35 * np.pi * ((chute_d / 2) ** 2)))
        stage = "DESCENT"
        v = -terminal_v
        alt = max(0.0, target_alt - terminal_v * t_descent)
        if alt <= 0.0:
            stage = "COMPLETED"
            v = 0.0

    temp, press = get_isa_atmosphere(alt)
    return stage, alt, v, temp, press

# Header Display
st.title("🛰️ CanSat Mission Simulation & Digital Twin")
st.caption("Empirical Flight Dynamics · Sensor Synthesis · Ground Station Telemetry Stream")

# Simulation Execution Loop
if st.session_state.sim_running:
    dt = 0.5 * sim_speed
    st.session_state.sim_time += dt
    stage, alt, v, temp, press = simulate_step(st.session_state.sim_time, target_altitude, parachute_diameter)
    
    st.session_state.telemetry_data.append({
        "time": st.session_state.sim_time,
        "stage": stage,
        "altitude": alt,
        "velocity": v,
        "temperature": temp,
        "pressure": press
    })
    
    if stage == "COMPLETED":
        st.session_state.sim_running = False

# Telemetry KPI Dashboard
df = pd.DataFrame(st.session_state.telemetry_data) if st.session_state.telemetry_data else pd.DataFrame([{
    "time": 0.0, "stage": "PRE_LAUNCH", "altitude": 0.0, "velocity": 0.0, "temperature": 15.0, "pressure": 1013.25
}])

curr = df.iloc[-1]
kpi1, kpi2, kpi3, kpi4 = st.columns(4)
kpi1.metric("Mission Elapsed Time", f"T+{curr['time']:.1f}s", curr["stage"])
kpi2.metric("Simulated Altitude", f"{curr['altitude']:.1f} m", f"Target: {target_altitude}m")
kpi3.metric("Vertical Velocity", f"{curr['velocity']:.2f} m/s", "Descent Rate")
kpi4.metric("Atmospheric Pressure", f"{curr['pressure']:.1f} hPa", f"{curr['temperature']:.1f} °C")

# Charts: Altitude & Velocity
col_chart1, col_chart2 = st.columns(2)
with col_chart1:
    fig_alt = go.Figure()
    fig_alt.add_trace(go.Scatter(x=df["time"], y=df["altitude"], mode="lines", name="Altitude (m)", line=dict(color="#06b6d4", width=3)))
    fig_alt.add_hline(y=target_altitude, line_dash="dash", line_color="#f59e0b", annotation_text="Target Apogee")
    fig_alt.update_layout(title="Altitude vs Time", template="plotly_dark", height=320)
    st.plotly_chart(fig_alt, use_container_width=True)

with col_chart2:
    fig_vel = go.Figure()
    fig_vel.add_trace(go.Scatter(x=df["time"], y=df["velocity"], mode="lines", name="Velocity (m/s)", line=dict(color="#38bdf8", width=3)))
    fig_vel.add_hline(y=0, line_color="#64748b")
    fig_vel.add_hrect(y0=-11, y1=-6, fillcolor="#10b981", opacity=0.15, annotation_text="ESA Safe Window")
    fig_vel.update_layout(title="Velocity vs Time", template="plotly_dark", height=320)
    st.plotly_chart(fig_vel, use_container_width=True)

# Telemetry CSV Download
if len(df) > 1:
    csv = df.to_csv(index=False).encode('utf-8')
    st.download_button(
        "📥 Download Telemetry CSV",
        data=csv,
        file_name="cansat_telemetry_simulation.csv",
        mime="text/csv",
        use_container_width=True
    )
