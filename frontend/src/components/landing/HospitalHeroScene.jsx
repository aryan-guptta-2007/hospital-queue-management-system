import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const THEME = {
  light: {
    bg: '#eef5ff',
    fog: '#e6f0fd',
    ambient: '#f8fbff',
    fill: '#dbeafe',
    platform: '#ffffff',
    platformEdge: '#cfe0fb',
    lane: '#8fb7f5',
    laneDim: '#c7dcfa',
    tokenBlue: '#2563eb',
    tokenTeal: '#0ea5a4',
    tokenSenior: '#7c3aed',
    pulse: '#60a5fa',
    cross: '#ef4444',
  },
  dark: {
    bg: '#0f1a2c',
    fog: '#142238',
    ambient: '#26344b',
    fill: '#334966',
    platform: '#1a2a41',
    platformEdge: '#294265',
    lane: '#4f78b8',
    laneDim: '#304c75',
    tokenBlue: '#60a5fa',
    tokenTeal: '#2dd4bf',
    tokenSenior: '#a78bfa',
    pulse: '#93c5fd',
    cross: '#f87171',
  },
}

const Token = ({ color, setRef }) => (
  <group ref={setRef}>
    <mesh>
      <capsuleGeometry args={[0.04, 0.12, 5, 9]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} roughness={0.34} metalness={0.35} />
    </mesh>
    <mesh position={[0, 0, 0.045]}>
      <sphereGeometry args={[0.01, 10, 10]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  </group>
)

export function HospitalHeroScene({ reducedMotion, colorMode = 'light' }) {
  const isDark = colorMode === 'dark'
  const pal = THEME[isDark ? 'dark' : 'light']
  const rootRef = useRef()
  const ringRef = useRef()
  const ringRef2 = useRef()
  const nowServingRef = useRef()
  const tokenRefsA = useRef([])
  const tokenRefsB = useRef([])
  const tokenRefsC = useRef([])

  const pathA = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(-2.25, -0.3, 0.7),
          new THREE.Vector3(-1.7, -0.22, 0.36),
          new THREE.Vector3(-1.12, -0.12, 0.12),
          new THREE.Vector3(-0.55, -0.03, 0.04),
          new THREE.Vector3(-0.12, 0.03, 0.0),
        ],
        false,
      ),
    [],
  )

  const pathB = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(-2.15, -0.52, 0.45),
          new THREE.Vector3(-1.6, -0.44, 0.24),
          new THREE.Vector3(-0.98, -0.31, 0.08),
          new THREE.Vector3(-0.42, -0.17, 0.02),
          new THREE.Vector3(0.02, -0.07, -0.02),
        ],
        false,
      ),
    [],
  )

  const pathC = useMemo(
    () =>
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(-2.05, -0.7, 0.15),
          new THREE.Vector3(-1.4, -0.62, 0.06),
          new THREE.Vector3(-0.84, -0.5, -0.02),
          new THREE.Vector3(-0.34, -0.34, -0.04),
          new THREE.Vector3(0.05, -0.14, -0.04),
        ],
        false,
      ),
    [],
  )

  const laneA = useMemo(() => new THREE.TubeGeometry(pathA, 96, 0.032, 14, false), [pathA])
  const laneB = useMemo(() => new THREE.TubeGeometry(pathB, 96, 0.026, 12, false), [pathB])
  const laneC = useMemo(() => new THREE.TubeGeometry(pathC, 96, 0.022, 10, false), [pathC])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const calm = reducedMotion ? 0 : 1

    if (rootRef.current) {
      rootRef.current.rotation.y = Math.sin(t * 0.14) * 0.03 * calm
    }
    if (ringRef.current) {
      const s = 1 + Math.sin(t * 1.8) * 0.07 * calm
      ringRef.current.scale.set(s, s, s)
      ringRef.current.material.opacity = 0.25 + Math.sin(t * 1.8) * 0.08 * calm
    }
    if (ringRef2.current) {
      const s2 = 1 + Math.sin(t * 1.8 + 0.6) * 0.1 * calm
      ringRef2.current.scale.set(s2, s2, s2)
      ringRef2.current.material.opacity = 0.12 + Math.sin(t * 1.8 + 0.6) * 0.06 * calm
    }
    if (nowServingRef.current) {
      nowServingRef.current.material.emissiveIntensity = 0.6 + Math.sin(t * 2.1) * 0.2 * calm
    }

    const move = (tokens, curve, speed, jitter = 0) => {
      tokens.current.forEach((token, i) => {
        if (!token) return
        const offset = i * 0.2
        const u = reducedMotion ? Math.min(0.06 + offset, 0.95) : (t * speed + offset) % 1
        const p = curve.getPointAt(u)
        const tangent = curve.getTangentAt(u).normalize()
        token.position.set(p.x, p.y + Math.sin(t * 1.2 + i) * jitter * calm, p.z)
        token.lookAt(p.clone().add(tangent))
      })
    }

    move(tokenRefsA, pathA, 0.12, 0.01)
    move(tokenRefsB, pathB, 0.1, 0.008)
    move(tokenRefsC, pathC, 0.085, 0.006)
  })

  return (
    <>
      <color attach="background" args={[pal.bg]} />
      <fog attach="fog" args={[pal.fog, 7, 20]} />

      <ambientLight intensity={0.72} color={pal.ambient} />
      <directionalLight position={[4.8, 5.5, 4]} intensity={0.62} color={pal.fill} />
      <directionalLight position={[-2, 3, 1]} intensity={0.2} color={pal.pulse} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.78, 0]}>
        <circleGeometry args={[4.2, 54]} />
        <meshStandardMaterial color={pal.laneDim} roughness={0.95} metalness={0.02} />
      </mesh>

      <group ref={rootRef} position={[0.08, -0.05, -0.08]}>
        <mesh position={[0, -0.03, -0.05]}>
          <boxGeometry args={[2.95, 1.86, 0.08]} />
          <meshStandardMaterial color={pal.platformEdge} roughness={0.84} metalness={0.03} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[2.82, 1.72, 0.14]} />
          <meshStandardMaterial color={pal.platform} roughness={0.45} metalness={0.1} />
        </mesh>

        <mesh geometry={laneA}>
          <meshStandardMaterial color={pal.lane} roughness={0.38} metalness={0.24} />
        </mesh>
        <mesh geometry={laneB}>
          <meshStandardMaterial color={pal.lane} roughness={0.4} metalness={0.21} />
        </mesh>
        <mesh geometry={laneC}>
          <meshStandardMaterial color={pal.laneDim} roughness={0.45} metalness={0.18} />
        </mesh>

        <mesh ref={nowServingRef} position={[0.1, 0.1, 0]}>
          <sphereGeometry args={[0.075, 20, 20]} />
          <meshStandardMaterial color={pal.pulse} emissive={pal.pulse} emissiveIntensity={0.62} />
        </mesh>
        <mesh ref={ringRef} position={[0.1, 0.1, -0.01]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.25, 44]} />
          <meshBasicMaterial color={pal.pulse} transparent opacity={0.24} side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={ringRef2} position={[0.1, 0.1, -0.02]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.28, 0.34, 44]} />
          <meshBasicMaterial color={pal.pulse} transparent opacity={0.12} side={THREE.DoubleSide} />
        </mesh>

        <mesh position={[0.1, 0.55, 0]}>
          <boxGeometry args={[0.1, 0.36, 0.04]} />
          <meshStandardMaterial color={pal.cross} emissive={pal.cross} emissiveIntensity={0.15} />
        </mesh>
        <mesh position={[0.1, 0.55, 0]}>
          <boxGeometry args={[0.36, 0.1, 0.04]} />
          <meshStandardMaterial color={pal.cross} emissive={pal.cross} emissiveIntensity={0.15} />
        </mesh>

        {Array.from({ length: 4 }).map((_, i) => (
          <Token
            key={`a-${i}`}
            color={i === 2 ? pal.tokenSenior : i % 2 === 0 ? pal.tokenBlue : pal.tokenTeal}
            setRef={(el) => {
              tokenRefsA.current[i] = el
            }}
          />
        ))}
        {Array.from({ length: 3 }).map((_, i) => (
          <Token
            key={`b-${i}`}
            color={i === 1 ? pal.tokenSenior : pal.tokenBlue}
            setRef={(el) => {
              tokenRefsB.current[i] = el
            }}
          />
        ))}
        {Array.from({ length: 3 }).map((_, i) => (
          <Token
            key={`c-${i}`}
            color={i % 2 === 0 ? pal.tokenTeal : pal.tokenBlue}
            setRef={(el) => {
              tokenRefsC.current[i] = el
            }}
          />
        ))}
      </group>
    </>
  )
}
