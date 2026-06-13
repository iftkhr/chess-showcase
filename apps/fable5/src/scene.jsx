import * as THREE from 'three'
import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  makeBarkTexture,
  makeRingsTexture,
  makeGroundTexture,
  makeShaftTexture,
  makeStarkBanner,
  makeTargBanner,
  fbm,
} from './textures.js'

const GROUND_Y = -5

function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// radial irregularity of the stump rim — shared by side wall and cut face
const rimWobble = (ang) =>
  1 + 0.05 * Math.sin(ang * 5 + 1.2) + 0.03 * Math.sin(ang * 9 + 4.0) + 0.02 * Math.sin(ang * 17 + 2.1)

// lumpy organic blob. opts.color bakes RGB vertex colors (use with a white
// vertexColors material): clumpy shading plus snow settling on upward faces.
function blobGeometry(radius, detail, seed, amount, opts = {}) {
  const { shade = 0, color = null, snow = '#e6ecf2', snowAmt = 0 } = opts
  const geo = new THREE.IcosahedronGeometry(radius, detail)
  const pos = geo.getAttribute('position')
  const v = new THREE.Vector3()
  const colors = color ? new Float32Array(pos.count * 3) : null
  const base = color ? new THREE.Color(color) : null
  const snowC = new THREE.Color(snow)
  const tmp = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i))
    const n =
      fbm(v.x * 0.45 + seed, v.y * 0.45 + v.z * 0.3, seed, 3) +
      0.4 * Math.sin(v.x * 2.1 + seed) * Math.sin(v.z * 1.7 + seed * 2) +
      0.18 * Math.sin(v.x * 5.7 + seed) * Math.sin(v.y * 5.1 + seed) * Math.sin(v.z * 4.7 + seed * 3)
    const s = 1 + (n - 0.5) * amount
    pos.setXYZ(i, v.x * s, v.y * s, v.z * s)
    if (colors) {
      let l = 1 - shade * 0.45 + shade * fbm(v.x * 0.8 + seed, v.y * 0.7 - v.z * 0.6, seed + 7, 2)
      l *= 1 + shade * 0.3 * (v.y / radius)
      tmp.copy(base).multiplyScalar(l)
      if (snowAmt > 0) {
        const upness = Math.max(0, v.y / (radius * 1.15))
        const patchy = 0.55 + 0.9 * fbm(v.x * 0.7 + seed, v.z * 0.7 + seed * 2, seed + 23, 2)
        tmp.lerp(snowC, Math.min(1, Math.pow(upness, 1.5) * snowAmt * patchy))
      }
      colors[i * 3] = tmp.r
      colors[i * 3 + 1] = tmp.g
      colors[i * 3 + 2] = tmp.b
    }
  }
  pos.needsUpdate = true
  if (colors) geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  return geo
}

/* ---------------- the stump ---------------- */

