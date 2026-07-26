"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import {
  Cpu,
  Play,
  Download,
  ArrowLeft,
  Loader2,
  Activity,
  Layers,
  Zap,
  Terminal,
  Settings2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface AgentTelemetryFrame {
  stage?: string;
  agent_name?: string;
  status: "IN_PROGRESS" | "SUCCESS" | "WARNING" | "FAILED";
  reasoning: string;
  payload?: any;
  execution_time_ms?: number;
}

// --- 3D PCB Viewport Component ---
function WorkspacePCBVisualizer({ placements }: { placements: any[] }) {
  return (
    <Canvas camera={{ position: [0, 90, 110], fov: 45 }}>
      <ambientLight intensity={0.8} />
      <directionalLight position={[60, 80, 40]} intensity={1.2} />

      {/* PCB Substrate (Green Fr4 Board) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[120, 80]} />
        <meshStandardMaterial color="#064E3B" roughness={0.3} metalness={0.1} />
      </mesh>

      {/* Millimeter Coordinate Grid Overlay */}
      <Grid
        position={[0, -0.9, 0]}
        args={[120, 80]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#047857"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#10B981"
        fadeDistance={250}
      />

      {/* Render Component 3D Geometries */}
      {placements.map((comp, idx) => {
        const x = comp.position?.x ? comp.position.x - 60 : 0;
        const y = comp.position?.y ? comp.position.y - 40 : 0;

        return (
          <group key={idx} position={[x, 1.5, y]}>
            <mesh>
              <boxGeometry args={[10, 4, 10]} />
              <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Pin 1 Orientation Marker */}
            <mesh position={[-3.5, 2.1, -3.5]}>
              <cylinderGeometry args={[0.6, 0.6, 0.3]} />
              <meshStandardMaterial color="#F59E0B" />
            </mesh>
          </group>
        );
      })}

      <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
    </Canvas>
  );
}

// --- Dedicated Workspace Page ---
export default function EngineeringWorkspacePage() {
  const [prompt, setPrompt] = useState(
    "Design a high-efficiency GaN-based synchronous buck converter: 400V Vin, 48V Vout, 1kW output power."
  );
  const [isExecuting, setIsExecuting] = useState(false);
  const [telemetry, setTelemetry] = useState<AgentTelemetryFrame[]>([]);
  const [activeTab, setActiveTab] = useState<"3d" | "spice" | "netlist">("3d");
  const [placements, setPlacements] = useState<any[]>([]);
  const [netlist, setNetlist] = useState<string>("");
  const [simMetrics, setSimMetrics] = useState<any>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll telemetry log on update
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

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws/design";
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          prompt: prompt,
          parameters: { target_efficiency: 0.975, frequency_khz: 200 },
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const frame: AgentTelemetryFrame = JSON.parse(event.data);
        setTelemetry((prev) => [...prev, frame]);

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
        console.error("Error parsing WebSocket telemetry frame", e);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket Connection Error:", err);
      setTelemetry((prev) => [
        ...prev,
        {
          status: "FAILED",
          reasoning: "WebSocket connection error. Verify FastAPI gateway at ws://localhost:8000/ws/design",
        },
      ]);
      setIsExecuting(false);
    };

    ws.onclose = () => {
      setIsExecuting(false);
    };
  };

  const handleDownloadNetlist = () => {
    if (!netlist) return;
    const blob = new Blob([netlist], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "circuitmind_design.cir";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen bg-[#0B0F17] text-slate-100 font-sans overflow-hidden">
      {/* Workspace Navigation Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-[#111622]">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            <span className="font-bold text-base tracking-wide text-white">
              CircuitMind Workspace
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleDownloadNetlist}
            disabled={!netlist}
            className={`px-3 py-1.5 rounded text-xs font-medium flex items-center space-x-1.5 border transition-all ${
              netlist
                ? "border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
                : "border-slate-900 bg-slate-950 text-slate-600 cursor-not-allowed"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Netlist</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Split View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Controls & Real-Time Telemetry */}
        <div className="w-2/5 flex flex-col border-r border-slate-800 bg-[#0F1420]">
          {/* Engineering Prompt Textarea */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
              <Settings2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Design Specification</span>
            </label>
            <textarea
              className="w-full h-24 p-3 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none font-mono"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your electrical requirements..."
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
                  <span>Synthesizing Architecture...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run Design Pipeline</span>
                </>
              )}
            </button>
          </div>

          {/* Telemetry Log */}
          <div className="flex-1 flex flex-col p-4 overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center space-x-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span>Agent Execution Stream</span>
              </span>
            </div>
            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3 overflow-y-auto space-y-3 font-mono text-xs">
              {telemetry.length === 0 ? (
                <div className="text-slate-600 text-center py-10">
                  Ready. Click "Run Design Pipeline" to execute agents.
                </div>
              ) : (
                telemetry.map((frame, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-slate-900/60 rounded border border-slate-800/80 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-blue-400 font-bold">
                        {frame.agent_name || frame.stage || "System"}
                      </span>
                      {frame.execution_time_ms && (
                        <span className="text-[10px] text-slate-500">
                          {frame.execution_time_ms}ms
                        </span>
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

        {/* Right Side: 3D CAD Board Viewport & Simulation Diagnostics */}
        <div className="w-3/5 flex flex-col bg-[#0B0F17]">
          {/* Viewport Sub-navigation */}
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
              <span>3D PCB Layout</span>
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
              <span>SPICE Metrics</span>
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
              <span>Netlist Source</span>
            </button>
          </div>

          {/* Viewport Rendering Area */}
          <div className="flex-1 relative">
            {activeTab === "3d" && (
              <div className="w-full h-full">
                <WorkspacePCBVisualizer placements={placements} />
              </div>
            )}

            {activeTab === "spice" && (
              <div className="p-6 space-y-6 overflow-y-auto h-full">
                <h3 className="text-sm font-semibold text-slate-200">
                  Transient Simulation & Power Metrics
                </h3>
                {simMetrics ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="text-xs text-slate-400">Peak Vout</span>
                      <p className="text-xl font-bold text-emerald-400">
                        {simMetrics.peak_voltage} V
                      </p>
                    </div>
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="text-xs text-slate-400">Voltage Ripple</span>
                      <p className="text-xl font-bold text-amber-400">
                        {(simMetrics.ripple_ratio * 100).toFixed(2)} %
                      </p>
                    </div>
                    <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                      <span className="text-xs text-slate-400">Efficiency</span>
                      <p className="text-xl font-bold text-blue-400">
                        {(simMetrics.efficiency * 100).toFixed(1)} %
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 text-xs italic">
                    Run the pipeline to calculate simulation metrics.
                  </div>
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
