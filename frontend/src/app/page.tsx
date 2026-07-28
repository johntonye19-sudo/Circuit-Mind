"use client";

import React, { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import { 
  Cpu, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Activity, 
  Layers, 
  Zap, 
  Terminal 
} from "lucide-react";

interface AgentTelemetryFrame {
  stage?: string;
  agent_name?: string;
  status: "IN_PROGRESS" | "SUCCESS" | "WARNING" | "FAILED";
  reasoning: string;
  payload?: any;
  execution_time_ms?: number;
}

// --- 3D PCB Visualizer Component ---
function PCBVisualizer({ placements }: { placements: any[] }) {
  return (
    <Canvas camera={{ position: [0, 80, 100], fov: 45 }}>
      <ambientLight intensity={0.7} />
      <directionalLight position={[50, 50, 25]} intensity={1.2} />
      
      {/* PCB Substrate Green Board */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.8, 0]}>
        <planeGeometry args={[100, 60]} />
        <meshStandardMaterial color="#065F46" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Grid overlay representing PCB millimeter coordinates */}
      <Grid
        position={[0, -0.7, 0]}
        args={[100, 60]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#047857"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#10B981"
        fadeDistance={200}
      />

      {/* Render Component 3D Models based on placements */}
      {placements.map((comp, idx) => {
        const x = comp.position?.x ? comp.position.x - 50 : 0;
        const y = comp.position?.y ? comp.position.y - 30 : 0;

        return (
          <group key={idx} position={[x, 1, y]}>
            <mesh>
              <boxGeometry args={[8, 3, 8]} />
              <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Component Label pin indicator */}
            <mesh position={[0, 1.6, 0]}>
              <cylinderGeometry args={[0.5, 0.5, 0.2]} />
              <meshStandardMaterial color="#F59E0B" />
            </mesh>
          </group>
        );
      })}

      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </Canvas>
  );
}

