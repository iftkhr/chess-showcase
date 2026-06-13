import React, { useRef, useState, useCallback, useMemo } from 'react'
import * as THREE from 'three'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, SoftShadows, Sparkles } from '@react-three/drei'
import { EffectComposer, SSAO, Bloom, Vignette, SMAA } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import { Chess } from 'chess.js'
import Board, { squareToPos, FILES } from './Board.jsx'
import Piece from './Pieces.jsx'
import Stump, { GROUND_Y } from './Stump.jsx'
import Forest from './Forest.jsx'
import Banners from './Banners.jsx'

function Lights() {
  return (
    <>
      <ambientLight intensity={0.26} color="#9fb6d0" />
      <hemisphereLight args={['#acc6e8', '#10161f', 0.55]} />
      {/* pale cold sun / moonlight over the snow */}
      <directionalLight
        position={[14, 20, 10]}
        intensity={2.3}
        color="#dbe8ff"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={1}
        shadow-camera-far={70}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-bias={-0.0003}
      />
      <directionalLight position={[-12, 9, -8]} intensity={0.4} color="#6f8fc0" />
      {/* warm brazier glow over the board, and an ember glow from the heart tree */}
      <spotLight position={[0, 11, 0]} angle={0.7} penumbra={0.9} intensity={1.2} color="#ffdca6" distance={24} />
      <pointLight position={[-9, 2, -16]} intensity={1.4} color="#b3160c" distance={26} />
    </>
  )
}

function Scene({ boardArray, selected, legalTargets, lastMove, onSquareClick }) {
  return (
    <>
      <color attach="background" args={['#0a1018']} />
      <fog attach="fog" args={['#101a28', 28, 76]} />
      <Lights />
      <Environment preset="night" />
      <SoftShadows size={28} samples={14} focus={0.9} />

      {/* environment */}
      <Forest />
      <Stump />
      <Banners />

      {/* falling snow */}
      <Sparkles count={300} scale={[44, 18, 44]} position={[0, 7, 0]} size={4} speed={0.5} opacity={0.8} color="#eaf2ff" />
      <Sparkles count={120} scale={[30, 12, 30]} position={[0, 5, 0]} size={2} speed={0.25} opacity={0.5} color="#ffffff" />

      <group position={[0, 0, 0]}>
        <Board
          selected={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          onSquareClick={onSquareClick}
        />

        {boardArray.map((row, rIdx) =>
          row.map((cell, fIdx) => {
            if (!cell) return null
            const rank = 8 - rIdx
            const file = fIdx
            const [x, , z] = squareToPos(file, rank)
            const sq = FILES[file] + rank
            const raised = selected === sq ? 0.25 : 0
            return (
              <group
                key={sq}
                onClick={(e) => { e.stopPropagation(); onSquareClick(sq) }}
                onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
                onPointerOut={() => { document.body.style.cursor = 'default' }}
              >
                <Piece
                  type={cell.type}
                  color={cell.color}
                  position={[x, raised, z]}
                  rotation={[0, cell.color === 'b' ? Math.PI : 0, 0]}
                />
              </group>
            )
          })
        )}
      </group>

      <ContactShadows position={[0, -0.01, 0]} opacity={0.5} scale={16} blur={2.2} far={6} resolution={1024} color="#000000" />

      <OrbitControls
        enablePan={false}
        minDistance={10}
        maxDistance={42}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0, 0]}
      />

      <EffectComposer multisampling={0} enableNormalPass>
        <SSAO blendFunction={BlendFunction.MULTIPLY} samples={24} radius={0.12} intensity={26} luminanceInfluence={0.6} color="black" />
        <Bloom luminanceThreshold={0.7} luminanceSmoothing={0.3} intensity={0.5} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.75} />
        <SMAA />
      </EffectComposer>
    </>
  )
}

