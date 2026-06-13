import * as THREE from 'three'
import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'

const SEG = 64

function lathe(points) {
  const geo = new THREE.LatheGeometry(
    points.map(([x, y]) => new THREE.Vector2(x, y)),
    SEG
  )
  geo.computeVertexNormals()
  return geo
}

function knightHeadGeometry() {
  // Side silhouette of the horse head, facing +x
  const s = new THREE.Shape()
  s.moveTo(-0.16, 0.0)
  s.lineTo(0.16, 0.0)
  s.quadraticCurveTo(0.2, 0.18, 0.13, 0.32) // chest
  s.quadraticCurveTo(0.23, 0.34, 0.31, 0.43) // muzzle underside
  s.quadraticCurveTo(0.35, 0.48, 0.33, 0.53) // nose
  s.quadraticCurveTo(0.26, 0.57, 0.19, 0.56) // mouth to face
  s.quadraticCurveTo(0.16, 0.62, 0.12, 0.68) // forehead
  s.lineTo(0.07, 0.86) // front ear
  s.lineTo(0.02, 0.67) // notch between ears
  s.lineTo(-0.05, 0.83) // back ear
  s.quadraticCurveTo(-0.09, 0.66, -0.1, 0.55) // back of head
  s.quadraticCurveTo(-0.15, 0.35, -0.16, 0.0) // back of neck

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.17,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.035,
    bevelSegments: 4,
    curveSegments: 24,
  })
  geo.computeBoundingBox()
  const bb = geo.boundingBox
  geo.translate(0, 0, -(bb.min.z + bb.max.z) / 2)
  // taper the slab so the head narrows toward the top, like a carved piece
  const pos = geo.getAttribute('position')
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    const taper = 1 - Math.min(Math.max(y, 0), 0.9) * 0.45
    pos.setZ(i, pos.getZ(i) * taper)
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

function buildParts(type) {
  const parts = []
  const add = (geo, pos = [0, 0, 0], mat = 'body') => parts.push({ geo, pos, mat })
  const feltFor = (radius) =>
    add(new THREE.CylinderGeometry(radius + 0.004, radius + 0.004, 0.025, SEG), [0, 0.0125, 0], 'felt')

  switch (type) {
    case 'p': {
      feltFor(0.3)
      add(
        lathe([
          [0, 0.02], [0.3, 0.02], [0.32, 0.06], [0.29, 0.12], [0.21, 0.18],
          [0.15, 0.24], [0.12, 0.36], [0.11, 0.48], [0.13, 0.54], [0.2, 0.58],
          [0.2, 0.62], [0.12, 0.65], [0.14, 0.71], [0.155, 0.79], [0.12, 0.88],
          [0.06, 0.93], [0, 0.945],
        ])
      )
      break
    }
    case 'r': {
      feltFor(0.34)
      add(
        lathe([
          [0, 0.02], [0.34, 0.02], [0.36, 0.07], [0.32, 0.14], [0.25, 0.22],
          [0.225, 0.4], [0.21, 0.62], [0.215, 0.78], [0.27, 0.84], [0.285, 0.88],
          [0.285, 0.95], [0, 0.95],
        ])
      )
      // merlons (battlements) around the top rim
      const merlon = new THREE.BoxGeometry(0.13, 0.13, 0.09)
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        const part = { geo: merlon, pos: [Math.sin(a) * 0.21, 1.0, Math.cos(a) * 0.21], mat: 'body', rotY: a }
        parts.push(part)
      }
      break
    }
    case 'n': {
      feltFor(0.33)
      add(
        lathe([
          [0, 0.02], [0.33, 0.02], [0.35, 0.07], [0.31, 0.14], [0.24, 0.21],
          [0.215, 0.27], [0.245, 0.31], [0.25, 0.34], [0, 0.34],
        ])
      )
      add(knightHeadGeometry(), [0, 0.32, 0])
      break
    }
    case 'b': {
      feltFor(0.32)
      add(
        lathe([
          [0, 0.02], [0.32, 0.02], [0.34, 0.07], [0.3, 0.14], [0.22, 0.21],
          [0.16, 0.3], [0.12, 0.5], [0.1, 0.7], [0.16, 0.77], [0.165, 0.81],
          [0.1, 0.85], [0.145, 0.95], [0.13, 1.06], [0.07, 1.15], [0.025, 1.18],
          [0.05, 1.21], [0.045, 1.26], [0, 1.28],
        ])
      )
      break
    }
    case 'q': {
      feltFor(0.36)
      add(
        lathe([
          [0, 0.02], [0.36, 0.02], [0.38, 0.07], [0.34, 0.14], [0.26, 0.24],
          [0.18, 0.36], [0.13, 0.6], [0.115, 0.9], [0.16, 1.0], [0.17, 1.05],
          [0.11, 1.1], [0.2, 1.24], [0.215, 1.3], [0.12, 1.31], [0.1, 1.33],
          [0.07, 1.38], [0, 1.42],
        ])
      )
      // coronet pearls
      const pearl = new THREE.SphereGeometry(0.04, 20, 16)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2
        add(pearl, [Math.sin(a) * 0.185, 1.33, Math.cos(a) * 0.185])
      }
      break
    }
    case 'k': {
      feltFor(0.37)
      add(
        lathe([
          [0, 0.02], [0.37, 0.02], [0.39, 0.07], [0.35, 0.14], [0.27, 0.24],
          [0.19, 0.38], [0.14, 0.65], [0.125, 0.95], [0.17, 1.05], [0.18, 1.1],
          [0.12, 1.15], [0.22, 1.3], [0.23, 1.36], [0.15, 1.4], [0.06, 1.44], [0, 1.45],
        ])
      )
      add(new THREE.BoxGeometry(0.055, 0.26, 0.055), [0, 1.56, 0])
      add(new THREE.BoxGeometry(0.17, 0.055, 0.055), [0, 1.6, 0])
      break
    }
  }
  return parts
}

