<script setup lang="ts">
/**
 * Fin de page projet : la feuille remonte et découvre, sur le fond sombre, l'aperçu du
 * projet suivant, affiché comme l'écran de l'accueil (rendu cathodique WebGL : surface
 * bombée, lignes de balayage, vignettage…), avec son titre. En continuant à défiler,
 * l'aperçu grandit jusqu'au plein écran, puis on bascule sur ce projet — qui commence
 * justement par son image en plein écran : pas de coupure. Un clic fait de même, plus vite.
 * Comme sur l'accueil, l'effet cathodique s'efface pendant que l'aperçu grandit : au plein
 * écran, l'image est plate et nette, identique au hero de la page suivante.
 *
 * La section remonte sous la feuille (marge négative) : sa scène, fixée à l'écran, est
 * cachée derrière la feuille puis découverte quand celle-ci s'en va.
 *
 * Sans projet (`projet` null : tous ont été vus pendant la visite), l'aperçu est un écran de
 * neige « Vous avez tout vu » : arrivé au plein écran, la télé s'éteint sur la page Contact
 * (TeleExtinction, comme l'écran « Votre projet » de l'accueil).
 */
import type { Projet } from '~/utils/projets'

const props = defineProps<{ projet: Projet | null }>()
const fin = computed(() => !props.projet)
const extinctionVers = useState<string | null>('extinctionVers', () => null)
const neige = ref<HTMLCanvasElement>()

const { $gsap } = useNuxtApp()
const root = ref<HTMLElement>()
const cadre = ref<HTMLElement>()
const video = ref<HTMLVideoElement>()
const videoTemps = useState<number>('videoTemps', () => 0)
const instantane = useState<string | null>('videoInstantane', () => null)
const dest = computed(() => (props.projet ? `/projets/${props.projet.slug}` : '/contact'))
const statique = ref(false)
const scene = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
const image = ref<HTMLImageElement>()
// true quand le rendu cathodique WebGL a pris le relais de l'image HTML
const webgl = ref(false)

// ——— Rendu cathodique (le même que l'écran de l'accueil, sans les transitions) ———
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
uniform sampler2D uTex;
uniform vec2 uImg;      // taille du visuel
uniform vec2 uRes;      // taille de l'écran dessiné, en px
uniform vec4 uRect;     // zone de l'écran dans le canvas (x, y depuis le bas, largeur, hauteur)
uniform float uBulge;   // intensité du bombé
uniform float uFx;      // 1 = effets cathodiques, 0 = image nette
uniform float uTime;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec2 cover(vec2 uv) {
  float rs = uRes.x / uRes.y, ri = uImg.x / uImg.y;
  vec2 s = rs < ri ? vec2(rs / ri, 1.0) : vec2(1.0, ri / rs);
  return (uv - 0.5) * s + 0.5;
}