function Stump({ mats, rings }) {
  const { sideGeo, capGeo } = useMemo(() => {
    const sideGeo = new THREE.CylinderGeometry(6.6, 7.0, 4.5, 96, 16, true)
    const pos = sideGeo.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const ang = Math.atan2(z, x)
      const hNorm = (y + 2.25) / 4.5
      const flare = Math.pow(Math.abs(Math.sin(ang * 3 + 0.7)), 2.6)
      const mult =
        rimWobble(ang) +
        flare * 0.6 * Math.pow(1 - hNorm, 2.5) +
        0.025 * Math.sin(y * 3.1 + ang * 13) * (1 - hNorm * 0.5)
      pos.setX(i, x * mult)
      pos.setZ(i, z * mult)
    }
    pos.needsUpdate = true
    sideGeo.computeVertexNormals()

    const capGeo = new THREE.CircleGeometry(6.6, 96)
    const cpos = capGeo.getAttribute('position')
    for (let i = 0; i < cpos.count; i++) {
      const x = cpos.getX(i)
      const y = cpos.getY(i)
      if (x === 0 && y === 0) continue
      const mult = rimWobble(-Math.atan2(y, x))
      cpos.setX(i, x * mult)
      cpos.setY(i, y * mult)
    }
    cpos.needsUpdate = true
    return { sideGeo, capGeo }
  }, [])

  const snowPads = useMemo(() => {
    const rnd = mulberry32(88)
    return Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 + rnd() * 0.5
      const r = 6.55 * rimWobble(a)
      return {
        geo: blobGeometry(0.4 + rnd() * 0.45, 2, i * 7 + 2, 0.9, { shade: 0.15, color: '#dde4ec', snowAmt: 0 }),
        pos: [Math.cos(a) * r, 2.05 + rnd() * 0.15, Math.sin(a) * r],
        sy: 0.2 + rnd() * 0.12,
      }
    })
  }, [])

  return (
    <group position={[0, -2.75, 0]}>
      <mesh geometry={sideGeo} material={mats.bark} castShadow receiveShadow />
      <mesh geometry={capGeo} rotation-x={-Math.PI / 2} position={[0, 2.251, 0]} receiveShadow>
        <meshStandardMaterial map={rings.map} bumpMap={rings.bumpMap} bumpScale={1.4} roughness={0.85} />
      </mesh>
      {snowPads.map((m, i) => (
        <mesh key={i} geometry={m.geo} position={m.pos} scale={[1, m.sy, 1]} material={mats.foliage} castShadow />
      ))}
    </group>
  )
}

/* ---------------- trees ---------------- */

function Conifer({ x, z, s, ry, mats, tone, snowAmt }) {
  const layers = useMemo(() => {
    const rnd = mulberry32((x * 13 + z * 7) | 0 || 5)
    return Array.from({ length: 6 }, (_, i) => {
      const f = i / 5
      return {
        geo: blobGeometry(4.2 - f * 2.9, 3, i * 3 + 1, 0.55, { shade: 0.5, color: tone, snowAmt }),
        y: 7.5 + f * 10.5,
        sy: 0.62,
        dx: (rnd() - 0.5) * 1.2,
        dz: (rnd() - 0.5) * 1.2,
      }
    })
  }, [])
  return (
    <group position={[x, GROUND_Y, z]} scale={s} rotation-y={ry}>
      <mesh position={[0, 5.5, 0]} material={mats.trunk} castShadow>
        <cylinderGeometry args={[0.55, 1.05, 12, 10]} />
      </mesh>
      {layers.map((l, i) => (
        <mesh key={i} geometry={l.geo} position={[l.dx, l.y, l.dz]} scale={[1, l.sy, 1]} material={mats.foliage} castShadow />
      ))}
    </group>
  )
}

// the heart tree: bone-white bark, blood-red leaves
function Weirwood({ position, scale, mats }) {
  const blobs = useMemo(() => {
    const rnd = mulberry32(431)
    return Array.from({ length: 6 }, (_, i) => ({
      geo: blobGeometry(2.6 + rnd() * 1.4, 4, i * 13 + 4, 0.6, { shade: 0.5, color: '#8e2420', snowAmt: 0.45 }),
      pos: [(rnd() - 0.5) * 5.5, 11 + (rnd() - 0.5) * 3.5, (rnd() - 0.5) * 5.5],
    }))
  }, [])
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 4.8, 0]} material={mats.weirbark} castShadow>
        <cylinderGeometry args={[0.7, 1.5, 10, 12]} />
      </mesh>
      <mesh position={[1.3, 8.2, 0.4]} rotation-z={-0.55} material={mats.weirbark} castShadow>
        <cylinderGeometry args={[0.3, 0.55, 5, 8]} />
      </mesh>
      <mesh position={[-1.2, 8.6, -0.3]} rotation-z={0.5} material={mats.weirbark} castShadow>
        <cylinderGeometry args={[0.28, 0.5, 4.5, 8]} />
      </mesh>
      {blobs.map((b, i) => (
        <mesh key={i} geometry={b.geo} position={b.pos} material={mats.foliage} castShadow />
      ))}
    </group>
  )
}

