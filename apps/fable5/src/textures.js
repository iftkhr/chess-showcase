import * as THREE from 'three'

// Deterministic PRNG so the board looks the same every load
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const lerp = (a, b, t) => a + (b - a) * t

// Renders a square canvas of polished wood grain
function woodCanvas(size, baseHex, darkHex, lightHex, seed, ringFreq) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const rnd = mulberry32(seed)
  const base = hexToRgb(baseHex)
  const dark = hexToRgb(darkHex)
  const light = hexToRgb(lightHex)

  const img = ctx.createImageData(size, size)
  const d = img.data
  const phase = rnd() * 100
  const f1 = ringFreq + rnd() * 3
  const f2 = 0.8 + rnd() * 0.8
  const warp = 0.3 + rnd() * 0.2

  for (let y = 0; y < size; y++) {
    const ny = y / size
    // grain runs vertically with a slow, gentle drift
    const rowWobble = Math.sin(ny * f2 * Math.PI * 2 + phase) * warp + Math.sin(ny * 7.3 + phase * 2) * 0.08
    for (let x = 0; x < size; x++) {
      const nx = x / size
      let v = Math.sin(nx * f1 * Math.PI * 2 + rowWobble)
      v = Math.pow(v * 0.5 + 0.5, 2.8)
      // fine speckle noise
      const n = (rnd() - 0.5) * 0.14
      const t = Math.min(1, Math.max(0, v * 0.75 + n))
      const fleck = rnd() > 0.985 ? 0.35 : 0
      const i = (y * size + x) * 4
      d[i] = lerp(lerp(base[0], dark[0], t), light[0], fleck)
      d[i + 1] = lerp(lerp(base[1], dark[1], t), light[1], fleck)
      d[i + 2] = lerp(lerp(base[2], dark[2], t), light[2], fleck)
      d[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return canvas
}

// Single 8x8 board texture: each square stamped from wood with random rotation/offset
export function makeBoardTexture() {
  const SQ = 256
  const size = SQ * 8
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const rnd = mulberry32(20260610)

  // weirwood bone-pale squares with faint red veining vs dragonglass obsidian
  const lightWood = woodCanvas(512, '#ded4c2', '#b08a78', '#f2ece0', 7, 6)
  const darkWood = woodCanvas(512, '#23262c', '#101216', '#3a414c', 13, 7)

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const isLight = (r + f) % 2 === 1
      const src = isLight ? lightWood : darkWood
      const x = f * SQ
      const y = (7 - r) * SQ
      ctx.save()
      ctx.translate(x + SQ / 2, y + SQ / 2)
      ctx.rotate((Math.floor(rnd() * 4) * Math.PI) / 2)
      const ox = rnd() * (512 - SQ)
      const oy = rnd() * (512 - SQ)
      ctx.drawImage(src, ox, oy, SQ, SQ, -SQ / 2, -SQ / 2, SQ, SQ)
      ctx.restore()
      // inlay seam between squares
      ctx.strokeStyle = 'rgba(20, 12, 6, 0.55)'
      ctx.lineWidth = 3
      ctx.strokeRect(x + 1.5, y + 1.5, SQ - 3, SQ - 3)
    }
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

// Near-black ironwood for the board frame
export function makeFrameTexture() {
  const canvas = woodCanvas(512, '#26221e', '#131110', '#3a352f', 99, 9)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.anisotropy = 8
  return tex
}

/* ---------- forest texture set: each returns { map, bumpMap } ---------- */

function hash2(ix, iy, seed) {
  let h = (ix * 374761393 + iy * 668265263 + seed * 144269) | 0
  h = (h ^ (h >>> 13)) | 0
  h = Math.imul(h, 1274126177) | 0
  return (((h ^ (h >>> 16)) >>> 0) % 100000) / 100000
}

function vnoise(x, y, seed) {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const a = hash2(ix, iy, seed)
  const b = hash2(ix + 1, iy, seed)
  const c = hash2(ix, iy + 1, seed)
  const d = hash2(ix + 1, iy + 1, seed)
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy
}

export function fbm(x, y, seed, octaves = 3) {
  let v = 0
  let amp = 0.5
  let f = 1
  for (let i = 0; i < octaves; i++) {
    v += amp * vnoise(x * f, y * f, seed + i * 101)
    amp *= 0.5
    f *= 2
  }
  return v
}

function toTexturePair(color, bump, { mirrored = false } = {}) {
  const map = new THREE.CanvasTexture(color)
  map.colorSpace = THREE.SRGBColorSpace
  map.anisotropy = 8
  const bumpMap = new THREE.CanvasTexture(bump)
  bumpMap.anisotropy = 4
  if (mirrored) {
    map.wrapS = map.wrapT = THREE.MirroredRepeatWrapping
    bumpMap.wrapS = bumpMap.wrapT = THREE.MirroredRepeatWrapping
  }
  return { map, bumpMap }
}

// Deep-furrowed bark with lichen patches
export function makeBarkTexture() {
  const size = 512
  const color = document.createElement('canvas')
  const bumpC = document.createElement('canvas')
  color.width = color.height = bumpC.width = bumpC.height = size
  const cctx = color.getContext('2d')
  const bctx = bumpC.getContext('2d')
  const cimg = cctx.createImageData(size, size)
  const bimg = bctx.createImageData(size, size)
  const dark = hexToRgb('#1c1611')
  const mid = hexToRgb('#3c332b')
  const light = hexToRgb('#5b5044')
  const lichen = hexToRgb('#7e8b96') // frost clinging to the ridges

  for (let y = 0; y < size; y++) {
    const ny = y / size
    const wander = (fbm(0.5, ny * 5, 7, 3) - 0.45) * 3.5
    for (let x = 0; x < size; x++) {
      const nx = x / size
      // near-vertical ridges, tight and broken
      let h = Math.sin(nx * Math.PI * 2 * 22 + wander + 1.1 * Math.sin(nx * Math.PI * 2 * 6 + ny * 4))
      h = Math.pow(h * 0.5 + 0.5, 1.7)
      // secondary fine ridging
      h = h * 0.75 + 0.25 * Math.pow(0.5 + 0.5 * Math.sin(nx * Math.PI * 2 * 53 + wander * 2), 2)
      // horizontal cracking + fine roughness
      const crack = fbm(nx * 3, ny * 26, 21, 2)
      if (crack > 0.58) h *= 0.5
      h = Math.min(1, Math.max(0, h + (hash2(x, y, 5) - 0.5) * 0.3))

      let r = h < 0.5 ? lerp(dark[0], mid[0], h * 2) : lerp(mid[0], light[0], h * 2 - 1)
      let g = h < 0.5 ? lerp(dark[1], mid[1], h * 2) : lerp(mid[1], light[1], h * 2 - 1)
      let b = h < 0.5 ? lerp(dark[2], mid[2], h * 2) : lerp(mid[2], light[2], h * 2 - 1)
      // lichen colonies cling to the ridge tops
      const li = fbm(nx * 7, ny * 7, 33, 3)
      if (li > 0.62 && h > 0.45) {
        const m = Math.min(1, (li - 0.62) * 6)
        r = lerp(r, lichen[0], m * 0.7)
        g = lerp(g, lichen[1], m * 0.7)
        b = lerp(b, lichen[2], m * 0.7)
      }
      const i = (y * size + x) * 4
      cimg.data[i] = r
      cimg.data[i + 1] = g
      cimg.data[i + 2] = b
      cimg.data[i + 3] = 255
      const bv = h * 255
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = bv
      bimg.data[i + 3] = 255
    }
  }
  cctx.putImageData(cimg, 0, 0)
  bctx.putImageData(bimg, 0, 0)
  return toTexturePair(color, bumpC, { mirrored: true })
}

// Cut face: growth rings as grooves, radial drying cracks, mossy rim
export function makeRingsTexture() {
  const size = 1024
  const color = document.createElement('canvas')
  const bumpC = document.createElement('canvas')
  color.width = color.height = bumpC.width = bumpC.height = size
  const cctx = color.getContext('2d')
  const bctx = bumpC.getContext('2d')
  const cimg = cctx.createImageData(size, size)
  const bimg = bctx.createImageData(size, size)
  const base = hexToRgb('#b3a68c')
  const dark = hexToRgb('#857862')
  const heart = hexToRgb('#6b6250')
  const rim = hexToRgb('#2e2620')
  const moss = hexToRgb('#dfe5eb') // snow caught on the rim
  const c = size / 2
  const crackAngles = [0.7, 1.9, 3.1, 4.4, 5.6]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - c
      const dy = y - c
      const dist = Math.sqrt(dx * dx + dy * dy)
      const ang = Math.atan2(dy, dx)
      const wob = Math.sin(ang * 3 + 1.7) * 3 + Math.sin(ang * 7 + 0.4) * 1.5 + fbm(ang * 2, dist * 0.01, 9, 2) * 4
      let v = Math.sin((dist + wob) * 0.55)
      v = Math.pow(v * 0.5 + 0.5, 1.35)
      const t = Math.min(1, Math.max(0, v * 0.85 + (hash2(x, y, 3) - 0.5) * 0.2))
      let height = 1 - t * 0.8 // rings cut grooves

      let r = lerp(base[0], dark[0], t)
      let g = lerp(base[1], dark[1], t)
      let b = lerp(base[2], dark[2], t)
      // darker heartwood
      const heartMix = Math.max(0, 1 - dist / 220) * 0.6
      r = lerp(r, heart[0], heartMix)
      g = lerp(g, heart[1], heartMix)
      b = lerp(b, heart[2], heartMix)
      // radial drying cracks
      for (const ca of crackAngles) {
        const da = Math.abs(((ang - ca + Math.PI * 3) % (Math.PI * 2)) - Math.PI)
        const w = 0.006 + (dist / c) * 0.012
        if (da < w && dist > 70) {
          const k = 1 - da / w
          r = lerp(r, 20, k * 0.8)
          g = lerp(g, 14, k * 0.8)
          b = lerp(b, 8, k * 0.8)
          height -= k * 0.5
        }
      }
      // bark rim with moss creeping over the edge
      const rimEdge = c * 0.94
      if (dist > rimEdge) {
        const mossy = fbm(ang * 3.2, dist * 0.05, 51, 2) > 0.52
        const tc = mossy ? moss : rim
        const k = Math.min(1, (dist - rimEdge) / 8)
        r = lerp(r, tc[0], k)
        g = lerp(g, tc[1], k)
        b = lerp(b, tc[2], k)
        height = mossy ? 0.7 : 0.45
      }
      const i = (y * size + x) * 4
      cimg.data[i] = r
      cimg.data[i + 1] = g
      cimg.data[i + 2] = b
      cimg.data[i + 3] = 255
      const bv = Math.min(1, Math.max(0, height)) * 255
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = bv
      bimg.data[i + 3] = 255
    }
  }
  cctx.putImageData(cimg, 0, 0)
  bctx.putImageData(bimg, 0, 0)
  return toTexturePair(color, bumpC)
}

