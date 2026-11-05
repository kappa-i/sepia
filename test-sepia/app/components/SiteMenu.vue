<script setup lang="ts">
/**
 * Menu plein écran au rendu cathodique : il s'allume comme un vieux téléviseur
 * (ligne lumineuse qui s'ouvre) ; au survol d'un lien, petit coup de neige
 * et changement de l'image en fond. À la fermeture, l'image s'écrase en une ligne
 * puis un point, comme une télé qu'on éteint.
 */
const ouvert = useState('menuOuvert', () => false)
const projetIndex = useState('projetIndex', () => 0)
const route = useRoute()
const { $gsap } = useNuxtApp()

const root = ref<HTMLElement>()
const ecran = ref<HTMLElement>()
const contenu = ref<HTMLElement>()
const neige = ref<HTMLCanvasElement>()
// Fin de fermeture : voile noir percé d'une étoile, à travers laquelle on voit l'écran
const trou = ref<SVGSVGElement>()
const etoilePath = ref<SVGPathElement>()
const visible = ref(false)

// Lien survolé (id d'un des liens ci-dessous)
const chaine = ref('projets')
const liens = [
  { id: 'projets', num: '01', nom: 'Projets', to: '/', info: `(${projets.length})` },
  { id: 'services', num: '02', nom: 'Services', to: '/services', info: '' },
  { id: 'studio', num: '03', nom: 'Studio', to: '/studio', info: '' },
  { id: 'contact', num: '04', nom: 'Contact', to: '/contact', info: '' },
]
// Visuel en fond : le projet affiché sur l'accueil pour « Projets », de la neige pour « Contact »
const imageFond = computed(() => (chaine.value === 'projets' ? projets[projetIndex.value]?.image : undefined))

let reduit = false

// ——— Neige télé : petit canvas basse résolution agrandi en pixels nets ———
const bruit = { niveau: 0 } // opacité de la neige, animée par GSAP
let raf = 0
let ctx: CanvasRenderingContext2D | null = null
let img: ImageData | null = null

function dessinerNeige() {
  const c = neige.value
  if (c && ctx && img) {
    const d = img.data
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0
      d[i] = d[i + 1] = d[i + 2] = v
      d[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    c.style.opacity = String(bruit.niveau)
  }
  raf = requestAnimationFrame(dessinerNeige)
}

/** Neige de fond selon la chaîne : la chaîne « Contact » n'a pas d'image, elle grésille */
function niveauRepos() {
  return chaine.value === 'contact' ? 0.32 : 0.07
}

function zapper(id: string) {
  if (id === chaine.value) return
  chaine.value = id
  if (reduit) {
    bruit.niveau = niveauRepos()
    return
  }
  $gsap.killTweensOf(bruit)
  $gsap.fromTo(bruit, { niveau: 0.85 }, { niveau: niveauRepos(), duration: 0.35, ease: 'power2.out' })
}

// ——— Allumage / extinction ———
function allumer() {
  visible.value = true
  chaine.value = liens.find((l) => l.to !== '/' && route.path.startsWith(l.to))?.id ?? 'projets'
  nextTick(() => {
    const c = neige.value
    if (c && !ctx) {
      c.width = 192
      c.height = 108
      ctx = c.getContext('2d')
      img = ctx?.createImageData(c.width, c.height) ?? null
    }
    cancelAnimationFrame(raf)
    dessinerNeige()
    root.value?.querySelector<HTMLElement>('.lien')?.focus({ preventScroll: true })

    if (reduit) {
      bruit.niveau = niveauRepos()
      $gsap.fromTo(root.value!, { opacity: 0 }, { opacity: 1, duration: 0.2 })
      return
    }
    const items = contenu.value!.querySelectorAll('.apparait')
    $gsap.killTweensOf([root.value, ecran.value, bruit, items])
    // Réouverture pendant une fermeture : on remet l'écran et le fond noir
    $gsap.killTweensOf([trou.value, forme])
    $gsap.set(ecran.value!, { opacity: 1 })
    $gsap.set(trou.value!, { opacity: 0 })
    $gsap.set(root.value!, { backgroundColor: '#050505' })
    $gsap
      .timeline()
      .fromTo(root.value!, { opacity: 0 }, { opacity: 1, duration: 0.12 })
      // Une ligne lumineuse s'élargit, puis s'ouvre sur toute la hauteur
      .fromTo(
        ecran.value!,
        { scaleX: 0.3, scaleY: 0.004, filter: 'brightness(5)' },
        { scaleX: 1, duration: 0.2, ease: 'power2.out' },
        0.05,
      )
      .to(ecran.value!, { scaleY: 1, duration: 0.4, ease: 'expo.out' })
      .to(ecran.value!, { filter: 'brightness(1)', duration: 0.5, ease: 'power2.out' }, '<')
      .fromTo(bruit, { niveau: 1 }, { niveau: niveauRepos(), duration: 0.7, ease: 'power2.in' }, '<')
      .fromTo(
        items,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.04 },
        '<0.2',
      )
  })
}

