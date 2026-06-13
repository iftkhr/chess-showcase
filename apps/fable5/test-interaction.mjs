// E2E smoke test: drives the 3D board via real pointer events
import puppeteer from 'puppeteer-core'
import * as THREE from 'three'

const W = 1600, H = 1000
const cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 100)
cam.position.set(3.5, 9.5, 14)
cam.lookAt(0, 0, 0)
cam.updateMatrixWorld()

function squarePx(square, height = 0, zOff = 0) {
  const f = square.charCodeAt(0) - 97
  const r = parseInt(square[1], 10) - 1
  const v = new THREE.Vector3(f - 3.5, height, 3.5 - r + zOff).project(cam)
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H }
}
// aim at a piece's body so taller pieces in front don't occlude the click
const piecePx = (sq, h = 0.55) => squarePx(sq, h)
// aim at the far half of an empty destination square
const destPx = (sq) => squarePx(sq, 0, -0.25)

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--no-sandbox'],
})
const page = await browser.newPage()
await page.setViewport({ width: W, height: H })
page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message))
page.on('console', (m) => m.text().startsWith('click') && console.log(' ', m.text()))
await page.goto('http://localhost:8000/', { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 2500))

const status = () => page.$eval('.status', (el) => el.textContent)

console.log('initial status:', await status())

// clicking before Play should do nothing
const e2 = piecePx('e2')
await page.mouse.click(e2.x, e2.y)
await new Promise((r) => setTimeout(r, 300))

await page.click('.play')
await new Promise((r) => setTimeout(r, 300))
console.log('after play:', await status())

// 1. e4
await page.mouse.click(e2.x, e2.y)
await new Promise((r) => setTimeout(r, 400))
await page.screenshot({ path: '/tmp/test-selected.png' })
const e4 = destPx('e4')
await page.mouse.click(e4.x, e4.y)
await new Promise((r) => setTimeout(r, 900))
console.log('after e4:', await status())

// 1... e5
const e7 = piecePx('e7'), e5 = destPx('e5')
await page.mouse.click(e7.x, e7.y)
await new Promise((r) => setTimeout(r, 300))
await page.mouse.click(e5.x, e5.y)
await new Promise((r) => setTimeout(r, 900))
console.log('after e5:', await status())

// 2. Qh5 — select queen d1, move to h5
const d1 = piecePx('d1', 1.1), h5 = destPx('h5')
await page.mouse.click(d1.x, d1.y)
await new Promise((r) => setTimeout(r, 300))
await page.mouse.click(h5.x, h5.y)
await new Promise((r) => setTimeout(r, 900))
console.log('after Qh5:', await status())
await page.screenshot({ path: '/tmp/test-midgame.png' })

// reset
await page.click('.reset')
await new Promise((r) => setTimeout(r, 600))
console.log('after reset:', await status())
await page.screenshot({ path: '/tmp/test-reset.png' })

await browser.close()