// Forest floor: fresh snow over frozen earth
export function makeGroundTexture() {
  const size = 1024
  const color = document.createElement('canvas')
  const bumpC = document.createElement('canvas')
  color.width = color.height = bumpC.width = bumpC.height = size
  const cctx = color.getContext('2d')
  const bctx = bumpC.getContext('2d')
  const cimg = cctx.createImageData(size, size)
  const bimg = bctx.createImageData(size, size)
  const snowShadow = hexToRgb('#aebac6')
  const snow = hexToRgb('#e2e8ee')
  const earth = hexToRgb('#43392d')

  for (let y = 0; y < size; y++) {
    const ny = y / size
    for (let x = 0; x < size; x++) {
      const nx = x / size
      const t = fbm(nx * 9, ny * 9, 13, 4)
      const d = fbm(nx * 4 + 9, ny * 4 + 3, 77, 3)
      // drifted snow with blue shadow pools
      let r = lerp(snowShadow[0], snow[0], t)
      let g = lerp(snowShadow[1], snow[1], t)
      let b = lerp(snowShadow[2], snow[2], t)
      // sparse patches where dark earth breaks through
      const earthMix = Math.max(0, (d - 0.62) * 4)
      r = lerp(r, earth[0], Math.min(1, earthMix))
      g = lerp(g, earth[1], Math.min(1, earthMix))
      b = lerp(b, earth[2], Math.min(1, earthMix))
      let height = t * 0.6 + d * 0.3
      if (hash2(x, y, 91) > 0.996) {
        r *= 1.12
        g *= 1.12
        b *= 1.15 // glinting ice crystals
        height += 0.2
      }
      const i = (y * size + x) * 4
      cimg.data[i] = r
      cimg.data[i + 1] = g
      cimg.data[i + 2] = b
      cimg.data[i + 3] = 255
      const bv = Math.min(1, height) * 255
      bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = bv
      bimg.data[i + 3] = 255
    }
  }
  cctx.putImageData(cimg, 0, 0)
  bctx.putImageData(bimg, 0, 0)
  return toTexturePair(color, bumpC, { mirrored: true })
}