// --- Main CircuitMind Studio Component ---
export default function CircuitMindStudio() {
  const [prompt, setPrompt] = useState(
    "Design a 400V to 48V GaN synchronous buck converter for DC microgrid auxiliary rail"
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [telemetry, setTelemetry] = useState<AgentTelemetryFrame[]>([]);
  const [activeTab, setActiveTab] = useState<"3d" | "spice" | "netlist">("3d");
  const [placements, setPlacements] = useState<any[]>([]);
  const [netlist, setNetlist] = useState<string>("");
  const [simMetrics, setSimMetrics] = useState<any>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll telemetry console to bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [telemetry]);

  const handleRunPipeline = () => {
    if (!prompt.trim() || isExecuting) return;

    setIsExecuting(true);
    setTelemetry([]);
    setPlacements([]);
    setNetlist("");
    setSimMetrics(null);

    // Initialize WebSocket connection to FastAPI backend gateway
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/design";
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          prompt: prompt,
          parameters: { target_efficiency: 0.97 },
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const frame: AgentTelemetryFrame = JSON.parse(event.data);
        setTelemetry((prev) => [...prev, frame]);

        // Extract payloads from telemetry stages
        if (frame.payload) {
          if (frame.payload.netlist) setNetlist(frame.payload.netlist);
          if (frame.payload.placements) setPlacements(frame.payload.placements);
          if (frame.payload.efficiency !== undefined) setSimMetrics(frame.payload);
        }

        if (frame.stage === "PIPELINE_COMPLETE" || frame.stage === "PIPELINE_FAILED") {
          setIsExecuting(false);
          ws.close();
        }
      } catch (e) {
        console.error("Failed to parse WebSocket frame", e);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket Error:", err);
      setTelemetry((prev) => [
        ...prev,
        {
          status: "FAILED",
          reasoning: "WebSocket connection error. Is the FastAPI backend gateway running?",
        },
      ]);
      setIsExecuting(false);
    };

    ws.onclose = () => {
      setIsExecuting(false);
    };
  };

  return (
    <div className="flex flex-col h-screen bg-[#0B0F17] text-slate-100 font-sans overflow-hidden">
      {/* Top Header Navigation */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-[#111622]">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Cpu className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-wide text-white">CircuitMind</span>
          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            v1.0.0 EDA Core
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${isExecuting ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`} />
            <span>{isExecuting ? "Engine Active" : "System Idle"}</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Control & Telemetry Panel */}
        <div className="w-2/5 flex flex-col border-r border-slate-800 bg-[#0F1420]">
          {/* Prompt Entry Box */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
              <Terminal className="w-3.5 h-3.5 text-blue-400" />
              <span>Engineering Intent Prompt</span>
            </label>
            <textarea
              className="w-full h-24 p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-mono"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter power electronic circuit requirements..."
            />
            <button
              onClick={handleRunPipeline}
              disabled={isExecuting}
              className={`w-full py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center space-x-2 transition-all ${
                isExecuting
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
              }`}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Design...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Synthesize & Simulate</span>
                </>
              )}
            </button>
          </div>

          {/* Real-Time Agent DAG Telemetry Console */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>Multi-Agent DAG Execution Stream</span>
              </span>
            </div>
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-y-auto space-y-3 font-mono text-xs">
              {telemetry.length === 0 ? (
                <div className="text-slate-600 text-center py-8">
                  Ready. Click "Synthesize & Simulate" to initiate design pipeline.
                </div>
              ) : (
                telemetry.map((frame, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-bold">{frame.agent_name || frame.stage || "System"}</span>
                      {frame.execution_time_ms && (
                        <span className="text-[10px] text-slate-500">{frame.execution_time_ms}ms</span>
                      )}
                    </div>
                    <p className="text-slate-300 leading-relaxed">{frame.reasoning}</p>
                  </div>
                ))
              )}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </div>

        {/* Right Tabbed Viewport: 3D PCB, Netlist & SPICE Results */}
        <div className="w-3/5 flex flex-col bg-[#0B0F17]">
          {/* Viewport Tabs */}
          <div className="flex items-center px-4 border-b border-slate-800 bg-[#111622] space-x-2">
            <button
              onClick={() => setActiveTab("3d")}
              className={`py-3 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
                activeTab === "3d"
                  ? "border-blue-500 text-blue-400 bg-slate-900/40"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>3D PCB Viewport</span>
            </button>
            <button
              onClick={() => setActiveTab("spice")}
              className={`py-3 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
                activeTab === "spice"
                  ? "border-blue-500 text-blue-400 bg-slate-900/40"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>SPICE Simulation</span>
            </button>
            <button
              onClick={() => setActiveTab("netlist")}
              className={`py-3 px-4 text-xs font-semibold flex items-center space-x-2 border-b-2 transition-all ${
                activeTab === "netlist"
                  ? "border-blue-500 text-blue-400 bg-slate-900/40"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Netlist Data</span>
            </button>
          </div>

          {/* Viewport Content Rendering */}
          <div className="flex-1 relative">
            {activeTab === "3d" && (
              <div className="w-full h-full">
                <PCBVisualizer placements={placements} />
              </div>
            )}

            {activeTab === "spice" && (
              <div className="p-6 space-y-6 overflow-y-auto h-full">
                <h3 className="text-sm font-semibold text-slate-200">Transient Simulation Performance</h3>
                {simMetrics ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="text-xs text-slate-400">Peak Output Voltage</span>
                      <p className="text-xl font-bold text-emerald-400">{simMetrics.peak_voltage} V</p>
                    </div>
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="text-xs text-slate-400">Voltage Ripple</span>
                      <p className="text-xl font-bold text-amber-400">{(simMetrics.ripple_ratio * 100).toFixed(2)} %</p>
                    </div>
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="text-xs text-slate-400">Estimated Efficiency</span>
                      <p className="text-xl font-bold text-blue-400">{(simMetrics.efficiency * 100).toFixed(1)} %</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs italic">No simulation data available yet.</div>
                )}
              </div>
            )}

            {activeTab === "netlist" && (
              <div className="p-4 h-full">
                <textarea
                  readOnly
                  className="w-full h-full p-4 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-emerald-400 focus:outline-none resize-none"
                  value={netlist || "* No netlist generated yet."}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
