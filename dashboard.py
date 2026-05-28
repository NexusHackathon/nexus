import streamlit as st
import requests
import time
from datetime import datetime
import pandas as pd

# ==========================================================
ESP32_IP = "192.168.0.146"
URL = f"http://{ESP32_IP}/data"
# ==========================================================

st.set_page_config(page_title="Tactical Command Monitor v7.1", layout="wide", initial_sidebar_state="collapsed")

if 'history' not in st.session_state:
    st.session_state.history = pd.DataFrame(columns=['Time', 'Gas (%)', 'Magnet Raw', 'SDR Energy (%)'])

if 'last_valid_data' not in st.session_state:
    # שיניתי את ברירת המחדל של ה-RSSI ל-0.0
    st.session_state.last_valid_data = {"gas": 0.0, "mag": 2500, "rssi": 0.0, "c_z": 0, "c_n": 0, "c_f": 0}

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Share+Tech+Mono&display=swap');
html, body, [class*="css"], .stApp { background-color: #0d0f12; color: #d1d7dc; font-family: 'JetBrains Mono', monospace; overflow: hidden; }
.block-container { padding-top: 0.8rem !important; padding-bottom: 0rem !important; max-width: 96%; }
#MainMenu, footer, header { visibility:hidden; }
.header-container { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #23282f; padding-bottom: 5px; margin-bottom: 15px; }
.radar-header { font-family: 'Share Tech Mono', monospace; font-size: 1.8rem; font-weight: 700; color: #bc9c6c; letter-spacing: 1px; }
.radar-subheader { font-family: 'JetBrains Mono', monospace; font-size: 0.75rem; color: #5c646c; }
.status-card { border-radius: 4px; padding: 22px 20px; text-align: center; border: 1px solid #2d333b; height: 180px; display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; }
.sensor-safe { background-color: #16241a; border: 2px solid #2e7d32; color: #4caf50; }
.sensor-suspicious { background-color: #2b2313; border: 2px solid #f57c00; color: #ffb74d; }
.sensor-alert { background-color: #2c1618; border: 2px solid #c62828; color: #ef5350; }
.cam-safe { background-color: #141f29; border: 2px solid #1f6feb; color: #58a6ff; }
.cam-warn { background-color: #2b2313; border: 2px solid #f57c00; color: #ffb74d; }
.cam-crit { background-color: #2c1618; border: 2px solid #c62828; color: #ef5350; }
.status-title { font-family: 'Share Tech Mono', monospace; font-size: 2.4rem; font-weight: 700; margin: 0; letter-spacing: 2px; }
.status-sub { font-size: 1.0rem; margin-top: 6px; color: #abb2bf; }
.telemetry-strip { display: flex; justify-content: space-around; background: #111418; border: 1px solid #23282f; padding: 15px 10px; border-radius: 4px; margin-bottom: 15px; font-family: 'Share Tech Mono', monospace; }
.telemetry-item { text-align: center; width: 30%; }
.telemetry-label { font-size: 0.85rem; color: #5c646c; margin-bottom: 2px; }
.telemetry-value { font-size: 1.8rem; font-weight: bold; color: #ffffff; }
.cam-distances { display: flex; justify-content: space-between; margin-top: 12px; background: rgba(0, 0, 0, 0.4); padding: 8px 12px; border-radius: 4px; font-size: 0.85rem; font-family: 'Share Tech Mono', monospace; }
.dist-box { text-align: center; width: 30%; }
.dist-val { font-size: 1.2rem; font-weight: bold; color: #ffffff; }
.graph-title { font-family: 'Share Tech Mono', monospace; font-size: 0.9rem; color: #8b949e; margin-bottom: 5px; }
.link-status { font-size: 0.75rem; padding: 2px 6px; border-radius: 3px; font-family: 'JetBrains Mono', monospace; }
.link-online { color: #4caf50; background: rgba(76, 175, 80, 0.1); }
.link-offline { color: #ef5350; background: rgba(239, 83, 80, 0.1); }
</style>
""", unsafe_allow_html=True)

header_place = st.empty()
cards_place = st.empty()
telemetry_place = st.empty()
graph_title_place = st.empty()
graph_place = st.empty()

while True:
    now_time = datetime.now().strftime("%H:%M:%S")
    online = False

    try:
        response = requests.get(URL, timeout=1.0)
        if response.status_code == 200:
            raw_json = response.json()
            st.session_state.last_valid_data = raw_json
            online = True
        else:
            raw_json = st.session_state.last_valid_data
    except requests.exceptions.RequestException:
        raw_json = st.session_state.last_valid_data
        online = False

    # חילוץ נתונים גולמיים
    g_raw = float(raw_json.get('gas', 0.0))
    mag_raw = int(raw_json.get('mag', 2500))
    sdr_power = float(raw_json.get('rssi', 0.0))  # התיקון: זה אנרגיה, לא RSSI שלילי

    c_zero = int(raw_json.get('c_z', 0))
    c_near = int(raw_json.get('c_n', 0))
    c_far = int(raw_json.get('c_f', 0))
    c_total = c_zero + c_near + c_far

    # ==========================================================
    # Decision Engine (Updated)
    # ==========================================================

    # Check for abnormalities (Booleans)
    gas_abnormal = g_raw > 1200
    gas_extreme = g_raw >= 3500
    mag_abnormal = mag_raw < 1500 or mag_raw > 3000

    # Critical update: Check if SDR energy exceeds 0.3
    sdr_abnormal = sdr_power >= 0.40

    abnormal_count = sum([gas_abnormal, mag_abnormal, sdr_abnormal])

    threat_score = 0

    # Warning rules:
    if sdr_abnormal and (gas_abnormal or mag_abnormal):
        threat_level = "CRITICAL"
        threat_score = 95
    elif abnormal_count >= 2:
        threat_level = "SUSPICIOUS"
        threat_score = 65
    elif sdr_abnormal:
        threat_level = "SUSPICIOUS"
        threat_score = 55
    elif sdr_power >= 0.3:  # New condition for intermediate suspicious state
        threat_level = "SUSPICIOUS"
        threat_score = 35
    elif gas_extreme:
        threat_level = "SUSPICIOUS"
        threat_score = 45
    else:
        threat_level = "SAFE"
        threat_score = 15

    # ==========================================================

    new_row = pd.DataFrame([{
        'Time': now_time,
        'Gas (%)': min(100, (g_raw / 4095.0) * 100),
        'Magnet Raw': mag_raw,
        'SDR Energy (%)': min(100, sdr_power * 100)  # ממיר 0.45 ל-45% לתצוגה נוחה בגרף
    }])
    st.session_state.history = pd.concat([st.session_state.history, new_row]).tail(30)

    if online:
        link_html = '<span class="link-status link-online">● WIFI LINK ACTIVE</span>'
    else:
        link_html = '<span class="link-status link-offline">○ NETWORK OFFLINE</span>'

    header_place.markdown(f"""
    <div class="header-container">
        <div class="radar-subheader">MULTILAYER PERIMETER DEFENSE // {now_time} // {link_html}</div>
        <div class="radar-header">INTEGRATED TACTICAL SYSTEM</div>
    </div>
    """, unsafe_allow_html=True)

    with cards_place.container():
        top_col1, top_col2 = st.columns([2, 1])

        if threat_level == "CRITICAL":
            card_class = "sensor-alert"
            title_text = "ENV CRITICAL: ALERT"
            sub_text = f"CRITICAL BREACH DETECTED // MULTIPLE SENSORS ACTIVATED // SCORE: {threat_score}"
        elif threat_level == "SUSPICIOUS":
            card_class = "sensor-suspicious"
            title_text = "ENV STATUS: SUSPICIOUS"
            sub_text = f"ELEVATED METRICS DETECTED // SCORE: {threat_score}"
        else:
            card_class = "sensor-safe"
            title_text = "ENV STATUS: SECURE"
            sub_text = f"BASELINE METRICS NORMAL // SCORE: {threat_score}"

        top_col1.markdown(f"""
        <div class="status-card {card_class}">
            <div class="status-title">{title_text}</div>
            <div class="status-sub">{sub_text}</div>
        </div>
        """, unsafe_allow_html=True)

        if c_zero > 0 or (c_total > 0 and c_near == 0 and c_far == 0):
            cam_class, cam_title = "cam-crit", "RF ALERT: CRIT"
        elif c_near > 0 or c_total > 0:
            cam_class, cam_title = "cam-warn", "RF SCAN: WARN"
        else:
            cam_class, cam_title = "cam-safe", "RF SCAN: CLEAR"

        top_col2.markdown(f"""
        <div class="status-card {cam_class}">
            <div class="status-title" style="font-size: 1.9rem;">{cam_title}</div>
            <div class="status-sub" style="font-size: 0.85rem; margin-top:2px;">TOTAL SURVEILLANCE SIGNALS: {c_total}</div>
            <div class="cam-distances">
                <div class="dist-box"><div style="color: #ef5350; font-weight: bold;">ZERO</div><div class="dist-val">{c_zero}</div></div>
                <div class="dist-box"><div style="color: #ffb74d; font-weight: bold;">NEAR</div><div class="dist-val">{c_near}</div></div>
                <div class="dist-box"><div style="color: #a0aab4; font-weight: bold;">FAR</div><div class="dist-val">{c_far}</div></div>
            </div>
        </div>
        """, unsafe_allow_html=True)

    telemetry_place.markdown(f"""
    <div class="telemetry-strip">
        <div class="telemetry-item"><div class="telemetry-label">☣️ HYDROCARBON GAS</div><div class="telemetry-value">{g_raw:.0f}</div></div>
        <div class="telemetry-item"><div class="telemetry-label">🧲 MAGNET RAW</div><div class="telemetry-value">{mag_raw}</div></div>
        <div class="telemetry-item"><div class="telemetry-label">📡 SDR ENERGY</div><div class="telemetry-value">{sdr_power:.3f}</div></div>
    </div>
    """, unsafe_allow_html=True)

    graph_title_place.markdown('<div class="graph-title">📊 HARDWARE TELEMETRY STREAM</div>', unsafe_allow_html=True)

    chart_data = st.session_state.history.set_index('Time')
    graph_place.line_chart(chart_data, height=210, use_container_width=True)

    time.sleep(0.5)