// Taille de l'étoile percée dans le voile noir (demi-largeur, demi-hauteur, agrandissement)
const forme = { sx: 0, sy: 0, k: 1 }
function majEtoile() {
  const W = window.innerWidth
  const H = window.innerHeight
  etoilePath.value?.setAttribute(
    'transform',
    `translate(${W / 2} ${H / 2}) scale(${forme.sx * forme.k} ${forme.sy * forme.k})`,
  )
}

function eteindre() {
  const fin = () => {
    visible.value = false
    cancelAnimationFrame(raf)
  }
  if (reduit || !root.value) {
    if (root.value) $gsap.to(root.value, { opacity: 0, duration: 0.2, onComplete: fin })
    else fin()
    return
  }
  const W = window.innerWidth
  const H = window.innerHeight
  // Au départ, l'étoile a exactement la taille de la ligne de l'écran écrasé
  Object.assign(forme, { sx: (W - 12) / 2, sy: 2, k: 1 })
  majEtoile()
  $gsap.killTweensOf([root.value, ecran.value, bruit, trou.value, forme])
  $gsap
    .timeline({
      onComplete: () => {
        $gsap.set(trou.value!, { opacity: 0 })
        fin()
      },
    })
    .to(bruit, { niveau: 0.6, duration: 0.1 })
    // L'image s'écrase en une ligne blanche sur le fond noir…
    .to(ecran.value!, { scaleY: 0.004, filter: 'brightness(5)', duration: 0.25, ease: 'power3.in' }, 0)
    // …la ligne devient une étoile découpée dans le noir, à travers laquelle on voit encore l'écran
    .set(ecran.value!, { scaleY: 1, filter: 'brightness(2)' }, 0.25)
    .set(trou.value!, { opacity: 1 }, 0.25)
    // Elle se resserre et ses pointes verticales poussent : une étoile allongée…
    .to(forme, { sx: W * 0.12, duration: 0.3, ease: 'power3.inOut', onUpdate: majEtoile }, 0.25)
    .to(forme, { sy: H * 0.06, duration: 0.2, ease: 'power2.out', onUpdate: majEtoile }, 0.28)
    // …qui se referme en un point : c'est la dernière chose qui s'éteint
    .to(forme, { k: 0, duration: 0.28, ease: 'power3.in', onUpdate: majEtoile }, 0.5)
    // Puis le noir s'efface et la page réapparaît
    .to(root.value, { opacity: 0, duration: 0.25, ease: 'power2.out' }, 0.82)
}

watch(ouvert, (o) => (o ? allumer() : eteindre()))
watch(() => route.fullPath, () => (ouvert.value = false))

function choisir() {
  ouvert.value = false
}

function surTouche(e: KeyboardEvent) {
  if (e.key === 'Escape' && ouvert.value) {
    ouvert.value = false
    document.querySelector<HTMLElement>('.menu-btn')?.focus()
  }
}

onMounted(() => {
  reduit = matchMedia('(prefers-reduced-motion: reduce)').matches
  document.addEventListener('keydown', surTouche)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', surTouche)
  cancelAnimationFrame(raf)
  ouvert.value = false
})
</script>

