import React, { useMemo } from 'react'
import * as THREE from 'three'

/*
 * Procedurally generated chess pieces.
 * Each piece is a lathe-turned body (like a real turned-wood/marble piece)
 * plus extra detail meshes (crenellations, crowns, crosses, knight head).
 * Profiles are arrays of [radius, height] revolved around the Y axis.
 */

const LATHE_SEGMENTS = 96

function lathe(profile) {
  const points = profile.map(([r, y]) => new THREE.Vector2(r, y))
  const geo = new THREE.LatheGeometry(points, LATHE_SEGMENTS)
  geo.computeVertexNormals()
  return geo
}

// ---- Profiles (radius, height), bottom -> top ----------------------------

const PAWN = [
  [0.0, 0.0], [0.30, 0.0], [0.30, 0.05], [0.27, 0.08], [0.20, 0.12],
  [0.15, 0.18], [0.135, 0.24], [0.175, 0.30], [0.20, 0.33], [0.175, 0.36],
  [0.12, 0.40], [0.115, 0.44],
  // spherical head
  [0.155, 0.48], [0.185, 0.53], [0.19, 0.58], [0.175, 0.63], [0.13, 0.68],
  [0.07, 0.71], [0.0, 0.725],
]

const ROOK = [
  [0.0, 0.0], [0.34, 0.0], [0.34, 0.06], [0.30, 0.10], [0.22, 0.16],
  [0.195, 0.26], [0.19, 0.42], [0.20, 0.56], [0.235, 0.66], [0.26, 0.70],
  [0.295, 0.74], [0.30, 0.82], [0.30, 0.86], [0.0, 0.86],
]

const BISHOP = [
  [0.0, 0.0], [0.32, 0.0], [0.32, 0.06], [0.28, 0.10], [0.19, 0.16],
  [0.155, 0.24], [0.16, 0.36], [0.135, 0.46], [0.205, 0.52], [0.235, 0.56],
  [0.20, 0.60], [0.135, 0.66],
  // bulbous mitre head
  [0.17, 0.72], [0.205, 0.80], [0.205, 0.90], [0.17, 0.98], [0.10, 1.04],
  [0.045, 1.07], [0.0, 1.08],
]

const QUEEN_BODY = [
  [0.0, 0.0], [0.37, 0.0], [0.37, 0.06], [0.32, 0.11], [0.22, 0.18],
  [0.175, 0.30], [0.165, 0.48], [0.17, 0.66], [0.135, 0.80], [0.215, 0.88],
  [0.25, 0.92], [0.275, 0.98], [0.27, 1.08], [0.245, 1.16], [0.30, 1.18],
  [0.31, 1.20],
]

const KING_BODY = [
  [0.0, 0.0], [0.38, 0.0], [0.38, 0.06], [0.33, 0.11], [0.23, 0.18],
  [0.18, 0.32], [0.17, 0.52], [0.175, 0.72], [0.14, 0.88], [0.22, 0.96],
  [0.255, 1.00], [0.28, 1.06], [0.275, 1.18], [0.25, 1.27], [0.31, 1.30],
  [0.305, 1.34],
]

// ---- Knight: extruded stylized horse-head silhouette ---------------------

function knightHeadGeometry() {
  const s = new THREE.Shape()
  // Traced stylized horse head, units roughly centred; scaled later.
  s.moveTo(-0.20, 0.00)
  s.lineTo(0.20, 0.00)
  s.lineTo(0.22, 0.10)
  s.lineTo(0.16, 0.20)
  s.lineTo(0.10, 0.30)
  s.lineTo(0.14, 0.42)
  s.lineTo(0.22, 0.52)
  s.lineTo(0.24, 0.64)   // back of neck
  s.lineTo(0.20, 0.76)
  s.lineTo(0.10, 0.86)
  s.lineTo(0.16, 0.90)   // ear
  s.lineTo(0.10, 0.96)
  s.lineTo(0.02, 0.94)
  s.lineTo(-0.06, 0.92)  // forehead
  s.lineTo(-0.18, 0.86)
  s.lineTo(-0.30, 0.80)  // muzzle top
  s.lineTo(-0.40, 0.74)
  s.lineTo(-0.44, 0.66)  // nose
  s.lineTo(-0.40, 0.60)
  s.lineTo(-0.28, 0.58)  // mouth
  s.lineTo(-0.20, 0.52)
  s.lineTo(-0.16, 0.40)  // jaw
  s.lineTo(-0.20, 0.26)
  s.lineTo(-0.24, 0.12)
  s.lineTo(-0.20, 0.00)

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: 0.26,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.045,
    bevelSegments: 4,
    curveSegments: 12,
  })
  geo.center()
  geo.computeVertexNormals()
  return geo
}