/* ---------------- instanced undergrowth ---------------- */

function GrassField({ material }) {
  const mesh = useMemo(() => {
    const rnd = mulberry32(2024)
    const blades = []
    for (let i = 0; i < 8; i++) {
      const blade = new THREE.ConeGeometry(0.032, 0.55 + rnd() * 0.45, 4, 1)
      blade.translate(0, 0.3, 0)
      blade.rotateX((rnd() - 0.5) * 0.9)
      blade.rotateZ((rnd() - 0.5) * 0.9)
      blades.push(blade)
    }
    const geo = mergeGeometries(blades)

    const count = 750
    const mesh = new THREE.InstancedMesh(geo, material, count)
    const dummy = new THREE.Object3D()
    const col = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2
      const r = 8.5 + Math.pow(rnd(), 0.7) * 26
      dummy.position.set(Math.cos(a) * r, GROUND_Y, Math.sin(a) * r)
      dummy.rotation.y = rnd() * Math.PI * 2
      dummy.scale.setScalar(0.7 + rnd() * 1.1)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      // frozen straw poking through the snow
      col.setHSL(0.11 + rnd() * 0.04, 0.18 + rnd() * 0.15, 0.32 + rnd() * 0.18)
      mesh.setColorAt(i, col)
    }
    mesh.instanceMatrix.needsUpdate = true
    mesh.receiveShadow = true
    return mesh
  }, [material])
  return <primitive object={mesh} />
}

function FallenLeaves({ material }) {
  const mesh = useMemo(() => {
    const rnd = mulberry32(606)
    const geo = new THREE.PlaneGeometry(0.3, 0.38)
    const count = 380
    const m = new THREE.InstancedMesh(geo, material, count)
    const dummy = new THREE.Object3D()
    const col = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2
      const r = 7.5 + Math.pow(rnd(), 1.6) * 22
      dummy.position.set(Math.cos(a) * r, GROUND_Y + 0.02 + rnd() * 0.03, Math.sin(a) * r)
      dummy.rotation.set(-Math.PI / 2 + (rnd() - 0.5) * 0.4, 0, rnd() * Math.PI * 2)
      dummy.scale.setScalar(0.7 + rnd() * 0.9)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
      // blood-red weirwood leaves scattered over the snow, some dark debris
      if (rnd() < 0.7) col.setHSL(0.995, 0.55 + rnd() * 0.2, 0.2 + rnd() * 0.12)
      else col.setHSL(0.07, 0.3, 0.1 + rnd() * 0.08)
      m.setColorAt(i, col)
    }
    m.instanceMatrix.needsUpdate = true
    m.receiveShadow = true
    return m
  }, [material])
  return <primitive object={mesh} />
}

/* ---------------- snowfall ---------------- */

function Snowfall() {
  const ref = useRef()
  const { positions, speeds, count } = useMemo(() => {
    const rnd = mulberry32(99)
    const count = 900
    const positions = new Float32Array(count * 3)
    const speeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rnd() - 0.5) * 60
      positions[i * 3 + 1] = GROUND_Y + rnd() * 24
      positions[i * 3 + 2] = (rnd() - 0.5) * 60
      speeds[i] = 1.1 + rnd() * 1.7
    }
    return { positions, speeds, count }
  }, [])

  useFrame((state, dt) => {
    const pos = ref.current?.geometry.attributes.position
    if (!pos) return
    const t = state.clock.elapsedTime
    const d = Math.min(dt, 0.1)
    for (let i = 0; i < count; i++) {
      let y = pos.array[i * 3 + 1] - speeds[i] * d
      if (y < GROUND_Y) y = GROUND_Y + 24
      pos.array[i * 3 + 1] = y
      pos.array[i * 3] += Math.sin(t * 0.8 + i * 1.7) * d * 0.45
    }
    pos.needsUpdate = true
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.14} color="#eef3f8" transparent opacity={0.85} depthWrite={false} sizeAttenuation />
    </points>
  )
}

