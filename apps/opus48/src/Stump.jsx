import React, { useMemo } from 'react'
import * as THREE from 'three'

// Forest floor height (top of the stump sits just under the board frame).
export const GROUND_Y = -2.4
const TOP_Y = -0.5

function makeWoodTopTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 2048
  const ctx = c.getContext('2d')
  const cx = 1024, cy = 1024
  // warm heartwood -> paler sapwood gradient
  const g = ctx.createRadialGradient(cx, cy, 40, cx, cy, 1024)
  g.addColorStop(0, '#9a6c39')
  g.addColorStop(0.7, '#b78a4f')
  g.addColorStop(1, '#caa066')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 2048, 2048)
  // concentric growth rings, slightly eccentric & wobbly
  let r = 1010
  while (r > 6) {
    const s = 70 + Math.random() * 80
    ctx.beginPath()
    ctx.strokeStyle = `rgba(${s + 45},${s + 5},${s - 30},${0.55 + Math.random() * 0.4})`
    ctx.lineWidth = 1 + Math.random() * 3.5
    const wob = 14
    ctx.ellipse(cx + (Math.random() * wob - wob / 2), cy + (Math.random() * wob - wob / 2),
      r, r * (0.93 + Math.random() * 0.13), Math.random() * 0.5, 0, Math.PI * 2)
    ctx.stroke()
    r -= 4 + Math.random() * 11
  }
  // radial cracks splitting from the centre
  for (let i = 0; i < 9; i++) {
    const a = Math.random() * Math.PI * 2
    let x = cx, y = cy
    ctx.beginPath()
    ctx.strokeStyle = 'rgba(35,20,8,0.7)'
    ctx.lineWidth = 2 + Math.random() * 6
    ctx.moveTo(x, y)
    const steps = 30
    for (let k = 0; k < steps; k++) {
      x += Math.cos(a) * 34 + (Math.random() * 18 - 9)
      y += Math.sin(a) * 34 + (Math.random() * 18 - 9)
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 16
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function makeBarkTexture() {
  const c = document.createElement('canvas')
  c.width = 1024; c.height = 1024
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#321f10'
  ctx.fillRect(0, 0, 1024, 1024)
  // long vertical bark ridges
  for (let i = 0; i < 520; i++) {
    const x = Math.random() * 1024
    const w = 4 + Math.random() * 18
    const h = 60 + Math.random() * 360
    const y = Math.random() * 1024
    const v = 18 + Math.random() * 55
    ctx.fillStyle = `rgb(${v + 28},${v + 12},${v - 4})`
    ctx.fillRect(x, y, w, h)
    // dark fissure beside each ridge
    ctx.fillStyle = 'rgba(0,0,0,0.35)'
    ctx.fillRect(x + w, y, 2 + Math.random() * 3, h)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(9, 2)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export default function Stump() {
  const topTex = useMemo(makeWoodTopTexture, [])
  const barkTex = useMemo(makeBarkTexture, [])

  const height = TOP_Y - GROUND_Y
  const centerY = (TOP_Y + GROUND_Y) / 2

  const sideMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: barkTex, bumpMap: barkTex, bumpScale: 0.07,
    color: '#6f4d2d', roughness: 1, metalness: 0,
  }), [barkTex])
  const topMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: topTex, bumpMap: topTex, bumpScale: 0.015, roughness: 0.72, metalness: 0,
  }), [topTex])
  const mossMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#42612a', roughness: 1,
  }), [])
  const snowMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#eef4fb', roughness: 0.8 }), [])
  const capMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#b8552f', roughness: 0.6 }), [])
  const stemMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e8ddc4', roughness: 0.8 }), [])

  const roots = useMemo(() => Array.from({ length: 10 }).map((_, i) => {
    const a = (i / 10) * Math.PI * 2 + 0.3
    return { a, x: Math.cos(a) * 7.0, z: Math.sin(a) * 7.0, s: 0.7 + (i % 3) * 0.28 }
  }), [])

  const mushrooms = useMemo(() => Array.from({ length: 6 }).map((_, i) => {
    const a = (i / 6) * Math.PI * 2 + 1.1
    const rr = 7.4
    return { x: Math.cos(a) * rr, z: Math.sin(a) * rr, s: 0.5 + (i % 3) * 0.3 }
  }), [])

  return (
    <group>
      {/* trunk side */}
      <mesh position={[0, centerY, 0]} castShadow receiveShadow material={sideMat}>
        <cylinderGeometry args={[7.2, 8.0, height, 80, 1, true]} />
      </mesh>
      {/* cut top with rings */}
      <mesh position={[0, TOP_Y + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow material={topMat}>
        <circleGeometry args={[7.2, 80]} />
      </mesh>
      {/* under-cap */}
      <mesh position={[0, GROUND_Y, 0]} rotation={[Math.PI / 2, 0, 0]} material={sideMat}>
        <circleGeometry args={[8.0, 80]} />
      </mesh>

      {/* root flares */}
      {roots.map((r, i) => (
        <mesh key={i} position={[r.x, GROUND_Y + 0.1, r.z]} rotation={[0, -r.a, 0.4]} castShadow receiveShadow material={sideMat}>
          <coneGeometry args={[0.95 * r.s, 2.0, 8]} />
        </mesh>
      ))}

      {/* moss patches on the rim */}
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 + 0.5
        const rr = 6.4 + (i % 3) * 0.35
        return (
          <mesh key={'m' + i} position={[Math.cos(a) * rr, TOP_Y + 0.03, Math.sin(a) * rr]} scale={[0.6 + (i % 4) * 0.22, 0.14, 0.5 + (i % 3) * 0.22]} material={mossMat}>
            <sphereGeometry args={[0.5, 12, 8]} />
          </mesh>
        )
      })}

      {/* snow dusting drifted around the rim */}
      {Array.from({ length: 22 }).map((_, i) => {
        const a = (i / 22) * Math.PI * 2 + 0.2
        const rr = 6.7 + (i % 4) * 0.22
        return (
          <mesh key={'s' + i} position={[Math.cos(a) * rr, TOP_Y + 0.05, Math.sin(a) * rr]} scale={[0.7 + (i % 5) * 0.25, 0.16, 0.6 + (i % 3) * 0.25]} material={snowMat}>
            <sphereGeometry args={[0.5, 12, 8]} />
          </mesh>
        )
      })}
      {/* snow piled at the base */}
      {Array.from({ length: 16 }).map((_, i) => {
        const a = (i / 16) * Math.PI * 2 + 0.9
        return (
          <mesh key={'sb' + i} position={[Math.cos(a) * 7.6, GROUND_Y + 0.25, Math.sin(a) * 7.6]} scale={[1.4 + (i % 3) * 0.5, 0.5, 1.2]} material={snowMat}>
            <sphereGeometry args={[0.6, 12, 8]} />
          </mesh>
        )
      })}

      {/* clustered mushrooms at the base / rim */}
      {mushrooms.map((mu, i) => (
        <group key={'mu' + i} position={[mu.x, GROUND_Y + 0.05, mu.z]} scale={mu.s}>
          <mesh material={stemMat} position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.12, 0.45, 10]} />
          </mesh>
          <mesh material={capMat} position={[0, 0.46, 0]} castShadow>
            <sphereGeometry args={[0.26, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}
