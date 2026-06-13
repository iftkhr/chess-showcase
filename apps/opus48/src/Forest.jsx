import React, { useMemo } from 'react'
import * as THREE from 'three'
import { GROUND_Y } from './Stump.jsx'

// deterministic PRNG so the forest layout is stable across renders
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeSnowGroundTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 1024
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#dde6ef'
  ctx.fillRect(0, 0, 1024, 1024)
  // cold blue shadow drifts
  for (let i = 0; i < 140; i++) {
    ctx.fillStyle = `rgba(150,175,200,${0.1 + Math.random() * 0.25})`
    ctx.beginPath()
    ctx.ellipse(Math.random() * 1024, Math.random() * 1024, 20 + Math.random() * 80, 8 + Math.random() * 30, Math.random() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  // sparkle speckle
  for (let i = 0; i < 6000; i++) {
    const w = 200 + Math.random() * 55
    ctx.fillStyle = `rgb(${w},${w + 5},${Math.min(255, w + 15)})`
    ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 1 + Math.random() * 2, 1 + Math.random() * 2)
  }
  // a few blood-red weirwood leaves fallen on the snow
  for (let i = 0; i < 120; i++) {
    ctx.save()
    ctx.translate(Math.random() * 1024, Math.random() * 1024)
    ctx.rotate(Math.random() * Math.PI)
    ctx.fillStyle = ['#8c1c14', '#a82820', '#6e120c'][i % 3]
    ctx.beginPath()
    ctx.ellipse(0, 0, 3 + Math.random() * 4, 1.5 + Math.random() * 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(14, 14)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Carved weirwood heart-tree face (the iconic crying face of the old gods)
function makeWeirwoodFaceTexture() {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 768
  const ctx = c.getContext('2d')
  // pale bone-white bark with grey veins
  ctx.fillStyle = '#e9e6dc'
  ctx.fillRect(0, 0, 512, 768)
  for (let i = 0; i < 80; i++) {
    ctx.strokeStyle = `rgba(120,120,110,${0.1 + Math.random() * 0.2})`
    ctx.lineWidth = 1 + Math.random() * 2
    ctx.beginPath()
    const x = Math.random() * 512
    ctx.moveTo(x, 0)
    for (let y = 0; y < 768; y += 40) ctx.lineTo(x + (Math.random() * 30 - 15), y)
    ctx.stroke()
  }
  const cx = 256
  ctx.fillStyle = '#2a201a'
  // eyes (angry, slanted, carved hollows)
  ctx.beginPath(); ctx.moveTo(cx - 110, 300); ctx.lineTo(cx - 35, 320); ctx.lineTo(cx - 45, 360); ctx.lineTo(cx - 115, 345); ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.moveTo(cx + 110, 300); ctx.lineTo(cx + 35, 320); ctx.lineTo(cx + 45, 360); ctx.lineTo(cx + 115, 345); ctx.closePath(); ctx.fill()
  // brow ridges
  ctx.strokeStyle = '#3a2c22'; ctx.lineWidth = 10
  ctx.beginPath(); ctx.moveTo(cx - 120, 285); ctx.lineTo(cx - 30, 305); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + 120, 285); ctx.lineTo(cx + 30, 305); ctx.stroke()
  // long nose
  ctx.lineWidth = 14; ctx.strokeStyle = '#241b15'
  ctx.beginPath(); ctx.moveTo(cx, 330); ctx.lineTo(cx - 8, 470); ctx.stroke()
  // grim open mouth
  ctx.fillStyle = '#1d1510'
  ctx.beginPath(); ctx.ellipse(cx, 540, 70, 45, 0, 0, Math.PI * 2); ctx.fill()
  // bleeding red sap from the eyes and mouth
  ctx.strokeStyle = '#8a1109'; ctx.lineWidth = 7
  ;[[cx - 75, 360], [cx + 75, 360], [cx - 30, 580], [cx + 30, 580]].forEach(([sx, sy]) => {
    ctx.beginPath(); ctx.moveTo(sx, sy)
    let y = sy
    while (y < 740) { y += 30; ctx.lineTo(sx + (Math.random() * 12 - 6), y) }
    ctx.stroke()
  })
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const trunkMat = new THREE.MeshStandardMaterial({ color: '#3a2c20', roughness: 1 })
const weirwoodBarkMat = new THREE.MeshStandardMaterial({ color: '#e4e1d6', roughness: 0.9 })
const pineMats = [
  new THREE.MeshStandardMaterial({ color: '#1f3a2c', roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: '#26452f', roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: '#193023', roughness: 1 }),
]
const snowMat = new THREE.MeshStandardMaterial({ color: '#eef4fb', roughness: 0.85 })
const redLeafMats = [
  new THREE.MeshStandardMaterial({ color: '#8c1810', roughness: 0.85, emissive: '#3a0805', emissiveIntensity: 0.25 }),
  new THREE.MeshStandardMaterial({ color: '#a82820', roughness: 0.85, emissive: '#3a0805', emissiveIntensity: 0.25 }),
]
const snowRockMat = new THREE.MeshStandardMaterial({ color: '#aeb8c4', roughness: 0.9 })

const coneGeo = new THREE.ConeGeometry(1, 1, 9)
const trunkGeo = new THREE.CylinderGeometry(0.16, 0.3, 1, 8)
const rockGeo = new THREE.IcosahedronGeometry(1, 0)

// Snow-laden pine
function Pine({ position, scale, pine, seed }) {
  const h = 6 + (seed % 100) / 100 * 6
  const tilt = ((seed % 7) - 3) * 0.012
  return (
    <group position={position} scale={scale} rotation={[tilt, seed, tilt]}>
      <mesh geometry={trunkGeo} scale={[1, h * 0.5, 1]} position={[0, h * 0.25, 0]} material={trunkMat} castShadow />
      {[[0.5, 2.7, 0.55], [0.78, 2.1, 0.48], [1.02, 1.4, 0.42]].map(([hy, rw, hh], i) => (
        <group key={i}>
          <mesh geometry={coneGeo} material={pineMats[pine]} position={[0, h * hy, 0]} scale={[rw, h * hh, rw]} castShadow />
          {/* snow cap on each tier */}
          <mesh geometry={coneGeo} material={snowMat} position={[0, h * hy + h * hh * 0.32, 0]} scale={[rw * 0.82, h * hh * 0.5, rw * 0.82]} castShadow />
        </group>
      ))}
    </group>
  )
}

// Weirwood tree: white bark, blood-red canopy
function Weirwood({ position, scale, seed }) {
  const h = 7 + (seed % 100) / 100 * 4
  return (
    <group position={position} scale={scale} rotation={[0, seed, 0]}>
      <mesh geometry={trunkGeo} scale={[1.1, h * 0.5, 1.1]} position={[0, h * 0.25, 0]} material={weirwoodBarkMat} castShadow />
      {[[0.55, 2.6, 0.5], [0.82, 2.0, 0.45], [1.05, 1.3, 0.4]].map(([hy, rw, hh], i) => (
        <mesh key={i} geometry={coneGeo} material={redLeafMats[i % 2]} position={[0, h * hy, 0]} scale={[rw, h * hh, rw]} castShadow />
      ))}
    </group>
  )
}

// The great weirwood heart tree with a carved, weeping face
function HeartTree({ position }) {
  const faceTex = useMemo(makeWeirwoodFaceTexture, [])
  return (
    <group position={position}>
      <mesh position={[0, 7, 0]} material={weirwoodBarkMat} castShadow receiveShadow>
        <cylinderGeometry args={[1.3, 2.2, 14, 16]} />
      </mesh>
      {/* carved face on the trunk, facing the board */}
      <mesh position={[0, 6.6, 2.05]}>
        <planeGeometry args={[3.4, 5]} />
        <meshStandardMaterial map={faceTex} roughness={0.9} transparent />
      </mesh>
      {/* blood-red canopy */}
      {[[13, 5.5], [15.5, 4.2], [17.5, 2.8]].map(([hy, rw], i) => (
        <mesh key={i} geometry={coneGeo} material={redLeafMats[i % 2]} position={[0, hy, 0]} scale={[rw, 3.4, rw]} castShadow />
      ))}
      {/* twin gnarled roots */}
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[s * 1.6, 0.4, 1.2]} rotation={[0.5, 0, s * 0.3]} material={weirwoodBarkMat} castShadow>
          <cylinderGeometry args={[0.4, 0.6, 2.5, 10]} />
        </mesh>
      ))}
    </group>
  )
}

