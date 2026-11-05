<script setup lang="ts">
/**
 * Écran « bombé » façon tube cathodique : les projets défilent dans un canvas WebGL
 * avec une distorsion en barillet. À chaque changement, l'écran se bombe davantage
 * puis se stabilise, et l'image suivante apparaît en fondu déformé.
 * Au clic, l'écran s'aplatit et s'agrandit jusqu'au plein écran, puis on ouvre
 * la page du projet (qui commence par la même image plein écran).
 */
import type { Projet } from '~/utils/projets'

const props = withDefaults(defineProps<{ items: Projet[]; interval?: number }>(), { interval: 0 })

const { $gsap } = useNuxtApp()
const canvas = ref<HTMLCanvasElement>()
// Reflet de l'écran sur le « sol » vernis, recopié du canvas WebGL à chaque image
const reflet = ref<HTMLCanvasElement>()
let refletCtx: CanvasRenderingContext2D | null = null
const frame = ref<HTMLElement>()
const stage = ref<HTMLElement>()
const ouverture = ref(false)
// Gardé entre les pages : en revenant d'un projet, on retombe dessus
const index = useState('projetIndex', () => 0)
// Position de la vidéo au moment d'ouvrir un projet (reprise sur la page projet)
const videoTemps = useState<number>('videoTemps', () => 0)
// Image de la vidéo au moment d'ouvrir un projet (data URL), servie d'affiche à la page projet
const instantane = useState<string | null>('videoInstantane', () => null)

const courant = computed(() => props.items[index.value]!)
// Couleur moyenne de chaque visuel : l'écran « éclaire » la pièce avec (façon halo de télé)
const couleurs = ref<string[]>([])
const lueur = computed(() => couleurs.value[index.value] ?? courant.value.teinte)
// Sens du dernier changement (1 = suivant, -1 = précédent) : oriente les animations du texte
const sens = ref(1)
const introDone = useState('introDone', () => false)
// Rail de traits collés au bord droit de l'écran : ils épousent sa courbure (même formule
// que le shader) et la suivent en direct quand l'écran se bombe ou bouge avec la souris
const traits = ref<SVGPathElement[]>([])
const traitActif = ref<SVGPathElement>()
const boutons = ref<HTMLElement[]>([])
const survol = ref(-1)
// Menu ouvert : clavier, molette et swipe ne font plus défiler les projets
const menuOuvert = useState('menuOuvert', () => false)

const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform sampler2D uA;
uniform sampler2D uB;
uniform float uMix;      // 0 = image A, 1 = image B
uniform float uBulge;    // intensité du bombé
uniform vec2 uMouse;     // décalage léger du centre selon la souris
uniform vec2 uRes;       // taille du canvas
uniform vec2 uImgA;      // ratio des images (pour un « cover »)
uniform vec2 uImgB;
uniform float uFx;       // 1 = effets écran (vignette, lignes), 0 = image nette
uniform float uNoise;    // 0 = image, 1 = neige télé
uniform float uTime;
uniform vec4 uRect;      // zone où dessiner l'écran dans le canvas (x, y depuis le bas, largeur, hauteur)

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

vec2 cover(vec2 uv, vec2 img) {
  float rs = uRes.x / uRes.y, ri = img.x / img.y;
  vec2 s = rs < ri ? vec2(rs / ri, 1.0) : vec2(1.0, ri / rs);
  return (uv - 0.5) * s + 0.5;
}