// Soft elongated glow for fake sun shafts
export function makeShaftTexture() {
  const w = 128
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const gx = ctx.createLinearGradient(0, 0, w, 0)
  gx.addColorStop(0, 'rgba(222,234,250,0)')
  gx.addColorStop(0.5, 'rgba(222,234,250,1)')
  gx.addColorStop(1, 'rgba(222,234,250,0)')
  ctx.fillStyle = gx
  ctx.fillRect(0, 0, w, h)
  const gy = ctx.createLinearGradient(0, 0, 0, h)
  gy.addColorStop(0, 'rgba(0,0,0,1)')
  gy.addColorStop(0.25, 'rgba(0,0,0,0.1)')
  gy.addColorStop(0.8, 'rgba(0,0,0,0.35)')
  gy.addColorStop(1, 'rgba(0,0,0,1)')
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = gy
  ctx.fillRect(0, 0, w, h)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/* ---------- house banners ---------- */

function bannerBase(field, border) {
  const w = 256
  const h = 384
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = field
  ctx.fillRect(0, 0, w, h)
  ctx.strokeStyle = border
  ctx.lineWidth = 10
  ctx.strokeRect(10, 10, w - 20, h - 20)
  // weathering streaks
  for (let i = 0; i < 60; i++) {
    const x = (i * 97) % w
    ctx.fillStyle = `rgba(0,0,0,${0.04 + ((i * 31) % 10) / 150})`
    ctx.fillRect(x, 0, 3 + ((i * 13) % 5), h)
  }
  return { canvas, ctx, w, h }
}

// House Stark: grey direwolf head on an ice-white field
export function makeStarkBanner() {
  const { canvas, ctx, w, h } = bannerBase('#cdd3d6', '#5a646b')
  // wolf head in profile, muzzle to the left
  const pts = [
    [0.08, 0.52], [0.18, 0.42], [0.34, 0.34], [0.42, 0.1], [0.52, 0.3],
    [0.66, 0.12], [0.72, 0.38], [0.82, 0.6], [0.88, 0.92], [0.45, 0.92],
    [0.42, 0.7], [0.3, 0.62], [0.18, 0.6], [0.1, 0.56],
  ]
  ctx.fillStyle = '#3f464c'
  ctx.beginPath()
  pts.forEach(([x, y], i) => {
    const px = w * (0.14 + x * 0.72)
    const py = h * (0.2 + y * 0.52)
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  })
  ctx.closePath()
  ctx.fill()
  // eye
  ctx.fillStyle = '#cdd3d6'
  ctx.beginPath()
  ctx.arc(w * (0.14 + 0.38 * 0.72), h * (0.2 + 0.42 * 0.52), 5, 0, Math.PI * 2)
  ctx.fill()
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// House Targaryen: red three-headed dragon on black
export function makeTargBanner() {
  const { canvas, ctx, w, h } = bannerBase('#151012', '#6b1414')
  ctx.strokeStyle = '#a32020'
  ctx.fillStyle = '#a32020'
  ctx.lineWidth = 13
  ctx.lineCap = 'round'
  const cx = w * 0.5
  const cy = h * 0.58
  // body
  ctx.beginPath()
  ctx.ellipse(cx, cy, 26, 34, 0, 0, Math.PI * 2)
  ctx.fill()
  // three necks with arrow heads
  const heads = [
    [0.26, 0.22, -0.4],
    [0.5, 0.14, 0],
    [0.74, 0.22, 0.4],
  ]
  for (const [hx, hy, bend] of heads) {
    const px = w * hx
    const py = h * hy
    ctx.beginPath()
    ctx.moveTo(cx, cy - 20)
    ctx.quadraticCurveTo(cx + bend * w * 0.45, h * 0.36, px, py)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(px - 12, py)
    ctx.lineTo(px + 12, py - 4)
    ctx.lineTo(px - 2, py + 14)
    ctx.closePath()
    ctx.fill()
  }
  // wings
  ctx.beginPath()
  ctx.moveTo(cx - 18, cy - 10)
  ctx.lineTo(w * 0.12, h * 0.46)
  ctx.lineTo(cx - 20, cy + 22)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(cx + 18, cy - 10)
  ctx.lineTo(w * 0.88, h * 0.46)
  ctx.lineTo(cx + 20, cy + 22)
  ctx.closePath()
  ctx.fill()
  // tail
  ctx.lineWidth = 9
  ctx.beginPath()
  ctx.moveTo(cx, cy + 30)
  ctx.quadraticCurveTo(cx + 30, h * 0.82, cx - 14, h * 0.88)
  ctx.stroke()
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