<template>
  <div
    v-show="visible"
    id="menu"
    ref="root"
    class="tv"
    role="dialog"
    aria-modal="true"
    aria-label="Menu"
  >
    <div ref="ecran" class="ecran">
      <!-- Image de la chaîne en cours -->
      <div class="fond" aria-hidden="true">
        <img
          v-for="p in projets"
          :key="p.slug"
          :src="p.image"
          alt=""
          class="fond-img"
          :class="{ actif: imageFond === p.image }"
          loading="lazy"
        />
      </div>
      <canvas ref="neige" class="neige" aria-hidden="true" />
      <div class="tube" aria-hidden="true" />

      <div ref="contenu" class="contenu">
        <nav class="chaines" aria-label="Menu principal">
          <ul class="principal">
            <li v-for="l in liens" :key="l.id" class="apparait">
              <NuxtLink
                :to="l.to"
                class="lien"
                :class="{ actif: chaine === l.id }"
                @pointerenter="zapper(l.id)"
                @focus="zapper(l.id)"
                @click="choisir"
              >
                <span class="num label">{{ l.num }}</span>
                <span class="nom">{{ l.nom }}</span>
                <span v-if="l.info" class="compte label">{{ l.info }}</span>
              </NuxtLink>
            </li>
          </ul>

        </nav>

        <div class="bas apparait">
          <div class="bloc">
            <span class="label titre-bloc">Écrire</span>
            <a :href="`mailto:${email}`" class="link">{{ email }}</a>
          </div>
          <div class="bloc bloc-droite">
            <span class="label titre-bloc">Suivre</span>
            <span class="reseaux">
              <a v-for="r in reseaux" :key="r.nom" :href="r.url" target="_blank" rel="noopener" class="link">{{ r.nom }}</a>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Fin de fermeture : voile noir percé d'une étoile allongée qui se referme -->
    <svg ref="trou" class="trou" aria-hidden="true">
      <defs>
        <!-- Étoile à 4 branches aux côtés creusés, de -1 à 1 : mise à l'échelle en JS -->
        <path
          id="menu-etoile"
          ref="etoilePath"
          d="M-1 0 Q-0.12 -0.12 0 -1 Q0.12 -0.12 1 0 Q0.12 0.12 0 1 Q-0.12 0.12 -1 0 Z"
        />
        <!-- Bord flou de l'ouverture, en px (appliqué hors de la mise à l'échelle) -->
        <filter id="menu-trou-flou" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" />
        </filter>
        <!-- Halo de phosphore autour de l'étoile -->
        <filter id="menu-trou-halo" x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <mask id="menu-trou-masque" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
          <rect width="100%" height="100%" fill="#fff" />
          <g filter="url(#menu-trou-flou)">
            <use href="#menu-etoile" fill="#000" />
          </g>
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="#050505" mask="url(#menu-trou-masque)" />
      <g filter="url(#menu-trou-halo)" opacity="0.35" style="mix-blend-mode: screen">
        <use href="#menu-etoile" fill="#edeae2" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.tv {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: #050505;
  color: var(--bg);
}
/* L'écran : légèrement en retrait, coins arrondis comme un tube */
.ecran {
  position: absolute;
  inset: 6px;
  overflow: hidden;
  border-radius: clamp(14px, 2.4vw, 36px);
  background: #0d0d0c;
  transform-origin: 50% 50%;
}

.fond {
  position: absolute;
  inset: 0;
}
.fond-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transform: scale(1.06);
  /* Image en retrait, teintée sépia : c'est le menu qu'on lit, pas la photo */
  filter: grayscale(0.4) sepia(0.35) contrast(1.05) blur(2px);
  transition: opacity 0.25s steps(3), transform 1.2s var(--ease);
}
.fond-img.actif {
  opacity: 0.22;
  transform: scale(1);
}

.neige {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  mix-blend-mode: screen;
  pointer-events: none;
}

/* Effets du tube : lignes de balayage, vignette, reflet et léger scintillement */
.tube {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    repeating-linear-gradient(to bottom, rgba(0, 0, 0, 0.28) 0 1px, transparent 1px 3px),
    radial-gradient(120% 90% at 50% 45%, transparent 45%, rgba(0, 0, 0, 0.75) 100%),
    linear-gradient(to right, rgba(5, 5, 5, 0.85), rgba(5, 5, 5, 0.35) 70%);
  box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.8);
  animation: scintille 0.12s steps(2) infinite;
}
@keyframes scintille {
  50% {
    opacity: 0.93;
  }
}

.contenu {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: calc(var(--header-h) + 2vh) calc(var(--gutter) - 6px) calc(var(--gutter) - 6px);
}

.chaines {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 0;
}
ul {
  margin: 0;
  padding: 0;
  list-style: none;
}
.num {
  color: rgba(237, 234, 226, 0.4);
  font-variant-numeric: tabular-nums;
  transition: color 0.3s var(--ease);
}

/* Liens principaux : très grands */
.lien {
  display: inline-flex;
  align-items: baseline;
  gap: 0.6em;
  line-height: 1;
}
.lien .num {
  min-width: 2.4em;
}
.nom {
  /* Limité aussi par la hauteur : les 4 liens doivent tenir dans l'écran */
  font-size: clamp(44px, min(9vw, 13vh), 180px);
  font-weight: 500;
  letter-spacing: -0.045em;
  transition: transform 0.6s var(--ease), opacity 0.4s var(--ease);
}
.compte {
  align-self: flex-start;
  margin-top: 1em;
  color: rgba(237, 234, 226, 0.5);
}
/* Survol : le mot glisse, les autres liens s'estompent */
.lien.actif .nom {
  transform: translateX(0.12em);
}
.lien.actif .num {
  color: var(--bg);
}
.principal:has(.actif) .lien:not(.actif) .nom {
  opacity: 0.3;
}
.lien:focus-visible {
  outline: 1px solid rgba(237, 234, 226, 0.6);
  outline-offset: 6px;
}

.bas {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5em;
  flex-wrap: wrap;
}
.bloc {
  display: flex;
  flex-direction: column;
  gap: 0.4em;
}
.bloc-droite {
  align-items: flex-end;
}
.titre-bloc {
  color: rgba(237, 234, 226, 0.4);
}
.reseaux {
  display: flex;
  gap: 1.5em;
}

@media (max-width: 760px) {
  .bloc-droite {
    align-items: flex-start;
  }
}
.trou {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .tube {
    animation: none;
  }
}
</style>