void main() {
  // Distorsion type tube cathodique : chaque bord se courbe vers l'extérieur,
  // les coins sont rognés (l'axe x dépend de y² et inversement)
  // Coordonnées locales à la zone de l'écran (permet l'agrandissement sans redimensionner le canvas)
  vec2 luv = (vUv - uRect.xy) / uRect.zw;
  vec2 c = luv - 0.5 - uMouse * 0.03;
  float r2 = dot(c, c);
  vec2 uv = luv + c * (vec2(c.y * c.y, c.x * c.x) * uBulge + r2 * uBulge * 0.05);


  // Masque aux bords avec un léger adoucissement
  vec2 edge = smoothstep(0.0, 0.004, uv) * smoothstep(0.0, 0.004, 1.0 - uv);
  float mask = edge.x * edge.y;

  // Perte de synchro pendant la neige : chaque ligne de l'image se décale un peu
  // (seulement l'image, le cadre de l'écran reste net)
  float ligne = floor(uv.y * 90.0);
  uv.x += (hash(vec2(ligne, floor(uTime * 30.0))) - 0.5) * 0.04 * uNoise;

  // Transition : l'image suivante « coule » depuis le centre avec un décalage
  float d = length(luv - 0.5);
  // Seuil qui descend de 1 à -0.2 : 0 → image A partout, 1 → image B partout
  float t = 1.0 - uMix * 1.2;
  float m = smoothstep(t, t + 0.2, 1.0 - d);
  vec2 offA = c * m * 0.15;
  vec2 offB = -c * (1.0 - m) * 0.15;
  // Aberration chromatique : rouge et bleu décalés vers les bords, comme un tube
  vec2 ca = c * r2 * 0.025 * uFx;
  vec3 a = vec3(
    texture2D(uA, cover(uv + offA + ca, uImgA)).r,
    texture2D(uA, cover(uv + offA, uImgA)).g,
    texture2D(uA, cover(uv + offA - ca, uImgA)).b);
  vec3 b = vec3(
    texture2D(uB, cover(uv + offB + ca, uImgB)).r,
    texture2D(uB, cover(uv + offB, uImgB)).g,
    texture2D(uB, cover(uv + offB - ca, uImgB)).b);
  vec3 col = mix(a, b, m);

  // Neige télé : grain gris qui change à chaque image + bande claire qui défile
  vec2 grain = floor(gl_FragCoord.xy / 2.0);
  float n = hash(grain + fract(uTime * 7.0) * 917.0);
  n = mix(n, hash(grain.yx + fract(uTime * 13.0) * 431.0), 0.35);
  float bande = smoothstep(0.75, 1.0, sin((uv.y - uTime * 0.6) * 9.0));
  vec3 neige = vec3(n * (0.75 + 0.25 * bande)) * vec3(0.95, 0.97, 1.0);
  col = mix(col, neige, uNoise);

  // Filtre écran cathodique (s'efface avec uFx à l'ouverture d'un projet)
  float vig = smoothstep(0.85, 0.2, r2 * 2.2);
  // Vignette plus marquée
  col *= mix(1.0, mix(0.35, 1.0, vig), uFx);
  // Lignes de balayage bien visibles (une ligne sombre tous les 3 px environ)
  float scan = 0.5 + 0.5 * sin(gl_FragCoord.y * 2.1);
  col *= mix(1.0, 0.78 + 0.22 * scan, uFx);
  // Masque de phosphores : trame RGB verticale très fine
  float px = mod(gl_FragCoord.x, 3.0);
  vec3 phos = vec3(px < 1.0 ? 1.0 : 0.85, px >= 1.0 && px < 2.0 ? 1.0 : 0.85, px >= 2.0 ? 1.0 : 0.85);
  col *= mix(vec3(1.0), phos, uFx * 0.6);
  // Léger grain permanent + scintillement
  float g = hash(gl_FragCoord.xy + fract(uTime * 3.0) * 113.0) - 0.5;
  col += g * 0.06 * uFx;
  col *= 1.0 + 0.015 * sin(uTime * 60.0) * uFx;
  // Un peu de contraste et de lumière pour compenser l'assombrissement
  col = clamp((col - 0.5) * 1.08 + 0.5 + 0.04 * uFx, 0.0, 1.0);

  gl_FragColor = vec4(col * mask, mask);
}`

/** Visuel de repli quand un projet n'a pas encore d'image */
function placeholder(p: Projet): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 1600
  c.height = 900
  const g = c.getContext('2d')!
  const grad = g.createLinearGradient(0, 0, 1600, 900)
  grad.addColorStop(0, p.teinte)
  grad.addColorStop(1, '#111')
  g.fillStyle = grad
  g.fillRect(0, 0, 1600, 900)
  g.fillStyle = 'rgba(255,255,255,0.18)'
  g.font = 'italic 820px "Instrument Serif", Georgia, serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(p.titre[0]!, 800, 500)
  return c
}

type Source = { src: TexImageSource; w: number; h: number; video?: HTMLVideoElement }

/** Couleur moyenne d'un visuel, un peu ravivée pour que le halo ne soit pas terne */
function couleurMoyenne(src: TexImageSource): string | undefined {
  try {
    const c = document.createElement('canvas')
    c.width = c.height = 8
    const g = c.getContext('2d', { willReadFrequently: true })!
    g.drawImage(src as CanvasImageSource, 0, 0, 8, 8)
    const d = g.getImageData(0, 0, 8, 8).data
    let r = 0, v = 0, b = 0
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]!
      v += d[i + 1]!
      b += d[i + 2]!
    }
    const n = d.length / 4
    // Éloigne chaque canal du gris moyen : plus de saturation
    const gris = (r + v + b) / (3 * n)
    const aviver = (x: number) => Math.round(Math.min(255, Math.max(0, gris + (x / n - gris) * 1.6)))
    return `rgb(${aviver(r)} ${aviver(v)} ${aviver(b)})`
  } catch {
    return undefined
  }
}

function chargerImage(p: Projet): Promise<Source> {
  const repli = () => {
    const c = placeholder(p)
    return { src: c, w: c.width, h: c.height }
  }
  if (!p.image) return Promise.resolve(repli())
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ src: img, w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve(repli())
    img.src = p.image!
  })
}

/** Vidéo muette en boucle ; sa texture est remise à jour à chaque image (voir dessiner) */
function chargerSource(p: Projet): Promise<Source> {
  if (!p.video || reduit) return chargerImage(p)
  return new Promise((resolve) => {
    const v = document.createElement('video')
    v.muted = true
    v.loop = true
    v.playsInline = true
    v.preload = 'auto'
    v.crossOrigin = 'anonymous'
    v.addEventListener('loadeddata', () => {
      v.play().catch(() => {})
      resolve({ src: v, w: v.videoWidth, h: v.videoHeight, video: v })
    }, { once: true })
    v.addEventListener('error', () => resolve(chargerImage(p)), { once: true })
    v.src = p.video!
  })
}


let gl: WebGLRenderingContext | null = null
let textures: { tex: WebGLTexture; w: number; h: number; video?: HTMLVideoElement }[] = []
let u: Record<string, WebGLUniformLocation | null> = {}
const etat = { mix: 0, noise: 0, bulge: 0.4, fx: 1, rx: 0, ry: 0, rw: 1, rh: 1, mx: 0, my: 0, tmx: 0, tmy: 0 }
let from = 0
let to = 0
let raf = 0
let timer: ReturnType<typeof setTimeout> | undefined
let enTransition = false
let reduit = false
let ro: ResizeObserver | undefined
let io: IntersectionObserver | undefined
let visible = true

function compiler(type: number, src: string) {
  const s = gl!.createShader(type)!
  gl!.shaderSource(s, src)
  gl!.compileShader(s)
  if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) console.error(gl!.getShaderInfoLog(s))
  return s
}

async function init() {
  const el = canvas.value!
  gl = el.getContext('webgl', { premultipliedAlpha: false, alpha: true })
  if (!gl) return

  const prog = gl.createProgram()!
  gl.attachShader(prog, compiler(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, compiler(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  for (const n of ['uA', 'uB', 'uMix', 'uBulge', 'uMouse', 'uRes', 'uImgA', 'uImgB', 'uFx', 'uRect', 'uNoise', 'uTime'])
    u[n] = gl.getUniformLocation(prog, n)
  gl.uniform1i(u.uA!, 0)
  gl.uniform1i(u.uB!, 1)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)

  await document.fonts?.ready
  const sources = await Promise.all(props.items.map(chargerSource))
  if (!gl) return
  textures = sources.map(({ src, w, h, video }) => {
    const tex = gl!.createTexture()!
    gl!.bindTexture(gl!.TEXTURE_2D, tex)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE)
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE)
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, src)
    return { tex, w, h, video }
  })

  couleurs.value = props.items.map((p, i) => couleurMoyenne(sources[i]!.src) ?? p.teinte)

  from = to = Math.min(index.value, textures.length - 1)
  redimensionner()
  boucle()
  planifier()
}

function redimensionner() {
  const el = canvas.value
  if (!el || !gl) return
  const dpr = Math.min(window.devicePixelRatio, 2)
  el.width = el.clientWidth * dpr
  el.height = el.clientHeight * dpr
  gl.viewport(0, 0, el.width, el.height)
  // Le reflet est flou : une demi-résolution suffit
  const r = reflet.value
  if (r) {
    r.width = Math.max(1, Math.round(r.clientWidth * dpr * 0.5))
    r.height = Math.max(1, Math.round(r.clientHeight * dpr * 0.5))
    refletCtx = r.getContext('2d')
  }
  // Redessine tout de suite : changer la taille vide le canvas (évite un flash)
  dessiner()
  refleter()
  majTraits()
}

/**
 * Recopie le bas de l'écran, retourné, dans le canvas du reflet.
 * Appelé juste après le rendu WebGL, tant que son image est encore disponible.
 */
function refleter() {
  const el = canvas.value
  const r = reflet.value
  if (!el || !r || !refletCtx || ouverture.value || !el.clientHeight) return
  // Hauteur de la bande d'écran reflétée, à la même échelle que le reflet
  const srcH = Math.min(el.height, el.height * (r.clientHeight / el.clientHeight))
  refletCtx.setTransform(1, 0, 0, -1, 0, r.height)
  refletCtx.clearRect(0, 0, r.width, r.height)
  refletCtx.drawImage(el, 0, el.height - srcH, el.width, srcH, 0, 0, r.width, r.height)
}

/** Envoie l'image courante de la vidéo dans la texture déjà liée */
function majVideo(t: (typeof textures)[number]) {
  if (t.video && t.video.readyState >= 2)
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, t.video)
}

function dessiner() {
  if (!gl || !textures.length) return
  const A = textures[from]!
  const B = textures[to]!
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, A.tex)
  majVideo(A)
  gl.activeTexture(gl.TEXTURE1)
  gl.bindTexture(gl.TEXTURE_2D, B.tex)
  if (B !== A) majVideo(B)
  gl.uniform1f(u.uMix!, etat.mix)
  gl.uniform1f(u.uBulge!, etat.bulge)
  gl.uniform2f(u.uMouse!, etat.mx, etat.my)
  gl.uniform4f(u.uRect!, etat.rx, etat.ry, etat.rw, etat.rh)
  // Taille en pixels de la zone dessinée (pour le « cover » et les lignes)
  gl.uniform2f(u.uRes!, gl.drawingBufferWidth * etat.rw, gl.drawingBufferHeight * etat.rh)
  gl.uniform2f(u.uImgA!, A.w, A.h)
  gl.uniform2f(u.uImgB!, B.w, B.h)
  gl.uniform1f(u.uFx!, etat.fx)
  gl.uniform1f(u.uNoise!, etat.noise)
  gl.uniform1f(u.uTime!, (performance.now() / 1000) % 100)
  gl.clearColor(0, 0, 0, 0)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
}

function boucle() {
  etat.mx += (etat.tmx - etat.mx) * 0.08
  etat.my += (etat.tmy - etat.my) * 0.08
  if (visible) {
    dessiner()
    refleter()
    majTraits()
    parallaxeTitre()
  }
  raf = requestAnimationFrame(boucle)
}

/**
 * Le titre flotte devant l'écran : il glisse un peu à l'opposé de la souris
 * (les tags moins que le titre, d'où l'impression de profondeur).
 * Passe par des variables CSS sur le cadre pour ne pas gêner la transition du titre.
 */
let dernierPx = NaN
let dernierPy = NaN
function parallaxeTitre() {
  const el = frame.value
  if (!el || reduit) return
  const px = -etat.mx
  const py = etat.my
  // Inutile de réécrire le style quand la souris est immobile
  if (Math.abs(px - dernierPx) < 0.001 && Math.abs(py - dernierPy) < 0.001) return
  dernierPx = px
  dernierPy = py
  el.style.setProperty('--px', px.toFixed(4))
  el.style.setProperty('--py', py.toFixed(4))
}

function aller(cible: number) {
  if (enTransition || ouverture.value || !textures.length) return
  const n = props.items.length
  const suivant = ((cible % n) + n) % n
  if (suivant === index.value) return
  clearTimeout(timer)
  // Passage du dernier au premier (ou l'inverse) : on garde le sens du geste
  const pas = cible - index.value
  sens.value = pas === 0 ? 1 : Math.sign(pas)
  from = index.value
  to = suivant
  index.value = suivant

  if (reduit) {
    from = to
    etat.mix = 0
    planifier()
    return
  }

  enTransition = true
  etat.mix = 0
  $gsap
    .timeline({
      onComplete: () => {
        from = to
        etat.mix = 0
        enTransition = false
        planifier()
      },
    })
    // La neige monte vite, l'image change dessous, puis la neige se dissipe
    .to(etat, { noise: 1, duration: 0.15, ease: 'power2.out' }, 0)
    .to(etat, { bulge: 0.7, duration: 0.35, ease: 'power2.inOut' }, 0)
    .to(etat, { mix: 1, duration: 0.4, ease: 'power2.inOut' }, 0.15)
    .to(etat, { noise: 0, duration: 0.5, ease: 'power2.in' }, 0.5)
    .to(etat, { bulge: 0.4, duration: 0.8, ease: 'power3.out' }, 0.45)
}

// Placement des traits, en fractions de la hauteur de l'écran (depuis le haut)
const PAS = 0.075 // écart entre deux traits
const DEMI = 0.026 // demi-longueur d'un trait
const ECART = 12 // distance au bord de l'image, en px
// Curseur du trait actif : position (en n° de trait) et étirement pendant le trajet
const curseur = { pos: 0, etire: 0 }

/** Centre du trait n° s (peut être fractionnaire pendant une animation) */
function centreTrait(s: number) {
  return 0.5 + (s - (props.items.length - 1) / 2) * PAS
}

/**
 * Point du bord droit visible de l'écran à la hauteur t (0 = haut, 1 = bas), en px.
 * Inverse la distorsion du shader : on cherche x tel que l'image échantillonnée soit à uv.x = 1.
 */
function pointBord(t: number, W: number, H: number): [number, number] {
  const b = etat.bulge
  const cy = 1 - t - 0.5 - etat.my * 0.03
  let x = 1
  for (let k = 0; k < 4; k++) {
    const cx = x - 0.5 - etat.mx * 0.03
    const f = x + cx * (cy * cy * b + (cx * cx + cy * cy) * b * 0.05) - 1
    const d = 1 + cy * cy * b + b * 0.05 * (3 * cx * cx + cy * cy)
    x -= f / d
  }
  return [x * W + ECART, t * H]
}

/** Tracé d'un morceau de bord entre t0 et t1 */
function cheminBord(t0: number, t1: number, W: number, H: number) {
  let d = ''
  for (let k = 0; k <= 8; k++) {
    const [x, y] = pointBord(t0 + ((t1 - t0) * k) / 8, W, H)
    d += `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`
  }
  return d
}

function majTraits() {
  const el = canvas.value
  if (!el || ouverture.value) return
  const W = el.clientWidth
  const H = el.clientHeight
  traits.value.forEach((p, i) => {
    const c = centreTrait(i)
    p.setAttribute('d', cheminBord(c - DEMI, c + DEMI, W, H))
    const [x, y] = pointBord(c, W, H)
    const btn = boutons.value[i]
    if (btn) btn.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
  })
  // Le trait actif s'allonge vers l'arrière pendant son trajet, puis se rétracte
  const c = centreTrait(curseur.pos)
  const arriere = curseur.etire * PAS
  traitActif.value?.setAttribute('d', cheminBord(c - DEMI - Math.max(0, arriere), c + DEMI - Math.min(0, arriere), W, H))
}

/** Le trait actif glisse le long de la courbe jusqu'au trait visé */
function deplacerCurseur(i: number, anime = true) {
  $gsap.killTweensOf(curseur)
  const el = traitActif.value
  if (el) $gsap.killTweensOf(el)
  if (!anime || reduit) {
    curseur.pos = i
    curseur.etire = 0
    return
  }
  // Passage du dernier au premier (ou l'inverse) : pas de grand trajet à travers
  // tout le rail, le trait s'efface et réapparaît directement sur le bon projet
  if (Math.abs(i - curseur.pos) > 1 && el) {
    $gsap
      .timeline()
      .to(el, { opacity: 0, duration: 0.2, ease: 'power2.in' })
      .call(() => {
        curseur.pos = i
        curseur.etire = 0
      })
      .to(el, { opacity: 1, duration: 0.3, ease: 'power2.out' })
    return
  }
  // Simple glissement vers le trait voisin, sans étirement
  curseur.etire = 0
  $gsap.to(curseur, { pos: i, duration: 0.4, ease: 'power2.inOut' })
}

watch(index, (i) => deplacerCurseur(i))

/** Précharge et décode l'image de la page projet, pour qu'elle s'affiche sans à-coup */
function precharger(src?: string): Promise<void> {
  if (!src) return Promise.resolve()
  const img = new Image()
  img.src = src
  return img.decode().catch(() => {})
}

/**
 * Agrandit l'écran jusqu'au plein écran puis ouvre la page du projet.
 * Le canvas passe une seule fois en plein écran ; ensuite seule la zone dessinée
 * (uRect) s'agrandit dans le shader : rien n'est recalculé côté mise en page.
 */
function ouvrir() {
  if (enTransition || ouverture.value) return
  const p = courant.value
  const dest = `/projets/${p.slug}`
  if (reduit || !textures.length || !frame.value || !stage.value) return navigateTo(dest)

  ouverture.value = true
  clearTimeout(timer)
  etat.tmx = 0
  etat.tmy = 0
  const pret = precharger(p.image)

  const r = frame.value.getBoundingClientRect()
  const W = window.innerWidth
  const H = window.innerHeight
  etat.rx = r.left / W
  etat.ry = 1 - (r.top + r.height) / H
  etat.rw = r.width / W
  etat.rh = r.height / H
  Object.assign(stage.value.style, { position: 'fixed', inset: '0', zIndex: '5' })
  redimensionner()

  $gsap
    .timeline({
      onComplete: () =>
        pret.then(() => {
          // Au moment exact du départ : la page projet reprend la vidéo à cet instant,
          // et affiche cette image le temps que sa propre vidéo soit prête (pas de saut)
          const v = textures[index.value]?.video
          videoTemps.value = v?.currentTime ?? 0
          instantane.value = v ? capturerVideo(v) : null
          navigateTo(dest)
        }),
    })
    .to('.screen .titre, .screen .rail, .screen .reflet', { opacity: 0, duration: 0.3 }, 0)
    .to(etat, { rx: 0, ry: 0, rw: 1, rh: 1, duration: 1, ease: 'power4.inOut' }, 0.1)
    .to(etat, { bulge: 0, fx: 0, mx: 0, my: 0, duration: 1, ease: 'power3.inOut' }, 0.1)
}

// Molette / trackpad : un projet par geste. Le verrou ne se lève qu'après
// 200 ms sans événement, pour ignorer l'inertie des trackpads.
let cumul = 0
let verrou = false
let finGeste: ReturnType<typeof setTimeout> | undefined
function surMolette(e: WheelEvent) {
  if (menuOuvert.value) return
  clearTimeout(finGeste)
  finGeste = setTimeout(() => {
    verrou = false
    cumul = 0
  }, 200)
  if (verrou) return
  cumul += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX
  if (Math.abs(cumul) > 30) {
    verrou = true
    aller(index.value + (cumul > 0 ? 1 : -1))
  }
}

// Swipe sur mobile
let debutY = 0
function surDebutTouch(e: TouchEvent) {
  debutY = e.touches[0]?.clientY ?? 0
}
function surFinTouch(e: TouchEvent) {
  if (menuOuvert.value) return
  const dy = debutY - (e.changedTouches[0]?.clientY ?? debutY)
  if (Math.abs(dy) > 50) aller(index.value + (dy > 0 ? 1 : -1))
}

function surTouche(e: KeyboardEvent) {
  if (menuOuvert.value) return
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') aller(index.value + 1)
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') aller(index.value - 1)
}

function planifier() {
  clearTimeout(timer)
  // interval = 0 : pas de défilement automatique
  if (props.interval > 0 && props.items.length > 1) timer = setTimeout(() => aller(index.value + 1), props.interval * 1000)
}

function surMouvement(e: PointerEvent) {
  const r = canvas.value!.getBoundingClientRect()
  etat.tmx = ((e.clientX - r.left) / r.width - 0.5) * 2
  etat.tmy = -((e.clientY - r.top) / r.height - 0.5) * 2
}
function surSortie() {
  etat.tmx = 0
  etat.tmy = 0
}

onMounted(() => {
  reduit = matchMedia('(prefers-reduced-motion: reduce)').matches
  init()
  window.addEventListener('keydown', surTouche)
  window.addEventListener('wheel', surMolette, { passive: true })
  window.addEventListener('touchstart', surDebutTouch, { passive: true })
  window.addEventListener('touchend', surFinTouch, { passive: true })
  ro = new ResizeObserver(redimensionner)
  ro.observe(canvas.value!)
  io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting))
  io.observe(canvas.value!)
  deplacerCurseur(index.value, false)
  majTraits()

  // Entrée du texte autour de l'écran, une fois le loader terminé
  if (!reduit) {
    $gsap.set('.screen .rail', { opacity: 0, x: 14 })
    const stop = watch(
      introDone,
      (ok) => {
        if (!ok) return
        $gsap.to('.screen .rail', {
          opacity: 1,
          x: 0,
          duration: 0.8,
          ease: 'power3.out',
          delay: 0.2,
        })
        queueMicrotask(() => stop())
      },
      { immediate: true },
    )
  }
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearTimeout(timer)
  window.removeEventListener('keydown', surTouche)
  window.removeEventListener('wheel', surMolette)
  window.removeEventListener('touchstart', surDebutTouch)
  window.removeEventListener('touchend', surFinTouch)
  clearTimeout(finGeste)
  ro?.disconnect()
  io?.disconnect()
  for (const t of textures) if (t.video) {
    t.video.pause()
    t.video.removeAttribute('src')
    t.video.load()
  }
  textures = []
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
  gl = null
})
</script>

<template>
  <div class="screen" :style="{ '--lueur': lueur }">
    <!-- Ambiance autour de l'écran : halo coloré, grain et coins assombris -->
    <div class="ambiance" aria-hidden="true">
      <div class="halo" />
      <div class="grain" />
    </div>
    <div ref="frame" class="frame">
      <div ref="stage" class="stage">
        <canvas
          ref="canvas"
          class="canvas"
          role="link"
          tabindex="0"
          :aria-label="`Voir le projet ${courant.titre}`"
          @pointermove="surMouvement"
          @pointerleave="surSortie"
          @click="ouvrir"
          @keydown.enter="ouvrir"
        />
      </div>
      <!-- Reflet de l'écran sur une surface brillante, sous la télé -->
      <canvas ref="reflet" class="reflet" aria-hidden="true" />
      <!-- Titre du projet centré sur l'image -->
      <Transition :name="sens > 0 ? 'titre-suiv' : 'titre-prec'" mode="out-in">
        <div :key="courant.titre" class="titre">
          <h3>{{ courant.titre }}</h3>
          <span class="label tags">{{ courant.tags.join(' · ') }} — {{ courant.annee }}</span>
        </div>
      </Transition>

      <!-- Rail de traits collés au bord courbe de l'écran : un trait par projet -->
      <nav class="rail" aria-label="Projets">
        <svg class="rail-svg" aria-hidden="true">
          <path
            v-for="(p, i) in items"
            :key="p.slug"
            :ref="(el) => (traits[i] = el as SVGPathElement)"
            class="trait"
            :class="{ survol: survol === i }"
          />
          <path ref="traitActif" class="trait actif" />
        </svg>
        <button
          v-for="(p, i) in items"
          :key="p.slug"
          :ref="(el) => (boutons[i] = el as HTMLElement)"
          type="button"
          class="rail-item"
          :aria-label="p.titre"
          :aria-current="i === index ? 'true' : undefined"
          @click="aller(i)"
          @pointerenter="survol = i"
          @pointerleave="survol = -1"
        >
          <span class="label rail-titre">{{ p.titre }}</span>
        </button>
      </nav>
    </div>

  </div>
</template>

<style scoped>
.screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--fg);
  color: var(--bg);
  /* Le header est superposé (transparent) : on lui garde sa place en haut */
  padding: var(--header-h) var(--gutter) var(--gutter);
  position: relative;
}
/* Fond : la lumière de l'écran déborde sur la pièce sombre */
@property --lueur {
  syntax: '<color>';
  inherits: true;
  initial-value: #333;
}
.screen {
  transition: --lueur 0.9s var(--ease);
}
.ambiance {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
/* Halo de la couleur de l'image affichée ; la couleur change en fondu (voir --lueur) */
.halo {
  position: absolute;
  inset: -10%;
  background:
    radial-gradient(ellipse 45% 38% at 50% 42%, color-mix(in srgb, var(--lueur) 45%, transparent), transparent 70%),
    radial-gradient(ellipse 80% 70% at 50% 50%, color-mix(in srgb, var(--lueur) 18%, transparent), transparent 75%);
  filter: blur(60px);
}
/* Grain de la pièce, qui bouge par à-coups ; plus les coins assombris */
.grain {
  position: absolute;
  inset: -50%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.07;
  animation: grain 0.8s steps(4) infinite;
}
.ambiance::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 75% 75% at 50% 50%, transparent 55%, rgba(0, 0, 0, 0.65));
}
@keyframes grain {
  0% {
    transform: translate(0, 0);
  }
  25% {
    transform: translate(-3%, 2%);
  }
  50% {
    transform: translate(2%, -3%);
  }
  75% {
    transform: translate(-2%, -1%);
  }
}
.frame {
  position: relative;
  flex: 1;
  min-height: 0;
  /* Place sous l'écran pour le reflet */
  margin-bottom: 9vh;
  /* Marge latérale pour un écran un peu moins large que la page */
  margin-inline: 8vw;
}
@media (max-width: 760px) {
  .frame {
    margin-inline: 0;
  }
}
.reflet {
  position: absolute;
  left: 0;
  top: calc(100% + 6px);
  width: 100%;
  height: 22vh;
  pointer-events: none;
  /* Surface vernie : reflet flou, sombre, qui s'efface en s'éloignant de l'écran */
  filter: blur(5px) saturate(1.2);
  opacity: 0.35;
  -webkit-mask-image: linear-gradient(to bottom, #000, rgba(0, 0, 0, 0.35) 35%, transparent 80%);
  mask-image: linear-gradient(to bottom, #000, rgba(0, 0, 0, 0.35) 35%, transparent 80%);
}
.stage {
  position: absolute;
  inset: 0;
}
.canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.titre {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #fff;
  pointer-events: none;
  text-shadow: 0 0.05em 0.6em rgba(0, 0, 0, 0.35);
}
.titre h3 {
  margin: 0 0 0.3em;
  font-size: max(48px, 8vw);
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1;
  /* Parallaxe : --px / --py vont de -1 à 1 (voir parallaxeTitre) */
  transform: translate3d(calc(var(--px, 0) * 1.4vw), calc(var(--py, 0) * 1.2vh), 0);
  /* L'ombre s'allonge du côté opposé : le titre semble décollé de l'image */
  text-shadow: calc(var(--px, 0) * -0.06em) calc(0.05em + var(--py, 0) * -0.05em) 0.6em rgba(0, 0, 0, 0.4);
  will-change: transform;
}
.tags {
  color: #fff;
  text-shadow: 0 0 0.8em rgba(0, 0, 0, 0.7), 0 0 0.2em rgba(0, 0, 0, 0.5);
  transform: translate3d(calc(var(--px, 0) * 0.6vw), calc(var(--py, 0) * 0.5vh), 0);
  will-change: transform;
}
.canvas:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 4px;
}
/* Rail de traits posé sur l'écran (coordonnées en px du cadre) */
.rail {
  position: absolute;
  inset: 0;
  z-index: 7;
  pointer-events: none;
}
.rail-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}
.trait {
  fill: none;
  stroke: rgba(237, 234, 226, 0.3);
  stroke-width: 2;
  stroke-linecap: round;
  transition: stroke 0.3s var(--ease);
}
.trait.survol {
  stroke: rgba(237, 234, 226, 0.7);
}
.trait.actif {
  stroke: var(--bg);
  stroke-width: 3;
}
/* Zone cliquable centrée sur chaque trait (placée en JS) */
.rail-item {
  position: absolute;
  left: 0;
  top: 0;
  width: 28px;
  height: 36px;
  padding: 0;
  background: none;
  border: 0;
  cursor: pointer;
  pointer-events: auto;
}
.rail-item:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 2px;
}
/* Titre du projet qui glisse à gauche du trait au survol */
.rail-titre {
  position: absolute;
  right: calc(100% + 12px);
  top: 50%;
  white-space: nowrap;
  color: var(--bg);
  opacity: 0;
  transform: translate(8px, -50%);
  pointer-events: none;
  transition: opacity 0.3s var(--ease), transform 0.4s var(--ease);
}
.rail-item:hover .rail-titre,
.rail-item:focus-visible .rail-titre {
  opacity: 1;
  transform: translate(0, -50%);
}


/* Titre : glisse dans le sens du défilement, avec un flou de signal */
.titre-suiv-enter-active,
.titre-suiv-leave-active,
.titre-prec-enter-active,
.titre-prec-leave-active {
  transition: opacity 0.35s var(--ease), transform 0.35s var(--ease), filter 0.35s var(--ease);
}
.titre-suiv-enter-from,
.titre-prec-leave-to {
  opacity: 0;
  transform: translateY(0.8em) scaleY(1.15);
  filter: blur(6px);
}
.titre-suiv-leave-to,
.titre-prec-enter-from {
  opacity: 0;
  transform: translateY(-0.8em) scaleY(1.15);
  filter: blur(6px);
}

@media (max-width: 760px) {
  .titre h3 {
    font-size: var(--text-lg);
  }
}
</style>
