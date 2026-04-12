import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { HospitalHeroScene } from './HospitalHeroScene'

const HeroCanvas = ({ reducedMotion, colorMode = 'light', className = '' }) => (
  <Canvas
    className={className}
    camera={{ position: [0, 0, 5.5], fov: 34 }}
    dpr={[1, 1.5]}
    gl={{
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    }}
    style={{ touchAction: 'none', width: '100%', height: '100%' }}
  >
    <Suspense fallback={null}>
      <HospitalHeroScene reducedMotion={reducedMotion} colorMode={colorMode} />
    </Suspense>
  </Canvas>
)

export default HeroCanvas