export default function App() {
  const gameRef = useRef(new Chess())
  const [, force] = useState(0)
  const rerender = useCallback(() => force((n) => n + 1), [])

  const [started, setStarted] = useState(false)
  const [selected, setSelected] = useState(null)
  const [legalTargets, setLegalTargets] = useState([])
  const [lastMove, setLastMove] = useState(null)

  const game = gameRef.current
  const boardArray = game.board()
  const turn = game.turn()

  const HOUSE = { w: 'House Stark (Ice)', b: 'House Targaryen (Fire)' }

  const status = useMemo(() => {
    if (game.isCheckmate()) return `Checkmate — ${HOUSE[turn === 'w' ? 'b' : 'w']} claims the Iron Throne!`
    if (game.isStalemate()) return 'Stalemate — an uneasy peace'
    if (game.isInsufficientMaterial()) return 'A draw — neither host can win'
    if (game.isThreefoldRepetition()) return 'A draw — the war grinds on'
    if (game.isDraw()) return 'A draw is called'
    return game.inCheck()
      ? `${HOUSE[turn]} — the King is besieged!`
      : `${HOUSE[turn]} to march`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardArray, turn])

  const clearSelection = () => { setSelected(null); setLegalTargets([]) }

  const handleSquareClick = useCallback((sq) => {
    if (!started || game.isGameOver()) return

    // Clicking a legal destination -> make the move
    if (selected && legalTargets.includes(sq)) {
      const moves = game.moves({ square: selected, verbose: true })
      const target = moves.find((m) => m.to === sq)
      const isPromotion = target && target.promotion
      game.move({ from: selected, to: sq, promotion: isPromotion ? 'q' : undefined })
      setLastMove({ from: selected, to: sq })
      clearSelection()
      rerender()
      return
    }

    // Selecting one of your own pieces
    const piece = game.get(sq)
    if (piece && piece.color === game.turn()) {
      setSelected(sq)
      setLegalTargets(game.moves({ square: sq, verbose: true }).map((m) => m.to))
    } else {
      clearSelection()
    }
  }, [started, selected, legalTargets, game, rerender])

  const newGame = () => {
    gameRef.current = new Chess()
    setStarted(true)
    setLastMove(null)
    clearSelection()
    rerender()
  }

  const reset = () => {
    gameRef.current = new Chess()
    setStarted(false)
    setLastMove(null)
    clearSelection()
    rerender()
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 14, 20], fov: 42 }}
        gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      >
        <Scene
          boardArray={boardArray}
          selected={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          onSquareClick={handleSquareClick}
        />
      </Canvas>

      {/* HUD */}
      <div style={hud.bar}>
        <div style={hud.brand}>
          <div style={hud.title}>A Song of Ice &amp; Fire</div>
          <div style={hud.subtitle}>Chess of the Seven Kingdoms</div>
        </div>
        <div style={hud.status}>{started ? status : 'The board is set — let the game of thrones begin'}</div>
        <div style={{ flex: 1 }} />
        <button style={{ ...hud.btn, ...hud.play }} onClick={newGame}>
          {started ? '↻ New War' : '⚔ Begin'}
        </button>
        <button style={{ ...hud.btn, ...hud.reset }} onClick={reset}>
          ⚑ Yield
        </button>
      </div>

      {!started && (
        <div style={hud.overlay}>
          <div style={hud.card}>
            <div style={{ fontSize: 40, marginBottom: 4, letterSpacing: 8 }}>❄&nbsp;♔&nbsp;🔥</div>
            <div style={hud.cardKicker}>— The Great Game —</div>
            <h1 style={hud.cardTitle}>A Song of Ice &amp; Fire</h1>
            <p style={hud.cardText}>
              <b style={{ color: '#bcd6ef' }}>House Stark</b> of Ice marches against the dragonfire of
              <b style={{ color: '#e08a3c' }}> House Targaryen</b>. Two players, one Iron Throne.
              <br />Drag to survey the godswood · scroll to draw near.
            </p>
            <button style={{ ...hud.btn, ...hud.play, fontSize: 18, padding: '13px 34px' }} onClick={newGame}>
              ⚔ Begin the War
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const SERIF = "'Cinzel', Georgia, serif"

const hud = {
  bar: {
    position: 'absolute', top: 0, left: 0, right: 0, minHeight: 68,
    display: 'flex', alignItems: 'center', gap: 16, padding: '8px 22px',
    background: 'linear-gradient(180deg, rgba(6,9,14,0.94), rgba(6,9,14,0))',
    color: '#e8dcc0', zIndex: 10, pointerEvents: 'none', fontFamily: SERIF,
  },
  brand: { pointerEvents: 'auto', lineHeight: 1.1 },
  title: { fontSize: 21, fontWeight: 900, letterSpacing: 1.5, color: '#d9b24a', textShadow: '0 2px 8px rgba(0,0,0,0.7)' },
  subtitle: { fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', opacity: 0.7, marginTop: 2 },
  status: {
    fontSize: 15, pointerEvents: 'auto', padding: '7px 16px', marginLeft: 8,
    background: 'rgba(20,26,36,0.7)', border: '1px solid rgba(180,144,47,0.35)',
    borderRadius: 4, letterSpacing: 0.5, color: '#ecdfc4',
  },
  btn: {
    pointerEvents: 'auto', cursor: 'pointer', borderRadius: 4,
    padding: '11px 20px', fontSize: 14, fontWeight: 700, color: '#f4ead2',
    letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: SERIF,
    border: '1px solid rgba(180,144,47,0.6)', transition: 'transform 0.1s',
  },
  play: { background: 'linear-gradient(135deg, #1d2733, #2b3a4d)', boxShadow: '0 0 16px rgba(90,140,200,0.25)' },
  reset: { background: 'linear-gradient(135deg, #3a0f0c, #5e1712)', boxShadow: '0 0 16px rgba(200,60,40,0.2)' },
  overlay: {
    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'radial-gradient(circle at center, rgba(8,12,20,0.5), rgba(4,6,10,0.85))',
    backdropFilter: 'blur(4px)', zIndex: 20, fontFamily: SERIF,
  },
  card: {
    textAlign: 'center', color: '#e8dcc0', padding: '44px 48px', maxWidth: 460,
    background: 'linear-gradient(160deg, rgba(22,28,38,0.92), rgba(12,15,22,0.95))',
    border: '1px solid rgba(180,144,47,0.5)', borderRadius: 8,
    boxShadow: '0 24px 70px rgba(0,0,0,0.7), inset 0 0 60px rgba(180,144,47,0.05)',
  },
  cardKicker: { fontSize: 12, letterSpacing: 5, textTransform: 'uppercase', color: '#b8902f', marginBottom: 6 },
  cardTitle: { margin: '0 0 14px', fontSize: 30, fontWeight: 900, letterSpacing: 1.5, color: '#d9b24a' },
  cardText: { opacity: 0.85, margin: '0 0 24px', fontSize: 15, lineHeight: 1.6, fontFamily: "'EB Garamond', Georgia, serif" },
}