const partsCache = {}
function getParts(type) {
  if (!partsCache[type]) partsCache[type] = buildParts(type)
  return partsCache[type]
}

export function squareToPos(square) {
  const file = square.charCodeAt(0) - 97
  const rank = parseInt(square[1], 10) - 1
  return [file - 3.5, 0, 3.5 - rank]
}

const PIECE_SCALE = 0.95

export function Piece({ piece, materials, onSquareClick, interactive }) {
  const ref = useRef()
  const [hover, setHover] = useState(false)
  const parts = getParts(piece.type)
  const target = squareToPos(piece.square)
  // white knights face the black side, black knights face white
  const facing = piece.type === 'n' ? (piece.color === 'w' ? Math.PI / 2 : -Math.PI / 2) : 0

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    g.position.x = THREE.MathUtils.damp(g.position.x, target[0], 7, dt)
    g.position.z = THREE.MathUtils.damp(g.position.z, target[2], 7, dt)
    // gentle lift while travelling between squares
    const dist = Math.hypot(g.position.x - target[0], g.position.z - target[2])
    g.position.y = THREE.MathUtils.damp(g.position.y, Math.min(0.28, dist * 0.6), 9, dt)
    const s = (hover && interactive ? 1.05 : 1) * PIECE_SCALE
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, s, 12, dt))
  })

  return (
    <group
      ref={ref}
      position={target}
      scale={PIECE_SCALE}
      rotation-y={facing}
      onPointerDown={(e) => {
        e.stopPropagation()
        onSquareClick(piece.square)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (interactive) {
          setHover(true)
          document.body.style.cursor = 'pointer'
        }
      }}
      onPointerOut={() => {
        setHover(false)
        document.body.style.cursor = 'auto'
      }}
    >
      {parts.map((part, i) => (
        <mesh
          key={i}
          geometry={part.geo}
          position={part.pos}
          rotation-y={part.rotY || 0}
          material={
            part.mat === 'felt'
              ? piece.color === 'w'
                ? materials.feltW
                : materials.feltB
              : piece.color === 'w'
                ? materials.white
                : materials.black
          }
          castShadow
          receiveShadow
        />
      ))}
    </group>
  )
}