/* ---------------- house banners ---------------- */

function Banner({ position, rotationY, texture, mats }) {
  const clothGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2.4, 3.6, 12, 16)
    const pos = geo.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const hang = (1.8 - y) / 3.6 // 0 at the rod, 1 at the hem
      pos.setZ(i, Math.sin(y * 2.4 + x * 1.6) * 0.22 * hang)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    return geo
  }, [])
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh position={[0, 5, 0]} material={mats.iron} castShadow>
        <cylinderGeometry args={[0.1, 0.14, 10, 8]} />
      </mesh>
      <mesh position={[0, 9.95, 0]} material={mats.iron}>
        <sphereGeometry args={[0.2, 10, 8]} />
      </mesh>
      <mesh position={[0, 9.55, 0]} rotation-z={Math.PI / 2} material={mats.iron}>
        <cylinderGeometry args={[0.06, 0.06, 2.8, 8]} />
      </mesh>
      <mesh geometry={clothGeo} position={[0, 7.6, 0]} castShadow>
        <meshStandardMaterial map={texture} roughness={0.92} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

/* ---------------- light shafts + assembly ---------------- */

function LightShafts() {
  const tex = useMemo(() => makeShaftTexture(), [])
  const quat = useMemo(() => {
    const sunDir = new THREE.Vector3(-14, -20, -6).normalize().negate()
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), sunDir)
  }, [])
  const shafts = [
    { p: [-7, 6, -9], w: 4.5, o: 0.13 },
    { p: [8, 7, -6], w: 2.8, o: 0.1 },
    { p: [-13, 6, 3], w: 3.5, o: 0.09 },
    { p: [2, 8, -16], w: 6, o: 0.08 },
  ]
  return (
    <group>
      {shafts.map((s, i) => (
        <mesh key={i} position={s.p} quaternion={quat} renderOrder={10}>
          <planeGeometry args={[s.w, 34]} />
          <meshBasicMaterial
            map={tex}
            transparent
            opacity={s.o}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  )
}

export const ForestScene = memo(function ForestScene() {
  const tex = useMemo(
    () => ({
      bark: makeBarkTexture(),
      rings: makeRingsTexture(),
      ground: makeGroundTexture(),
      stark: makeStarkBanner(),
      targ: makeTargBanner(),
    }),
    []
  )

  const mats = useMemo(() => {
    tex.bark.map.repeat.set(6, 1.4)
    tex.bark.bumpMap.repeat.set(6, 1.4)
    tex.ground.map.repeat.set(11, 11)
    tex.ground.bumpMap.repeat.set(11, 11)
    const stumpBarkMap = tex.bark.map.clone()
    const stumpBarkBump = tex.bark.bumpMap.clone()
    stumpBarkMap.repeat.set(18, 2.8)
    stumpBarkBump.repeat.set(18, 2.8)
    stumpBarkMap.needsUpdate = true
    stumpBarkBump.needsUpdate = true
    return {
      bark: new THREE.MeshStandardMaterial({
        map: stumpBarkMap,
        bumpMap: stumpBarkBump,
        bumpScale: 2.2,
        roughness: 0.95,
      }),
      groundMat: new THREE.MeshStandardMaterial({
        map: tex.ground.map,
        bumpMap: tex.ground.bumpMap,
        bumpScale: 0.5,
        roughness: 0.9,
      }),
      trunk: new THREE.MeshStandardMaterial({ map: tex.bark.map, bumpMap: tex.bark.bumpMap, bumpScale: 1.5, roughness: 1 }),
      weirbark: new THREE.MeshStandardMaterial({ color: '#ddd2c2', roughness: 0.85 }),
      foliage: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, vertexColors: true }),
      grass: new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }),
      leafLitter: new THREE.MeshStandardMaterial({ roughness: 1, side: THREE.DoubleSide }),
      rock: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, vertexColors: true }),
      iron: new THREE.MeshStandardMaterial({ color: '#2a2c30', metalness: 0.7, roughness: 0.5 }),
    }
  }, [tex])

  const groundGeo = useMemo(() => {
    const geo = new THREE.PlaneGeometry(220, 220, 80, 80)
    const pos = geo.getAttribute('position')
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const dist = Math.sqrt(x * x + y * y)
      const ramp = THREE.MathUtils.smoothstep(dist, 25, 80)
      pos.setZ(i, (fbm(x * 0.04, y * 0.04, 17, 3) - 0.45) * 7 * ramp)
    }
    pos.needsUpdate = true
    geo.computeVertexNormals()
    return geo
  }, [])

  const trees = useMemo(() => {
    const rnd = mulberry32(1307)
    const tones = ['#1b2c21', '#22362a', '#16241c']
    const list = []
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2 + rnd() * 0.4
      const r = 25 + rnd() * 32
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (z > 20 && Math.abs(x) < 11) continue // keep the default view corridor open
      if (Math.hypot(x + 16, z + 9) < 9) continue // clearing for the weirwood
      list.push({ x, z, s: 0.9 + rnd() * 1.1, ry: rnd() * Math.PI * 2, tone: tones[(rnd() * 3) | 0], snowAmt: 0.7 + rnd() * 0.5 })
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rnd()
      const r = 62 + rnd() * 22
      list.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, s: 1.3 + rnd(), ry: rnd(), tone: '#141f18', snowAmt: 0.5 })
    }
    return list
  }, [])

  const rocks = useMemo(() => {
    const rnd = mulberry32(555)
    return Array.from({ length: 12 }, (_, i) => ({
      geo: blobGeometry(0.8, 2, i + 40, 0.5, { shade: 0.35, color: '#5d6258', snowAmt: 1.1 }),
      x: Math.cos(rnd() * Math.PI * 2) * (9 + rnd() * 18),
      z: Math.sin(rnd() * Math.PI * 2) * (9 + rnd() * 18),
      s: 0.5 + rnd() * 1.3,
      ry: rnd() * Math.PI,
    }))
  }, [])

  return (
    <group>
      <mesh geometry={groundGeo} rotation-x={-Math.PI / 2} position={[0, GROUND_Y, 0]} material={mats.groundMat} receiveShadow />

      <Stump mats={mats} rings={tex.rings} />

      {trees.map((t, i) => (
        <Conifer key={i} {...t} mats={mats} />
      ))}

      <Weirwood position={[-16, GROUND_Y, -9]} scale={1.45} mats={mats} />

      {/* Stark banners behind the ice pieces, Targaryen behind the dragonglass */}
      <Banner position={[-9.5, GROUND_Y, 15]} rotationY={0.4} texture={tex.stark} mats={mats} />
      <Banner position={[9.5, GROUND_Y, 15.5]} rotationY={-0.4} texture={tex.stark} mats={mats} />
      <Banner position={[-8.5, GROUND_Y, -14.5]} rotationY={-0.35} texture={tex.targ} mats={mats} />
      <Banner position={[9, GROUND_Y, -14]} rotationY={0.35} texture={tex.targ} mats={mats} />

      <GrassField material={mats.grass} />
      <FallenLeaves material={mats.leafLitter} />

      {rocks.map((r, i) => (
        <mesh
          key={i}
          geometry={r.geo}
          position={[r.x, GROUND_Y + r.s * 0.35, r.z]}
          rotation-y={r.ry}
          scale={[r.s, r.s * 0.7, r.s]}
          material={mats.rock}
          castShadow
          receiveShadow
        />
      ))}

      <LightShafts />
      <Snowfall />
    </group>
  )
})