const KNIGHT_BASE = [
  [0.0, 0.0], [0.34, 0.0], [0.34, 0.06], [0.30, 0.10], [0.22, 0.16],
  [0.185, 0.24], [0.18, 0.34], [0.20, 0.40], [0.17, 0.44], [0.0, 0.44],
]

// ---- Cached geometries ---------------------------------------------------

const GEO = {
  pawn: lathe(PAWN),
  rook: lathe(ROOK),
  bishop: lathe(BISHOP),
  queen: lathe(QUEEN_BODY),
  king: lathe(KING_BODY),
  knightBase: lathe(KNIGHT_BASE),
  knightHead: knightHeadGeometry(),
  finial: new THREE.SphereGeometry(0.075, 32, 24),
  crenel: new THREE.BoxGeometry(0.11, 0.13, 0.11),
  spike: new THREE.ConeGeometry(0.045, 0.13, 16),
  crossBar: new THREE.BoxGeometry(0.05, 0.05, 0.05),
}

// ---- Materials -----------------------------------------------------------

function useMaterial(color) {
  return useMemo(() => {
    const isIce = color === 'w'
    // White = House Stark / Ice (frosted glacial crystal)
    // Black = House Targaryen / Fire (dragonglass with an ember glow)
    return new THREE.MeshPhysicalMaterial({
      color: isIce ? '#cfe2f0' : '#1b1216',
      roughness: isIce ? 0.18 : 0.22,
      metalness: isIce ? 0.0 : 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: isIce ? 0.12 : 0.2,
      reflectivity: isIce ? 0.6 : 0.55,
      transmission: isIce ? 0.18 : 0.0,
      thickness: isIce ? 1.2 : 0.0,
      ior: isIce ? 1.4 : 1.5,
      sheen: isIce ? 0.6 : 0.5,
      sheenColor: isIce ? '#bfe6ff' : '#b8862e',
      emissive: isIce ? '#1b3a55' : '#5e120a',
      emissiveIntensity: isIce ? 0.12 : 0.35,
      envMapIntensity: 1.2,
    })
  }, [color])
}

// ---- Piece component -----------------------------------------------------

export default function Piece({ type, color, ...props }) {
  const material = useMaterial(color)

  return (
    <group {...props} dispose={null}>
      {type === 'p' && (
        <mesh geometry={GEO.pawn} material={material} castShadow receiveShadow />
      )}

      {type === 'r' && (
        <group>
          <mesh geometry={GEO.rook} material={material} castShadow receiveShadow />
          {Array.from({ length: 6 }).map((_, i) => {
            const a = (i / 6) * Math.PI * 2
            return (
              <mesh
                key={i}
                geometry={GEO.crenel}
                material={material}
                position={[Math.cos(a) * 0.255, 0.90, Math.sin(a) * 0.255]}
                rotation={[0, -a, 0]}
                castShadow
                receiveShadow
              />
            )
          })}
        </group>
      )}

      {type === 'b' && (
        <group>
          <mesh geometry={GEO.bishop} material={material} castShadow receiveShadow />
          <mesh geometry={GEO.finial} material={material} position={[0, 1.14, 0]} scale={0.7} castShadow />
        </group>
      )}

      {type === 'n' && (
        <group>
          <mesh geometry={GEO.knightBase} material={material} castShadow receiveShadow />
          <mesh
            geometry={GEO.knightHead}
            material={material}
            position={[0.02, 0.74, 0]}
            scale={[0.62, 0.62, 0.62]}
            rotation={[0, Math.PI / 2, 0]}
            castShadow
            receiveShadow
          />
        </group>
      )}

      {type === 'q' && (
        <group>
          <mesh geometry={GEO.queen} material={material} castShadow receiveShadow />
          {/* coronet spikes */}
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i / 8) * Math.PI * 2
            return (
              <mesh
                key={i}
                geometry={GEO.spike}
                material={material}
                position={[Math.cos(a) * 0.235, 1.27, Math.sin(a) * 0.235]}
                castShadow
              />
            )
          })}
          <mesh geometry={GEO.finial} material={material} position={[0, 1.34, 0]} castShadow />
        </group>
      )}

      {type === 'k' && (
        <group>
          <mesh geometry={GEO.king} material={material} castShadow receiveShadow />
          {/* cross finial */}
          <mesh geometry={GEO.crossBar} material={material} position={[0, 1.40, 0]} scale={[1, 3.2, 1]} castShadow />
          <mesh geometry={GEO.crossBar} material={material} position={[0, 1.45, 0]} scale={[2.4, 1, 1]} castShadow />
        </group>
      )}
    </group>
  )
}