void main() {
  // Distorsion de tube : chaque bord se courbe vers l'extérieur, les coins sont rognés
  vec2 luv = (vUv - uRect.xy) / uRect.zw;
  vec2 c = luv - 0.5;
  float r2 = dot(c, c);
  vec2 uv = luv + c * (vec2(c.y * c.y, c.x * c.x) * uBulge + r2 * uBulge * 0.05);
  vec2 edge = smoothstep(0.0, 0.004, uv) * smoothstep(0.0, 0.004, 1.0 - uv);
  float mask = edge.x * edge.y;

  // Aberration chromatique vers les bords
  vec2 ca = c * r2 * 0.025 * uFx;
  vec3 col = vec3(
    texture2D(uTex, cover(uv + ca)).r,
    texture2D(uTex, cover(uv)).g,
    texture2D(uTex, cover(uv - ca)).b);

  // Vignette, lignes de balayage, phosphores, grain, scintillement
  float vig = smoothstep(0.85, 0.2, r2 * 2.2);
  col *= mix(1.0, mix(0.35, 1.0, vig), uFx);
  float scan = 0.5 + 0.5 * sin(gl_FragCoord.y * 2.1);
  col *= mix(1.0, 0.78 + 0.22 * scan, uFx);
  float px = mod(gl_FragCoord.x, 3.0);
  vec3 phos = vec3(px < 1.0 ? 1.0 : 0.85, px >= 1.0 && px < 2.0 ? 1.0 : 0.85, px >= 2.0 ? 1.0 : 0.85);
  col *= mix(vec3(1.0), phos, uFx * 0.6);
  float g = hash(gl_FragCoord.xy + fract(uTime * 3.0) * 113.0) - 0.5;
  col += g * 0.06 * uFx;
  col *= 1.0 + 0.015 * sin(uTime * 60.0) * uFx;
  col = clamp((col - 0.5) * (1.0 + 0.08 * uFx) + 0.5 + 0.04 * uFx, 0.0, 1.0);

  gl_FragColor = vec4(col * mask, mask);
}`

const BULGE = 0.4 // bombé au repos, comme l'écran de l'accueil
let nettoyerGl: (() => void) | undefined

/** Met en place le rendu WebGL ; renvoie false si indisponible (l'image HTML reste affichée) */
function initGl(): boolean {
  const el = canvas.value
  // Source : la vidéo, l'image, ou la neige (« Vous avez tout vu ») dessinée dans un canvas
  const source = video.value ?? image.value ?? neige.value
  if (!el || !source || !cadre.value || !scene.value) return false
  const gl = el.getContext('webgl', { premultipliedAlpha: true, alpha: true })
  if (!gl) return false
  const shader = (type: number, src: string) => {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    return sh
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[ProjetSuite]', gl.getProgramInfoLog(prog))
    return false
  }
  gl.useProgram(prog)
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  const u = (n: string) => gl.getUniformLocation(prog, n)
  const uImg = u('uImg'), uRes = u('uRes'), uRect = u('uRect'), uBulge = u('uBulge'), uFx = u('uFx'), uTime = u('uTime')

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const estVideo = source instanceof HTMLVideoElement
  const estNeige = source instanceof HTMLCanvasElement
  // Vidéo et neige changent à chaque image : renvoyées au GPU à chaque tour
  const anime = estVideo || estNeige
  // Neige : gros pixels nets (pas lissés) une fois agrandie
  if (estNeige) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  }
  let charge = false
  const envoyer = () => {
    const pret = estVideo
      ? source.readyState >= 2
      : estNeige || ((source as HTMLImageElement).complete && (source as HTMLImageElement).naturalWidth > 0)
    if (!pret) return
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    charge = true
  }

  // Taille du canvas = la scène (plein écran) ; l'aperçu est dessiné dans la zone du cadre
  const redimensionner = () => {
    const dpr = Math.min(devicePixelRatio, 2)
    el.width = el.clientWidth * dpr
    el.height = el.clientHeight * dpr
    gl.viewport(0, 0, el.width, el.height)
  }
  redimensionner()
  const ro = new ResizeObserver(redimensionner)
  ro.observe(el)

  let visible = false
  const io = new IntersectionObserver(([e]) => (visible = !!e?.isIntersecting))
  io.observe(scene.value)

  let raf = 0
  const boucle = (t: number) => {
    raf = requestAnimationFrame(boucle)
    if (!visible || !cadre.value) return
    if (anime || !charge) envoyer()
    if (!charge) return
    const c = el.getBoundingClientRect()
    const r = cadre.value.getBoundingClientRect()
    // Avancement de l'agrandissement : 0 au repos, 1 au plein écran → effet de plus en plus léger
    const repos = taille().w
    const p = Math.min(1, Math.max(0, (r.width - repos) / Math.max(1, c.width - repos)))
    const w = estVideo ? source.videoWidth : estNeige ? source.width : (source as HTMLImageElement).naturalWidth
    const h = estVideo ? source.videoHeight : estNeige ? source.height : (source as HTMLImageElement).naturalHeight
    gl.uniform2f(uImg, w, h)
    gl.uniform2f(uRes, r.width, r.height)
    gl.uniform4f(uRect, (r.left - c.left) / c.width, (c.bottom - r.bottom) / c.height, r.width / c.width, r.height / c.height)
    gl.uniform1f(uBulge, BULGE * (1 - p))
    gl.uniform1f(uFx, 1 - p)
    gl.uniform1f(uTime, (t / 1000) % 100)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  raf = requestAnimationFrame(boucle)

  nettoyerGl = () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    io.disconnect()
    gl.deleteTexture(tex)
    gl.deleteBuffer(buf)
    gl.deleteProgram(prog)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
  return true
}

let parti = false
let arme = false
/** Bascule sur le projet suivant (la vidéo reprend au même instant, comme depuis l'accueil) */
function partir() {
  if (parti) return
  parti = true
  if (fin.value) {
    // Tour terminé : on repart de zéro, et la télé s'éteint sur la page Contact
    oublierVus()
    if (statique.value) return navigateTo(dest.value)
    extinctionVers.value = dest.value
    return
  }
  const v = video.value
  videoTemps.value = v?.currentTime ?? 0
  instantane.value = v ? capturerVideo(v) : null
  navigateTo(dest.value)
}

let ctx: ReturnType<typeof $gsap.context> | undefined
let grandir: ReturnType<typeof $gsap.fromTo> | undefined

/** Clic : l'aperçu grandit d'un coup jusqu'au plein écran, puis on part */
function ouvrir() {
  if (statique.value || !cadre.value) return partir()
  grandir?.scrollTrigger?.disable(false)
  $gsap.to(cadre.value, {
    width: innerWidth,
    height: innerHeight,
    borderRadius: 0,
    duration: 0.8,
    ease: 'power4.inOut',
    overwrite: true,
    onComplete: partir,
  })
  $gsap.to('.suite-texte', { opacity: 0, duration: 0.3 })
}

onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    statique.value = true
    return
  }
  // Tout vu : la neige est dessinée dans un canvas, que le rendu cathodique bombe comme une image
  if (fin.value) demarrerNeige()
  webgl.value = initGl()
  ctx = $gsap.context(() => {
    // Aperçu : grandit pendant la dernière partie du défilement (une fois la feuille partie)
    grandir = $gsap.fromTo(
      cadre.value!,
      { width: () => taille().w, height: () => taille().h, borderRadius: () => taille().r },
      {
        width: () => innerWidth,
        height: () => innerHeight,
        borderRadius: 0,
        ease: 'power2.in',
        scrollTrigger: {
          trigger: root.value!,
          // La scène se fixe quand le haut de la section atteint le haut de l'écran ; la feuille
          // s'en va pendant un écran de défilement, puis l'aperçu grandit jusqu'à la fin
          start: 'top -100%',
          end: 'bottom bottom',
          scrub: 0.6,
          invalidateOnRefresh: true,
          onUpdate: (s) => {
            // Armé seulement une fois qu'on a vu l'aperçu avant qu'il ait fini de grandir :
            // à l'arrivée sur une page encore défilée tout en bas (avant le retour en haut),
            // la fin ne doit pas se déclencher toute seule et enchaîner sur le projet d'après
            if (s.progress < 0.9) arme = true
            if (arme && s.progress > 0.995 && s.direction > 0) partir()
          },
        },
      },
    )
    // Textes : s'effacent pendant que l'aperçu grandit
    $gsap.to('.suite-texte', {
      opacity: 0,
      y: -20,
      ease: 'none',
      scrollTrigger: { trigger: root.value!, start: 'top -100%', end: 'top -140%', scrub: true },
    })
  }, root.value)
})
onBeforeUnmount(() => {
  ctx?.revert()
  nettoyerGl?.()
  cancelAnimationFrame(rafNeige)
})

// ——— Écran de neige (« Vous avez tout vu ») : grain gris à basse résolution, agrandi ———
let rafNeige = 0
function demarrerNeige() {
  const c = neige.value
  const g = c?.getContext('2d')
  if (!c || !g) return
  c.width = 240
  c.height = 150
  const img = g.createImageData(c.width, c.height)
  const dessiner = () => {
    const d = img.data
    for (let k = 0; k < d.length; k += 4) {
      const v = (Math.random() * 230) | 0
      d[k] = d[k + 1] = d[k + 2] = v
      d[k + 3] = 255
    }
    g.putImageData(img, 0, 0)
    rafNeige = requestAnimationFrame(dessiner)
  }
  dessiner()
}

/** Taille de l'aperçu au repos (paysage, ~46 % de la largeur ; plus large sur mobile) */
function taille() {
  const w = innerWidth < 760 ? innerWidth * 0.84 : Math.min(innerWidth * 0.46, innerHeight * 0.95)
  return { w, h: w * (10 / 16), r: Math.min(28, Math.max(14, innerWidth * 0.016)) }
}
</script>

<template>
  <section
    ref="root"
    class="suite"
    :class="{ statique, webgl, fin }"
    data-header-clair
    :aria-label="fin ? 'Vous avez tout vu' : 'Projet suivant'"
  >
    <div ref="scene" class="scene">
      <!-- Rendu cathodique de l'aperçu, dessiné à l'emplacement du cadre (qui reste cliquable) -->
      <canvas ref="canvas" class="ecran" aria-hidden="true" />
      <div class="bloc">
        <button
          ref="cadre"
          type="button"
          class="cadre"
          :aria-label="projet ? `Voir le projet ${projet.titre}` : 'Vous avez tout vu : nous contacter'"
          @click="ouvrir"
        >
          <!-- Tout vu : neige télé, comme l'écran « Votre projet » de l'accueil -->
          <template v-if="!projet">
            <canvas ref="neige" class="neige" aria-hidden="true" />
            <span class="tube" aria-hidden="true" />
          </template>
          <video
            v-else-if="projet.video"
            ref="video"
            :src="projet.video"
            :poster="projet.image"
            autoplay
            muted
            loop
            playsinline
            aria-hidden="true"
          />
          <img v-else-if="projet.image" ref="image" :src="projet.image" alt="" />
        </button>
        <div class="infos suite-texte">
          <template v-if="projet">
            <span class="titre">{{ projet.titre }}</span>
            <span class="label">{{ projet.tags.join(' · ') }}</span>
          </template>
          <template v-else>
            <span class="titre">Vous avez <span class="serif">tout vu</span></span>
            <span class="label">Parlons maintenant du vôtre</span>
          </template>
        </div>
      </div>
      <span class="indice label suite-texte" aria-hidden="true">{{ projet ? 'Continuer pour ouvrir' : 'Continuer vers le contact' }}</span>
    </div>
  </section>
</template>

<style scoped>
/* La section remonte d'un écran sous la feuille : on la découvre quand la feuille s'en va */
.suite {
  position: relative;
  z-index: 0;
  height: 300svh;
  margin-top: -100svh;
  color: var(--bg);
}
.scene {
  position: sticky;
  top: 0;
  height: 100svh;
  overflow: hidden;
  display: grid;
  place-items: center;
}
.bloc {
  position: relative;
  display: grid;
  justify-items: center;
}
.cadre {
  position: relative;
  display: block;
  padding: 0;
  border: 0;
  overflow: hidden;
  background: #222;
  border-radius: clamp(14px, 1.6vw, 28px);
  corner-shape: squircle;
  cursor: pointer;
  /* Taille de repos (remplacée par GSAP qui la fait grandir) */
  width: min(46vw, 95svh);
  aspect-ratio: 16 / 10;
}
/* Canvas plein écran au-dessus du cadre : il dessine l'aperçu à son emplacement ;
   les clics passent au travers jusqu'au cadre */
.ecran {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
/* Rendu WebGL actif : le cadre HTML ne sert plus qu'à la place et au clic */
.webgl .cadre {
  background: transparent;
}
.webgl .cadre video,
.webgl .cadre img,
.webgl .cadre .neige,
.webgl .cadre .tube {
  opacity: 0;
}
.cadre video,
.cadre img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
/* Neige (« Vous avez tout vu ») : grain en gros pixels, lignes de balayage et vignette */
.neige {
  width: 100%;
  height: 100%;
  display: block;
  image-rendering: pixelated;
}
.tube {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    repeating-linear-gradient(to bottom, rgba(0, 0, 0, 0.28) 0 1px, transparent 1px 3px),
    radial-gradient(120% 90% at 50% 45%, transparent 45%, rgba(0, 0, 0, 0.6) 100%);
}
.cadre:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
}
/* Titre sous l'aperçu, hors du flux : l'aperçu reste centré à l'écran quand il grandit */
.infos {
  position: absolute;
  z-index: 2;
  top: 100%;
  /* Centré sans translate (GSAP anime le transform de ce bloc) */
  left: -50vw;
  right: -50vw;
  display: grid;
  justify-items: center;
  gap: 0.3em;
  padding-top: 1.4em;
  text-align: center;
}
.titre {
  font-size: var(--text-lg);
  letter-spacing: -0.03em;
  line-height: 1;
}
.infos .label {
  opacity: 0.6;
}
.indice {
  position: absolute;
  bottom: var(--gutter);
  left: 0;
  right: 0;
  text-align: center;
  opacity: 0.5;
}
@media (max-width: 760px) {
  .cadre {
    width: 84vw;
  }
}

/* Sans animation : un simple bloc cliquable sous la feuille */
.statique {
  height: auto;
  margin-top: 0;
  padding-block: 12vh;
}
.statique .scene {
  position: static;
  height: auto;
}
.statique .indice,
.statique .ecran {
  display: none;
}
</style>
