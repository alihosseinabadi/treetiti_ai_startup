import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial } from "@react-three/drei";
import type { Mesh, Group } from "three";

function TorusKnot() {
  const ref = useRef<Mesh>(null);
  const initialY = useMemo(() => (Math.random() - 0.5) * 4, []);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.x = t * 0.05;
    ref.current.rotation.y = t * 0.08;
    ref.current.position.y = initialY + Math.sin(t * 0.15) * 0.3;
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.3}>
      <mesh ref={ref} position={[0, initialY, 0]}>
        <torusKnotGeometry args={[1.2, 0.35, 128, 16]} />
        <MeshDistortMaterial
          color="#FFFFFF"
          emissive="#FFFFFF"
          emissiveIntensity={0.08}
          roughness={0.3}
          metalness={0.9}
          transparent
          opacity={0.12}
          wireframe
          distort={0.1}
          speed={2}
        />
      </mesh>
    </Float>
  );
}

function FloatingRings() {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.rotation.y = t * 0.03;
  });

  const rings = useMemo(() =>
    Array.from({ length: 3 }, (_, i) => ({
      radius: 2.5 + i * 1.2,
      tube: 0.015,
      opacity: 0.04 - i * 0.008,
      offset: i * 1.5,
    })),
  []);

  return (
    <group ref={groupRef}>
      {rings.map((ring, i) => (
        <mesh key={i} position={[0, ring.offset - 2, -2]}>
          <torusGeometry args={[ring.radius, ring.tube, 32, 64]} />
          <meshBasicMaterial
            color="#FFFFFF"
            transparent
            opacity={ring.opacity}
          />
        </mesh>
      ))}
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.2} />
      <pointLight position={[-10, -10, -5]} intensity={0.1} color="#FFFFFF" />
      <TorusKnot />
      <FloatingRings />
    </>
  );
}

export default function ThreeBackground() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[1]">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
