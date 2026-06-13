import { useMemo, useRef, useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import {
  OrbitControls,
  Environment,
  Lightformer,
  ContactShadows,
  SoftShadows,
} from '@react-three/drei'
import * as THREE from 'three'
import { Chess } from 'chess.js'
import { Piece, squareToPos } from './Pieces.jsx'
import { ForestScene } from './scene.jsx'
import { makeBoardTexture, makeFrameTexture } from './textures.js'
import './App.css'

function initialPieces(chess) {
  const pieces = []
  for (const row of chess.board()) {
    for (const cell of row) {
      if (cell) pieces.push({ id: cell.square, type: cell.type, color: cell.color, square: cell.square })
    }
  }
  return pieces
}

// Mirror a chess.js move result onto our stable-id piece list (drives animation)
function applyMove(pieces, mv) {
  let next = pieces
  if (mv.captured) {
    const capSq = mv.flags.includes('e') ? mv.to[0] + mv.from[1] : mv.to
    next = next.filter((p) => p.square !== capSq)
  }
  next = next.map((p) =>
    p.square === mv.from ? { ...p, square: mv.to, type: mv.promotion || p.type } : p
  )
  if (mv.flags.includes('k') || mv.flags.includes('q')) {
    const rank = mv.color === 'w' ? '1' : '8'
    const [rookFrom, rookTo] = mv.flags.includes('k') ? ['h' + rank, 'f' + rank] : ['a' + rank, 'd' + rank]
    next = next.map((p) => (p.square === rookFrom ? { ...p, square: rookTo } : p))
  }
  return next
}

function Board({ onSquareClick }) {
  const boardTex = useMemo(() => makeBoardTexture(), [])
  const frameTex = useMemo(() => makeFrameTexture(), [])

  const handleDown = (e) => {
    e.stopPropagation()
    const file = Math.round(e.point.x + 3.5)
    const rank = Math.round(3.5 - e.point.z)
    if (file < 0 || file > 7 || rank < 0 || rank > 7) return
    onSquareClick(String.fromCharCode(97 + file) + (rank + 1))
  }

  return (
    <group>
      {/* playing surface */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]} onPointerDown={handleDown} receiveShadow>
        <planeGeometry args={[8, 8]} />
        <meshPhysicalMaterial
          map={boardTex}
          roughness={0.35}
          clearcoat={0.9}
          clearcoatRoughness={0.25}
          reflectivity={0.6}
        />
      </mesh>
      {/* frame */}
      <mesh position={[0, -0.26, 0]} castShadow receiveShadow>
        <boxGeometry args={[9.2, 0.52, 9.2]} />
        <meshPhysicalMaterial map={frameTex} roughness={0.4} clearcoat={0.7} clearcoatRoughness={0.3} />
      </mesh>
    </group>
  )
}

function MoveTarget({ square, capture }) {
  const [x, , z] = squareToPos(square)
  return (
    <mesh rotation-x={-Math.PI / 2} position={[x, 0.012, z]}>
      {capture ? <ringGeometry args={[0.3, 0.42, 48]} /> : <circleGeometry args={[0.16, 48]} />}
      <meshBasicMaterial color={capture ? '#e06060' : '#7dd87d'} transparent opacity={0.55} depthWrite={false} />
    </mesh>
  )
}

