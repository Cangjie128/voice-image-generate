import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const STAR_COUNT = 1600
const DUST_COUNT = 420

function buildStarGeometry(count: number, radius: number) {
  const positions: number[] = []
  const colors: number[] = []
  const palette = [
    new THREE.Color('#f8fbff'),
    new THREE.Color('#9ee7ff'),
    new THREE.Color('#ffe2c2'),
    new THREE.Color('#bdf8df')
  ]

  for (let i = 0; i < count; i++) {
    positions.push(
      (Math.random() - 0.5) * radius,
      (Math.random() - 0.5) * radius * 0.7,
      Math.random() * -radius
    )

    const color = palette[Math.floor(Math.random() * palette.length)]
    colors.push(color.r, color.g, color.b)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geometry
}

export default function Starfield() {
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(64, 1, 0.1, 2000)
    camera.position.z = 12

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: import.meta.env.DEV
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.setAttribute('aria-hidden', 'true')
    container.appendChild(renderer.domElement)

    const stars = buildStarGeometry(STAR_COUNT, 1500)
    const starMaterial = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      sizeAttenuation: false,
      depthWrite: false
    })
    const starPoints = new THREE.Points(stars, starMaterial)
    scene.add(starPoints)

    const dust = buildStarGeometry(DUST_COUNT, 900)
    const dustMaterial = new THREE.PointsMaterial({
      size: 2.8,
      color: '#75e8df',
      transparent: true,
      opacity: 0.18,
      sizeAttenuation: false,
      depthWrite: false
    })
    const dustPoints = new THREE.Points(dust, dustMaterial)
    dustPoints.rotation.z = -0.42
    scene.add(dustPoints)

    const resize = () => {
      const width = container.clientWidth || window.innerWidth
      const height = container.clientHeight || window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }

    let animationId = 0
    const render = () => {
      const starPositions = stars.attributes.position
      const dustPositions = dust.attributes.position

      if (!reducedMotion) {
        for (let i = 2; i < starPositions.count * 3; i += 3) {
          starPositions.array[i] = Number(starPositions.array[i]) + 1.4
          if (Number(starPositions.array[i]) > 20) {
            starPositions.array[i] = -1480
          }
        }

        for (let i = 2; i < dustPositions.count * 3; i += 3) {
          dustPositions.array[i] = Number(dustPositions.array[i]) + 0.45
          if (Number(dustPositions.array[i]) > 30) {
            dustPositions.array[i] = -880
          }
        }

        starPositions.needsUpdate = true
        dustPositions.needsUpdate = true
        starPoints.rotation.z += 0.00006
        dustPoints.rotation.z += 0.00012
      }

      renderer.render(scene, camera)
      animationId = window.requestAnimationFrame(render)
    }

    resize()
    window.addEventListener('resize', resize)
    render()

    return () => {
      window.cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
      stars.dispose()
      dust.dispose()
      starMaterial.dispose()
      dustMaterial.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div className="starfield" ref={containerRef} />
}
