import React, { useMemo } from 'react'
import * as THREE from 'three'
import { RoundedBox, Text } from '@react-three/drei'

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

// Map a chess square (file 0-7, rank 1-8) to 3D world coordinates.
export function squareToPos(file, rank) {
  return [file - 3.5, 0, 4.5 - rank]
}

// Light = pale frost-stone (Ice), Dark = cold black iron (Fire/dragonglass)
const lightMat = new THREE.MeshPhysicalMaterial({
  color: '#c4d2dc', roughness: 0.35, metalness: 0.1, clearcoat: 0.7, clearcoatRoughness: 0.3, envMapIntensity: 1.0,
})
const darkMat = new THREE.MeshPhysicalMaterial({
  color: '#1a1c22', roughness: 0.3, metalness: 0.5, clearcoat: 0.7, clearcoatRoughness: 0.25, envMapIntensity: 1.0,
})
const frameMat = new THREE.MeshPhysicalMaterial({
  color: '#101216', roughness: 0.35, metalness: 0.7, clearcoat: 0.6, clearcoatRoughness: 0.3, envMapIntensity: 1.0,
})
const inlayMat = new THREE.MeshPhysicalMaterial({
  color: '#b8902f', roughness: 0.3, metalness: 0.95, clearcoat: 0.5, envMapIntensity: 1.2,
})

const squareGeo = new THREE.BoxGeometry(1, 0.2, 1)

export default function Board({ selected, legalTargets, lastMove, onSquareClick }) {
  const squares = useMemo(() => {
    const out = []
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r <= 8; r++) {
        const isLight = (f + r) % 2 === 0
        out.push({ f, r, isLight, sq: FILES[f] + r })
      }
    }
    return out
  }, [])

  const targetSet = useMemo(() => new Set(legalTargets), [legalTargets])

  return (
    <group>
      {/* Outer frame */}
      <RoundedBox args={[10, 0.5, 10]} radius={0.18} smoothness={6} position={[0, -0.26, 0]} castShadow receiveShadow material={frameMat} />
      {/* Inlay border */}
      <RoundedBox args={[8.5, 0.52, 8.5]} radius={0.04} smoothness={4} position={[0, -0.24, 0]} material={inlayMat} />

      {/* Squares */}
      {squares.map(({ f, r, isLight, sq }) => {
        const [x, , z] = squareToPos(f, r)
        const isSelected = selected === sq
        const isTarget = targetSet.has(sq)
        const isLast = lastMove && (lastMove.from === sq || lastMove.to === sq)
        return (
          <group key={sq}>
            <mesh
              geometry={squareGeo}
              material={isLight ? lightMat : darkMat}
              position={[x, -0.1, z]}
              receiveShadow
              onClick={(e) => { e.stopPropagation(); onSquareClick(sq) }}
              onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
              onPointerOut={() => { document.body.style.cursor = 'default' }}
            />
            {/* highlights */}
            {isSelected && (
              <mesh position={[x, 0.002, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color="#ffd34d" transparent opacity={0.45} />
              </mesh>
            )}
            {isLast && !isSelected && (
              <mesh position={[x, 0.001, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1, 1]} />
                <meshBasicMaterial color="#6cb6ff" transparent opacity={0.28} />
              </mesh>
            )}
            {isTarget && (
              <mesh position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.12, 0.2, 32]} />
                <meshBasicMaterial color="#39e07a" transparent opacity={0.85} />
              </mesh>
            )}
          </group>
        )
      })}

      {/* Coordinate labels on the frame */}
      {FILES.map((file, f) => (
        <Text key={'f' + file} position={[f - 3.5, 0.02, 4.55]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color="#d9b24a" anchorX="center" anchorY="middle">
          {file}
        </Text>
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <Text key={'r' + i} position={[-4.55, 0.02, 4.5 - (i + 1)]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.22} color="#d9b24a" anchorX="center" anchorY="middle">
          {i + 1}
        </Text>
      ))}
    </group>
  )
}