function SquareGlow({ square, color = '#7dd87d', opacity = 0.35 }) {
  const [x, , z] = squareToPos(square)
  return (
    <mesh rotation-x={-Math.PI / 2} position={[x, 0.008, z]}>
      <planeGeometry args={[0.96, 0.96]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}

export default function App() {
  const chessRef = useRef(new Chess())
  const [pieces, setPieces] = useState(() => initialPieces(chessRef.current))
  const [selected, setSelected] = useState(null)
  const [targets, setTargets] = useState([])
  const [lastMove, setLastMove] = useState(null)
  const [started, setStarted] = useState(false)

  const materials = useMemo(
    () => ({
      // House Stark: carved ice
      white: new THREE.MeshPhysicalMaterial({
        color: '#dde9f0',
        roughness: 0.16,
        clearcoat: 1,
        clearcoatRoughness: 0.1,
        sheen: 0.5,
        sheenColor: new THREE.Color('#cfe4ff'),
      }),
      // House Targaryen: dragonglass with an ember sheen
      black: new THREE.MeshPhysicalMaterial({
        color: '#16151b',
        roughness: 0.18,
        clearcoat: 1,
        clearcoatRoughness: 0.07,
        sheen: 0.25,
        sheenColor: new THREE.Color('#8a2c20'),
      }),
      feltW: new THREE.MeshStandardMaterial({ color: '#39424a', roughness: 1 }),
      feltB: new THREE.MeshStandardMaterial({ color: '#451212', roughness: 1 }),
    }),
    []
  )

  const chess = chessRef.current
  const gameOver = chess.isGameOver()

  const handleSquareClick = useCallback(
    (square) => {
      const game = chessRef.current
      if (!started || game.isGameOver()) return
      if (selected) {
        const mv = targets.find((m) => m.to === square)
        if (mv) {
          const res = game.move({ from: selected, to: square, promotion: 'q' })
          setPieces((p) => applyMove(p, res))
          setLastMove({ from: res.from, to: res.to })
          setSelected(null)
          setTargets([])
          return
        }
      }
      const piece = game.get(square)
      if (piece && piece.color === game.turn() && square !== selected) {
        setSelected(square)
        setTargets(game.moves({ square, verbose: true }))
      } else {
        setSelected(null)
        setTargets([])
      }
    },
    [started, selected, targets]
  )

  const handleReset = () => {
    chessRef.current.reset()
    setPieces(initialPieces(chessRef.current))
    setSelected(null)
    setTargets([])
    setLastMove(null)
    setStarted(false)
  }

  const house = (c) => (c === 'w' ? 'House Stark' : 'House Targaryen')
  let status
  if (!started) status = 'Winter is coming — press Play'
  else if (chess.isCheckmate()) status = `Checkmate — ${house(chess.turn() === 'w' ? 'b' : 'w')} claims the Iron Throne!`
  else if (chess.isStalemate()) status = 'Stalemate — the realm holds its breath'
  else if (chess.isDraw()) status = 'Draw — ice and fire stand even'
  else status = `${house(chess.turn())} to move${chess.isCheck() ? ' — check upon the king!' : ''}`

  const checkedKingSquare =
    started && !gameOver && chess.isCheck()
      ? pieces.find((p) => p.type === 'k' && p.color === chess.turn())?.square
      : null

  return (
    <div className="app">
      <Canvas shadows camera={{ position: [3.5, 9.5, 14], fov: 42 }} dpr={[1, 2]}>
        <color attach="background" args={['#4d5a64']} />
        <fog attach="fog" args={['#4d5a64', 24, 70]} />
        <SoftShadows size={22} samples={16} focus={0.7} />

        <hemisphereLight args={['#d4dfe8', '#4a4640', 0.55]} />
        <directionalLight
          position={[14, 20, 6]}
          intensity={2.0}
          color="#e9f0f8"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-22}
          shadow-camera-right={22}
          shadow-camera-top={22}
          shadow-camera-bottom={-22}
          shadow-camera-far={80}
          shadow-bias={-0.0005}
        />
        <directionalLight position={[-10, 6, -5]} intensity={0.45} color="#9fb6cc" />

        {/* local winter-sky environment for reflections — no network needed */}
        <Environment resolution={256} frames={1}>
          <Lightformer intensity={2.6} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 12, 1]} color="#eaf1f8" />
          <Lightformer intensity={1.4} position={[-7, 3, 4]} target={[0, 0, 0]} scale={[3, 8, 1]} color="#dce8f2" />
          <Lightformer intensity={1.0} position={[7, 3, -4]} target={[0, 0, 0]} scale={[3, 8, 1]} color="#b8c8d8" />
          <Lightformer intensity={0.7} position={[0, 2, -9]} target={[0, 0, 0]} scale={[10, 3, 1]} color="#c8d4de" />
        </Environment>

        <Board onSquareClick={handleSquareClick} />

        {selected && <SquareGlow square={selected} />}
        {lastMove && <SquareGlow square={lastMove.from} color="#d8c46a" opacity={0.2} />}
        {lastMove && <SquareGlow square={lastMove.to} color="#d8c46a" opacity={0.28} />}
        {checkedKingSquare && <SquareGlow square={checkedKingSquare} color="#e04040" opacity={0.45} />}
        {targets.map((m) => (
          <MoveTarget key={m.to + m.san} square={m.to} capture={!!m.captured} />
        ))}

        {pieces.map((p) => (
          <Piece
            key={p.id}
            piece={p}
            materials={materials}
            onSquareClick={handleSquareClick}
            interactive={started && !gameOver && p.color === chess.turn()}
          />
        ))}

        <ContactShadows position={[0, 0.012, 0]} scale={9.5} blur={2.2} opacity={0.5} far={2.5} resolution={1024} />

        <ForestScene />

        <OrbitControls
          enablePan={false}
          minDistance={6}
          maxDistance={34}
          minPolarAngle={0.15}
          maxPolarAngle={1.45}
          target={[0, 0, 0]}
        />
      </Canvas>

      <div className="overlay">
        <h1>A Game of Thrones</h1>
        <div className="subtitle">Stark&ensp;⚔&ensp;Targaryen</div>
        <div className={`status${checkedKingSquare ? ' check' : ''}`}>{status}</div>
        <div className="buttons">
          <button className="play" onClick={() => setStarted(true)} disabled={started}>
            {started ? 'The game is afoot…' : '⚔ Play'}
          </button>
          <button className="reset" onClick={handleReset}>
            ⟲ Reset
          </button>
        </div>
        <div className="hint">
          Click a piece, then a highlighted square. Pawns auto-promote to queens.
          <br />
          Drag to orbit · scroll to zoom.
        </div>
      </div>
    </div>
  )
}
