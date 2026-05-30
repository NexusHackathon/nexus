import numpy as np
from rtlsdr import RtlSdr
import serial
import time
import sys
import cv2
import threading
from ultralytics import YOLOWorld

# הגדרות כלליות
SERIAL_PORT = '/dev/ttyUSB0' # לשנות אם הלינוקס מחליט לשנות שם
BAUD_RATE = 115200
CENTER_FREQ = 433.92e6
SDR_THRESHOLD = 0.15 

# מתחברים ל-ESP32
print(f"Connecting to ESP32 on {SERIAL_PORT}...")
try:
    esp32 = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    time.sleep(2)
    print("✅ USB Link Established!")
except Exception as e:
    print(f"❌ Failed to connect to ESP32: {e}")
    sys.exit()

# מנעול כדי שהמצלמה והאנטנה לא ישלחו נתונים ל-USB באותו זמן בדיוק
serial_lock = threading.Lock()

def send_to_esp32(msg):
    """ שולח ל-ESP רק כשהערוץ פנוי """
    with serial_lock:
        esp32.write(msg.encode('utf-8'))


# ----- תהליכון 1: מצלמה וזיהוי (YOLO) -----
def run_yolo():
    print("Loading YOLO Model...")
    model = YOLOWorld('yolov8s-world.pt')
    model.set_classes(["wired webcam", "usb camera", "security camera", "cctv"])
    
    cap = cv2.VideoCapture(0)
    
    # מורידים רזולוציה כדי שהפיי לא ייחנק
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
    
    if not cap.isOpened():
        print("❌ ERROR: Cannot open camera! Please check the USB connection.")
        return

    print("✅ Camera started! Look at the AI Vision window.")
    yolo_currently_detecting = False
    frame_counter = 0 
    
    while True:
        success, frame = cap.read()
        if not success:
            print("⚠️ Cannot read frame from camera. Waiting...")
            time.sleep(1)
            continue

        frame_counter += 1
        
        # סורקים עם המודל רק כל פריים חמישי כדי לחסוך עיבוד
        if frame_counter % 5 == 0:
            results = model.predict(frame, conf=0.1, verbose=False)
            
            if len(results[0].boxes) > 0:
                if not yolo_currently_detecting:
                    send_to_esp32('{"yolo":1}\n')
                    print("👁️ CAMERA DETECTED! Sent YOLO=1")
                    yolo_currently_detecting = True
            else:
                if yolo_currently_detecting:
                    send_to_esp32('{"yolo":0}\n')
                    print("✅ Camera Clear. Sent YOLO=0")
                    yolo_currently_detecting = False
                    
            # מציגים את החלון עם הזיהויים
            annotated_frame = results[0].plot()
            cv2.imshow("AI Vision", annotated_frame)
            
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break


# ----- תהליכון 2: אנטנה (SDR) -----
def run_sdr():
    sdr = RtlSdr()
    sdr.sample_rate = 2.048e6
    sdr.center_freq = CENTER_FREQ
    sdr.gain = 40.0 
    
    # זריקת באפר ראשוני
    _ = sdr.read_samples(1024 * 1024)
    sdr_currently_detecting = False 
    
    while True:
        try:
            samples = sdr.read_samples(65536)
            
            # מנקים את רעשי הרקע של ה-SDR (DC offset)
            clean_samples = samples - np.mean(samples)
            power = np.mean(np.abs(clean_samples)**2)
            
            if power > SDR_THRESHOLD:
                if not sdr_currently_detecting:
                    send_to_esp32(f'{{"freq":{int(CENTER_FREQ)},"rssi":{power:.3f},"detected":1}}\n')
                    print(f"💥 SDR SIGNAL! Energy: {power:.3f}")
                    sdr_currently_detecting = True
            else:
                if sdr_currently_detecting:
                    send_to_esp32(f'{{"freq":{int(CENTER_FREQ)},"rssi":{power:.3f},"detected":0}}\n')
                    sdr_currently_detecting = False
                    
        except Exception as e:
            # אם האנטנה קורסת פתאום, מאתחלים אותה מחדש
            print(f"⚠️ SDR Overload: {e} - Restarting SDR...")
            sdr.close()
            time.sleep(1)
            sdr = RtlSdr()
            sdr.sample_rate = 2.048e6
            sdr.center_freq = CENTER_FREQ
            sdr.gain = 40.0 


# ----- Main -----
if __name__ == "__main__":
    print("\n🚀 STARTING SYSTEM...")
    
    # מריצים את היולו וה-SDR במקביל
    t_yolo = threading.Thread(target=run_yolo)
    t_sdr = threading.Thread(target=run_sdr)
    
    t_yolo.daemon = True
    t_sdr.daemon = True
    
    t_yolo.start()
    t_sdr.start()
    
    # הלולאה הזו פשוט משאירה את התוכנית רצה ברקע
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
        esp32.close()
        sys.exit()
