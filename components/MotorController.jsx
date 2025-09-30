"use client";
import { useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import {
  ChevronUp,
  ChevronDown,
  Square,
  Zap,
  Activity,
  Wifi,
  WifiOff,
  Radio,
  Gauge as GaugeIcon,
  Mic,
  MicOff,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const firebaseConfig = {
  apiKey: "AIzaSyDeong4jcpxnn25goNVm6fIDBVxZk3Ji2g",
  authDomain: "ntroller-3982d.firebaseapp.com",
  databaseURL:
    "https://ntroller-3982d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ntroller-3982d",
  storageBucket: "ntroller-3982d.firebasestorage.app",
  messagingSenderId: "713573937107",
  appId: "1:713573937107:web:a753a3f28284d8de550926",
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const CircularGauge = ({ value, max, label, color }) => {
  const percentage = (Math.abs(value) / max) * 100;
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke="#e5e7eb"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke={color}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold text-gray-800">
          {Math.abs(value)}
        </div>
        <div className="text-xs text-gray-500 uppercase">{label}</div>
      </div>
    </div>
  );
};

const SpeedMeter = ({ speed }) => {
  const angle = (speed / 255) * 180 - 90;

  return (
    <div className="relative w-full h-40 flex items-end justify-center">
      <svg viewBox="0 0 200 100" className="w-full h-full">
        <defs>
          <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          stroke="url(#meterGradient)"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M 20 90 A 80 80 0 0 1 180 90"
          stroke="#e5e7eb"
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          opacity="0.3"
        />
        {[0, 64, 128, 192, 255].map((val, i) => {
          const tickAngle = (val / 255) * 180 - 90;
          const startX = 100 + 70 * Math.cos((tickAngle * Math.PI) / 180);
          const startY = 90 + 70 * Math.sin((tickAngle * Math.PI) / 180);
          const endX = 100 + 80 * Math.cos((tickAngle * Math.PI) / 180);
          const endY = 90 + 80 * Math.sin((tickAngle * Math.PI) / 180);

          return (
            <line
              key={i}
              x1={startX}
              y1={startY}
              x2={endX}
              y2={endY}
              stroke="#6b7280"
              strokeWidth="2"
            />
          );
        })}
        <g transform={`rotate(${angle} 100 90)`}>
          <line
            x1="100"
            y1="90"
            x2="100"
            y2="20"
            stroke="#1f2937"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="100" cy="90" r="6" fill="#1f2937" />
        </g>
      </svg>
      <div className="absolute bottom-0 text-center">
        <div className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          {speed}
        </div>
        <div className="text-xs text-gray-500 uppercase font-semibold">
          PWM Value
        </div>
      </div>
    </div>
  );
};

export default function MotorController() {
  const [motorA, setMotorA] = useState(0);
  const [motorB, setMotorB] = useState(0);
  const [speed, setSpeed] = useState(200);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(0);
  const [speedHistory, setSpeedHistory] = useState([]);
  const [motorAHistory, setMotorAHistory] = useState([]);
  const [motorBHistory, setMotorBHistory] = useState([]);
  const [activePreset, setActivePreset] = useState(null);
  const [batteryLevel] = useState(87);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    const statusRef = ref(database, "status/timestamp");
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const timestamp = snapshot.val();
      if (timestamp) {
        setLastUpdate(timestamp);
        setIsConnected(Date.now() - timestamp < 5000);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)
    ) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onresult = (event) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
            .toLowerCase()
            .trim();
          if (event.results[i].isFinal) {
            finalTranscript = transcript;
            processVoiceCommand(transcript);
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        if (isListening) {
          recognitionInstance.start();
        }
      };

      setRecognition(recognitionInstance);
    }
  }, []);

  const processVoiceCommand = (command) => {
    if (
      command.includes("forward") ||
      command.includes("go") ||
      command.includes("move forward")
    ) {
      moveForward();
    } else if (
      command.includes("backward") ||
      command.includes("back") ||
      command.includes("reverse")
    ) {
      moveBackward();
    } else if (command.includes("left") || command.includes("turn left")) {
      turnLeft();
    } else if (command.includes("right") || command.includes("turn right")) {
      turnRight();
    } else if (
      command.includes("stop") ||
      command.includes("halt") ||
      command.includes("brake")
    ) {
      stopMotors();
    } else if (command.includes("slow") || command.includes("slow speed")) {
      applyPreset("slow");
    } else if (command.includes("medium") || command.includes("medium speed")) {
      applyPreset("medium");
    } else if (
      command.includes("fast") ||
      command.includes("full speed") ||
      command.includes("max speed")
    ) {
      applyPreset("fast");
    } else if (command.includes("cruise")) {
      applyPreset("cruise");
    } else if (
      command.includes("increase speed") ||
      command.includes("speed up") ||
      command.includes("faster")
    ) {
      setSpeed((prev) => Math.min(255, prev + 50));
    } else if (
      command.includes("decrease speed") ||
      command.includes("slow down") ||
      command.includes("slower")
    ) {
      setSpeed((prev) => Math.max(0, prev - 50));
    } else if (
      command.includes("emergency") ||
      command.includes("emergency stop")
    ) {
      emergencyStop();
    }
  };

  const toggleVoiceControl = () => {
    if (!recognition) {
      alert(
        "Voice recognition is not supported in your browser. Please use Chrome, Edge, or Safari."
      );
      return;
    }
    if (isListening) {
      recognition.stop();
      setIsListening(false);
      setTranscript("");
    } else {
      recognition.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const time = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
      setSpeedHistory((prev) => {
        const newData = [
          ...prev,
          { time, speed, motorA: Math.abs(motorA), motorB: Math.abs(motorB) },
        ];
        return newData.slice(-20);
      });
      setMotorAHistory((prev) => {
        const newData = [...prev, { time, value: motorA }];
        return newData.slice(-20);
      });
      setMotorBHistory((prev) => {
        const newData = [...prev, { time, value: motorB }];
        return newData.slice(-20);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [speed, motorA, motorB]);

  const updateMotor = (motor, value) => {
    const clampedValue = Math.max(-255, Math.min(255, value));
    if (motor === "A") {
      setMotorA(clampedValue);
      set(ref(database, "motors/motorA"), clampedValue);
    } else {
      setMotorB(clampedValue);
      set(ref(database, "motors/motorB"), clampedValue);
    }
  };

  const moveForward = () => {
    updateMotor("A", speed);
    updateMotor("B", speed);
  };

  const moveBackward = () => {
    updateMotor("A", -speed);
    updateMotor("B", -speed);
  };

  const stopMotors = () => {
    updateMotor("A", 0);
    updateMotor("B", 0);
    setActivePreset(null);
  };

  const turnLeft = () => {
    updateMotor("A", -speed);
    updateMotor("B", speed);
  };

  const turnRight = () => {
    updateMotor("A", speed);
    updateMotor("B", -speed);
  };

  const applyPreset = (preset) => {
    setActivePreset(preset);
    switch (preset) {
      case "slow":
        setSpeed(100);
        break;
      case "medium":
        setSpeed(180);
        break;
      case "fast":
        setSpeed(255);
        break;
      case "cruise":
        setSpeed(150);
        moveForward();
        break;
    }
  };

  const emergencyStop = () => {
    setSpeed(0);
    stopMotors();
    setActivePreset(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-200 mb-6">
          <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-6">
            <div className="absolute inset-0 bg-black/5"></div>
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                  <Radio className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">
                    Motor Control Center
                  </h1>
                  <p className="text-emerald-50 text-sm mt-1">
                    ESP32 L298N Advanced Controller
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleVoiceControl}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm transition-all ${
                    isListening
                      ? "bg-red-500/90 text-white animate-pulse"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {isListening ? (
                    <Mic className="w-4 h-4" />
                  ) : (
                    <MicOff className="w-4 h-4" />
                  )}
                  <span className="text-sm font-semibold">
                    {isListening ? "Listening..." : "Voice Control"}
                  </span>
                </button>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                  <GaugeIcon className="w-4 h-4 text-white" />
                  <span className="text-sm font-semibold text-white">
                    {batteryLevel}%
                  </span>
                </div>
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm ${
                    isConnected
                      ? "bg-white/20 text-white"
                      : "bg-red-500/90 text-white"
                  }`}
                >
                  {isConnected ? (
                    <Wifi className="w-4 h-4" />
                  ) : (
                    <WifiOff className="w-4 h-4" />
                  )}
                  <span className="text-sm font-semibold">
                    {isConnected ? "Connected" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-600" />
                Speed Control
              </h2>
              <SpeedMeter speed={speed} />
              <div className="mt-6">
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={speed}
                  onChange={(e) => setSpeed(parseInt(e.target.value))}
                  className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, rgb(16 185 129) 0%, rgb(16 185 129) ${
                      (speed / 255) * 100
                    }%, rgb(229 231 235) ${
                      (speed / 255) * 100
                    }%, rgb(229 231 235) 100%)`,
                  }}
                />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-4">
                <button
                  onClick={() => applyPreset("slow")}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    activePreset === "slow"
                      ? "bg-emerald-500 text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Slow
                </button>
                <button
                  onClick={() => applyPreset("medium")}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    activePreset === "medium"
                      ? "bg-emerald-500 text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Medium
                </button>
                <button
                  onClick={() => applyPreset("fast")}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    activePreset === "fast"
                      ? "bg-emerald-500 text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Fast
                </button>
                <button
                  onClick={() => applyPreset("cruise")}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    activePreset === "cruise"
                      ? "bg-emerald-500 text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  Cruise
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-600" />
                Direction Control
              </h2>
              {isListening && (
                <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Mic className="w-4 h-4 text-red-600 animate-pulse" />
                    <span className="text-sm font-semibold text-red-600">
                      Voice Command Active
                    </span>
                  </div>
                  {transcript && (
                    <p className="text-sm text-gray-700 italic">
                      "{transcript}"
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Try: "forward", "backward", "left", "right", "stop", "fast",
                    "slow"
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 max-w-md mx-auto">
                <div className="col-start-2">
                  <button
                    onMouseDown={moveForward}
                    onMouseUp={stopMotors}
                    onTouchStart={moveForward}
                    onTouchEnd={stopMotors}
                    className="w-full aspect-square bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 rounded-2xl flex items-center justify-center transition-all shadow-lg hover:shadow-emerald-500/30 group"
                  >
                    <ChevronUp className="w-10 h-10 text-white group-active:scale-90 transition-transform" />
                  </button>
                </div>
                <div className="col-start-1 row-start-2">
                  <button
                    onMouseDown={turnLeft}
                    onMouseUp={stopMotors}
                    onTouchStart={turnLeft}
                    onTouchEnd={stopMotors}
                    className="w-full aspect-square bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 active:scale-95 rounded-2xl flex items-center justify-center transition-all shadow-lg hover:shadow-cyan-500/30 group"
                  >
                    <ChevronUp className="w-10 h-10 text-white -rotate-90 group-active:scale-90 transition-transform" />
                  </button>
                </div>
                <div className="col-start-2 row-start-2">
                  <button
                    onClick={emergencyStop}
                    className="w-full aspect-square bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 active:scale-95 rounded-2xl flex items-center justify-center transition-all shadow-lg hover:shadow-red-500/30 group"
                  >
                    <Square className="w-10 h-10 text-white fill-white group-active:scale-90 transition-transform" />
                  </button>
                </div>
                <div className="col-start-3 row-start-2">
                  <button
                    onMouseDown={turnRight}
                    onMouseUp={stopMotors}
                    onTouchStart={turnRight}
                    onTouchEnd={stopMotors}
                    className="w-full aspect-square bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 active:scale-95 rounded-2xl flex items-center justify-center transition-all shadow-lg hover:shadow-cyan-500/30 group"
                  >
                    <ChevronUp className="w-10 h-10 text-white rotate-90 group-active:scale-90 transition-transform" />
                  </button>
                </div>
                <div className="col-start-2 row-start-3">
                  <button
                    onMouseDown={moveBackward}
                    onMouseUp={stopMotors}
                    onTouchStart={moveBackward}
                    onTouchEnd={stopMotors}
                    className="w-full aspect-square bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-95 rounded-2xl flex items-center justify-center transition-all shadow-lg hover:shadow-emerald-500/30 group"
                  >
                    <ChevronDown className="w-10 h-10 text-white group-active:scale-90 transition-transform" />
                  </button>
                </div>
              </div>
              <button
                onClick={emergencyStop}
                className="w-full mt-4 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all shadow-lg"
              >
                EMERGENCY STOP
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-6">
                Motor Status
              </h2>
              <div className="flex justify-around">
                <div className="text-center">
                  <CircularGauge
                    value={motorA}
                    max={255}
                    label="Motor A"
                    color="#10b981"
                  />
                  <div
                    className={`mt-2 text-sm font-medium ${
                      motorA > 0
                        ? "text-emerald-600"
                        : motorA < 0
                        ? "text-amber-600"
                        : "text-gray-400"
                    }`}
                  >
                    {motorA > 0
                      ? "Forward"
                      : motorA < 0
                      ? "Backward"
                      : "Stopped"}
                  </div>
                </div>
                <div className="text-center">
                  <CircularGauge
                    value={motorB}
                    max={255}
                    label="Motor B"
                    color="#06b6d4"
                  />
                  <div
                    className={`mt-2 text-sm font-medium ${
                      motorB > 0
                        ? "text-emerald-600"
                        : motorB < 0
                        ? "text-amber-600"
                        : "text-gray-400"
                    }`}
                  >
                    {motorB > 0
                      ? "Forward"
                      : motorB < 0
                      ? "Backward"
                      : "Stopped"}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                Real-time Activity
              </h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={speedHistory}>
                  <defs>
                    <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10 }}
                    stroke="#9ca3af"
                  />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="motorA"
                    stroke="#10b981"
                    fillOpacity={1}
                    fill="url(#colorSpeed)"
                  />
                  <Area
                    type="monotone"
                    dataKey="motorB"
                    stroke="#06b6d4"
                    fillOpacity={0.6}
                    fill="#06b6d4"
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-gray-600">Motor A</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                  <span className="text-gray-600">Motor B</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                System Info
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Connection</span>
                  <span
                    className={`text-sm font-semibold ${
                      isConnected ? "text-emerald-600" : "text-red-600"
                    }`}
                  >
                    {isConnected ? "Active" : "Disconnected"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Battery</span>
                  <span className="text-sm font-semibold text-emerald-600">
                    {batteryLevel}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Current Speed</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {speed} PWM
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active Mode</span>
                  <span className="text-sm font-semibold text-gray-800">
                    {activePreset || "Manual"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Voice Control</span>
                  <span
                    className={`text-sm font-semibold ${
                      isListening ? "text-red-600" : "text-gray-400"
                    }`}
                  >
                    {isListening ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
