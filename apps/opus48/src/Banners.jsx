import React, { useMemo } from 'react'
import * as THREE from 'three'
import { GROUND_Y } from './Stump.jsx'

// Draw a hanging house banner (cloth with forked bottom) onto a transparent canvas.
function makeBannerTexture(kind) {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 820
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, 512, 820)

  // cloth shape: rectangle with a forked (swallow-tail) bottom
  const W = 420, x0 = 46, y0 = 20
  const bottom = 720
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x0 + W, y0)
  ctx.lineTo(x0 + W, bottom)
  ctx.lineTo(x0 + W * 0.78, bottom - 70)
  ctx.lineTo(x0 + W * 0.5, bottom + 40)
  ctx.lineTo(x0 + W * 0.22, bottom - 70)
  ctx.lineTo(x0, bottom)
  ctx.closePath()

  const g = ctx.createLinearGradient(0, 0, 0, 820)
  if (kind === 'ice') {
    g.addColorStop(0, '#39434f'); g.addColorStop(1, '#222a33')
  } else {
    g.addColorStop(0, '#1a0606'); g.addColorStop(1, '#3a0a08')
  }
  ctx.fillStyle = g
  ctx.fill()

  // border
  ctx.lineWidth = 8
  ctx.strokeStyle = kind === 'ice' ? '#9fb4c7' : '#b8902f'
  ctx.stroke()

  const cx = 256
  if (kind === 'ice') {
    // crisp white ice crystal (six points)
    ctx.save()
    ctx.translate(cx, 320)
    ctx.strokeStyle = '#eaf3ff'
    ctx.lineWidth = 12
    ctx.lineCap = 'round'
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3)
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -120); ctx.stroke()
      // barbs
      ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(28, -98); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, -70); ctx.lineTo(-28, -98); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, -100); ctx.lineTo(20, -120); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, -100); ctx.lineTo(-20, -120); ctx.stroke()
    }
    ctx.restore()
  } else {
    // bold rising flame (red/orange/gold)
    const flame = (col, sc) => {
      ctx.fillStyle = col
      ctx.beginPath()
      ctx.moveTo(cx, 200)
      ctx.bezierCurveTo(cx + 90 * sc, 280, cx + 60 * sc, 360, cx + 30 * sc, 410)
      ctx.bezierCurveTo(cx + 70 * sc, 380, cx + 55 * sc, 300, cx, 340)
      ctx.bezierCurveTo(cx - 55 * sc, 300, cx - 70 * sc, 380, cx - 30 * sc, 410)
      ctx.bezierCurveTo(cx - 60 * sc, 360, cx - 90 * sc, 280, cx, 200)
      ctx.closePath(); ctx.fill()
    }
    flame('#a81d10', 1.0)
    flame('#e0641a', 0.66)
    flame('#f2c531', 0.34)
  }

  // house words
  ctx.fillStyle = kind === 'ice' ? '#dce8f3' : '#e8c463'
  ctx.font = 'bold 34px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText(kind === 'ice' ? 'WINTER IS' : 'FIRE AND', cx, 500)
  ctx.fillText(kind === 'ice' ? 'COMING' : 'BLOOD', cx, 540)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

const poleMat = new THREE.MeshStandardMaterial({ color: '#2b2620', roughness: 0.6, metalness: 0.4 })
const finialMat = new THREE.MeshStandardMaterial({ color: '#b8902f', roughness: 0.3, metalness: 0.9 })

function Banner({ kind, position, rotation }) {
  const tex = useMemo(() => makeBannerTexture(kind), [kind])
  const clothMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85,
  }), [tex])

  const poleH = 11
  return (
    <group position={position} rotation={rotation}>
      {/* pole */}
      <mesh position={[0, poleH / 2, 0]} material={poleMat} castShadow>
        <cylinderGeometry args={[0.12, 0.14, poleH, 12]} />
      </mesh>
      {/* finial */}
      <mesh position={[0, poleH + 0.2, 0]} material={finialMat} castShadow>
        <coneGeometry args={[0.22, 0.6, 12]} />
      </mesh>
      {/* crossbar */}
      <mesh position={[1.6, poleH - 0.6, 0]} rotation={[0, 0, Math.PI / 2]} material={poleMat} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 3.6, 10]} />
      </mesh>
      {/* cloth */}
      <mesh position={[1.6, poleH - 3.4, 0]} material={clothMat}>
        <planeGeometry args={[3.4, 5.4]} />
      </mesh>
    </group>
  )
}

export default function Banners() {
  return (
    <group>
      {/* House Stark — Ice, behind the white side */}
      <Banner kind="ice" position={[-12, GROUND_Y, 9]} rotation={[0, Math.PI * 0.78, 0]} />
      {/* House Targaryen — Fire, behind the black side */}
      <Banner kind="fire" position={[12, GROUND_Y, -9]} rotation={[0, -Math.PI * 0.22, 0]} />
    </group>
  )
}
