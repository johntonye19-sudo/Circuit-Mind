"use client";

import React, { useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid, Text, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

export interface ComponentPlacement {
  designator: string;
  type: string;
  position: { x: number; y: number }; // In millimeters relative to board center
  rotation?: number; // In degrees
  dimensions?: { width: number; height: number; depth: number };
}

interface PCBViewport3DProps {
  placements?: ComponentPlacement[];
  boardDimensions?: { width: number; height: number }; // mm
  boardColor?: string;
}

// Single Component Mesh Renderer
function ComponentMesh({ component }: { component: ComponentPlacement }) {
  const meshRef = useRef<THREE.Group>(null);
  const dims = component.dimensions || { width: 10, height: 4, depth: 10 };
  const rotationRad = ((component.rotation || 0) * Math.PI) / 180;

  // Visual styling based on component type
  const isIC = component.type.toLowerCase().includes("ic") || component.designator.startsWith("U");
  const isCap = component.designator.startsWith("C");
  const isInductor = component.designator.startsWith("L");

  let bodyColor = "#1E293B"; // Default dark slate chip
  if (isCap) bodyColor = "#D97706"; // Amber ceramic cap
  if (isInductor) bodyColor = "#334155"; // Dark metallic core

  return (
    <group
      ref={meshRef}
      position={[component.position.x, dims.height / 2, component.position.y]}
      rotation={[0, rotationRad, 0]}
    >
      {/* Component Main Body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[dims.width, dims.height, dims.depth]} />
        <meshStandardMaterial color={bodyColor} roughness={0.3} metalness={0.6} />
      </mesh>

      {/* Pin 1 Orientation Marker for ICs */}
      {isIC && (
        <mesh position={[-dims.width / 2 + 1.5, dims.height / 2 + 0.1, -dims.depth / 2 + 1.5]}>
          <cylinderGeometry args={[0.5, 0.5, 0.2]} />
          <meshStandardMaterial color="#F59E0B" roughness={0.2} />
        </mesh>
      )}

      {/* Heat Sink for Power Transistors/FETs */}
      {component.designator.startsWith("Q") && (
        <mesh position={[0, dims.height / 2 + 1.5, 0]}>
          <boxGeometry args={[dims.width * 0.9, 3, dims.depth * 0.8]} />
          <meshStandardMaterial color="#64748B" metalness={0.9} roughness={0.2} />
        </mesh>
      )}

      {/* Component Designator Label */}
      <Text
        position={[0, dims.height / 2 + 0.3, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={Math.min(dims.width, dims.depth) * 0.3}
        color="#FFFFFF"
        anchorX="center"
        anchorY="middle"
      >
        {component.designator}
      </Text>
    </group>
  );
}

// Main 3D Canvas Container
export default function PCBViewport3D({
  placements = [],
  boardDimensions = { width: 120, height: 80 },
  boardColor = "#064E3B", // Classic FR-4 Green
}: PCBViewport3DProps) {
  const { width, height } = boardDimensions;

  return (
    <div className="w-full h-full relative bg-[#0B0F17]">
      <Canvas
        camera={{
          position: [0, 90, 110],
          fov: 45,
          near: 0.1,
          far: 1000,
        }}
        shadows
      >
        {/* Ambient & Directional Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[60, 100, 50]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        {/* FR-4 PCB Substrate */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial color={boardColor} roughness={0.3} metalness={0.1} />
        </mesh>

        {/* Copper Board Edge Border */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
          <ringGeometry args={[Math.min(width, height) / 2 - 0.5, Math.min(width, height) / 2, 4]} />
          <meshStandardMaterial color="#B45309" metalness={0.8} />
        </mesh>

        {/* Millimeter Grid Overlay */}
        <Grid
          position={[0, -0.4, 0]}
          args={[width, height]}
          cellSize={5}
          cellThickness={0.5}
          cellColor="#047857"
          sectionSize={10}
          sectionThickness={1}
          sectionColor="#10B981"
          fadeDistance={300}
        />

        {/* Component Placements */}
        {placements.map((comp, idx) => (
          <ComponentMesh key={`${comp.designator}-${idx}`} component={comp} />
        ))}

        {/* Soft Contact Shadows */}
        <ContactShadows
          position={[0, -0.45, 0]}
          opacity={0.6}
          scale={Math.max(width, height)}
          blur={1.5}
          far={10}
        />

        {/* Orbit Camera Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2 - 0.05} // Prevent camera from clipping under the board
        />
      </Canvas>

      {/* Floating Canvas Overlay Legend */}
      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur border border-slate-800 text-[10px] text-slate-400 p-2.5 rounded-md space-y-1 font-mono">
        <div>
          Board Dimensions: <span className="text-slate-200">{width}mm × {height}mm</span>
        </div>
        <div>
          Active Components: <span className="text-emerald-400">{placements.length} placed</span>
        </div>
      </div>
    </div>
  );
}