export default function Forest() {
  const groundTex = useMemo(makeSnowGroundTexture, [])
  const groundMat = useMemo(() => new THREE.MeshStandardMaterial({ map: groundTex, bumpMap: groundTex, bumpScale: 0.05, roughness: 0.95 }), [groundTex])

  const pines = useMemo(() => {
    const rnd = mulberry32(1337)
    const out = []
    for (let i = 0; i < 64; i++) {
      const a = rnd() * Math.PI * 2
      const rad = 15 + rnd() * 44
      out.push({ position: [Math.cos(a) * rad, GROUND_Y, Math.sin(a) * rad], scale: 0.85 + rnd() * 1.1, pine: Math.floor(rnd() * 3), seed: Math.floor(rnd() * 1000) })
    }
    return out
  }, [])

  const weirwoods = useMemo(() => {
    const rnd = mulberry32(404)
    return Array.from({ length: 7 }).map(() => {
      const a = rnd() * Math.PI * 2
      const rad = 17 + rnd() * 22
      return { position: [Math.cos(a) * rad, GROUND_Y, Math.sin(a) * rad], scale: 0.8 + rnd() * 0.6, seed: Math.floor(rnd() * 1000) }
    })
  }, [])

  const rocks = useMemo(() => {
    const rnd = mulberry32(99)
    return Array.from({ length: 18 }).map(() => {
      const a = rnd() * Math.PI * 2
      const rad = 10 + rnd() * 32
      return { position: [Math.cos(a) * rad, GROUND_Y + 0.1, Math.sin(a) * rad], scale: [0.6 + rnd() * 1.6, 0.5 + rnd() * 1.0, 0.6 + rnd() * 1.6], rot: rnd() * Math.PI }
    })
  }, [])

  const logs = useMemo(() => {
    const rnd = mulberry32(53)
    return Array.from({ length: 5 }).map(() => {
      const a = rnd() * Math.PI * 2
      const rad = 11 + rnd() * 16
      return { position: [Math.cos(a) * rad, GROUND_Y + 0.4, Math.sin(a) * rad], rot: rnd() * Math.PI, len: 4 + rnd() * 4 }
    })
  }, [])

  return (
    <group>
      {/* snow-covered forest floor */}
      <mesh position={[0, GROUND_Y - 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={groundMat}>
        <circleGeometry args={[80, 72]} />
      </mesh>

      {pines.map((t, i) => <Pine key={i} {...t} />)}
      {weirwoods.map((t, i) => <Weirwood key={'w' + i} {...t} />)}

      <HeartTree position={[-9, GROUND_Y, -19]} />

      {rocks.map((r, i) => (
        <mesh key={i} geometry={rockGeo} material={snowRockMat} position={r.position} scale={r.scale} rotation={[r.rot, r.rot * 1.3, 0]} castShadow receiveShadow />
      ))}

      {/* fallen snow-dusted logs */}
      {logs.map((l, i) => (
        <mesh key={'l' + i} position={l.position} rotation={[0, l.rot, Math.PI / 2]} material={trunkMat} castShadow receiveShadow>
          <cylinderGeometry args={[0.4, 0.5, l.len, 12]} />
        </mesh>
      ))}
    </group>
  )
}
