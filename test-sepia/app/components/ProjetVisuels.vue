<script setup lang="ts">
/**
 * Visuels du projet « en profondeur » : la section se bloque pendant qu'on défile,
 * et les visuels arrivent du fond de l'écran, l'un après l'autre, comme dans un couloir.
 * Chacun grandit, s'écarte sur le côté en passant près de nous (en pivotant un peu),
 * puis disparaît pour laisser place au suivant. Des points et le titre du visuel en cours suivent l'avancée.
 * Tout est lié au défilement (on peut revenir en arrière).
 *
 * Défilement par étapes dans la section : un geste (molette, trackpad, swipe, flèches)
 * = un visuel, comme sur l'écran de l'accueil. Le défilement libre y est bloqué, l'élan
 * d'un trackpad ne fait pas sauter de visuel ; aux deux bouts, on sort normalement.
 */
import type { Visuel } from '~/utils/projets'

const props = defineProps<{ visuels: Visuel[] }>()

const { $gsap } = useNuxtApp()
// Mouvement réduit ou mode léger (voir useLeger) : pas d'animation
const { leger, reduit } = useLeger()
const root = ref<HTMLElement>()
const actuel = ref(0)
const statique = ref(false)

// Réglages du couloir (unités = « un visuel » de défilement)
const TRAJET = 1.8 // durée du trajet d'un visuel, du fond jusqu'à nous
const ECART = 1 // décalage entre deux visuels qui se suivent
const Z_FOND = -2600 // profondeur de départ, en px
const Z_PROCHE = 700 // profondeur d'arrivée (déjà derrière nous)
const DEFILEMENT = 85 // hauteur de défilement par unité, en vh
const POSE = 0.6 // étapes : moment du trajet où un visuel est « posé » devant nous (0 = au fond, 1 = passé)
const DUREE_ETAPE = 1.1 // durée du passage d'un visuel au suivant, en secondes

// Le couloir commence sur le premier visuel posé et finit sur le dernier : pas d'écran vide
// à l'entrée ni à la sortie. Longueur parcourue = d'une pose à l'autre.
const longueur = computed(() => (props.visuels.length - 1) * ECART)

// Intensité du pli pendant le glissé d'un visuel à l'autre (1 = pli maximal au milieu)
const PLI = 0.9

let ctx: ReturnType<typeof $gsap.context> | undefined
let deformer: (() => void) | undefined
const plans = new Map<HTMLElement, PlanCourbe>()
onMounted(() => {
  if (reduit()) {
    statique.value = true
    return
  }
  ctx = $gsap.context(() => {
    const tl = $gsap.timeline({
      defaults: { ease: 'none' },
      paused: true,
      // Mis à jour au rythme de l'animation (qui suit le défilement avec un léger retard)
      onUpdate: () => {
        // Le visuel « actuel » est celui qui est au milieu de son trajet
        const i = Math.round(tl.time() - TRAJET / 2)
        actuel.value = Math.min(props.visuels.length - 1, Math.max(0, i))
      },
    })
    $gsap.utils.toArray<HTMLElement>('.visuel').forEach((v, n) => {
      const cote = n % 2 ? 1 : -1
      const debut = n * ECART
      // Avance du fond vers nous, à vitesse constante (la perspective fait l'accélération)
      tl.fromTo(v, { z: Z_FOND }, { z: Z_PROCHE, duration: TRAJET }, debut)
        // En approchant, il s'écarte sur le côté et pivote : il passe à côté de nous
        .fromTo(
          v,
          { xPercent: -50, yPercent: -50, x: 0, rotateY: 0 },
          { x: () => cote * innerWidth * 0.42, rotateY: cote * -22, duration: TRAJET, ease: 'power2.in' },
          debut,
        )
        // Apparition au loin, disparition une fois passé
        .fromTo(v, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35 }, debut)
        .to(v, { autoAlpha: 0, duration: 0.3 }, debut + TRAJET - 0.3)
    })

    // Le défilement pilote le couloir de la pose du premier visuel à celle du dernier
    const premiere = TRAJET * POSE
    const derniere = premiere + longueur.value
    tl.time(premiere)
    const pilote = $gsap.fromTo(
      tl,
      { time: premiere },
      {
        time: derniere,
        ease: 'none',
        scrollTrigger: { trigger: root.value!, start: 'top top', end: 'bottom bottom', scrub: 1 },
      },
    )

    // Distorsion pendant le glissé d'un visuel à l'autre (et seulement là : ni à l'entrée,
    // ni à la sortie de la section) : chaque visuel se plie comme une feuille qui fend l'air
    // (rendu WebGL, voir utils/planCourbe.ts) et se vrille un peu de son côté.
    // À l'arrêt, c'est de nouveau la simple <img> qui est affichée.
    const st = pilote.scrollTrigger!
    const figures = $gsap.utils.toArray<HTMLElement>('.visuel')
    // Pli courant (-1 à 1), calculé par l'animation de passage (voir aller)
    const pli = { c: 0 }
    // Réponse en courbe (pas linéaire) : monte vite, plafonne en douceur
    const reponse = (v: number) => Math.sign(v) * (1 - (1 - Math.min(1, Math.abs(v))) ** 2.2)

    // Un plan WebGL par visuel, préparé une fois son image chargée
    figures.forEach((f) => {
      const media = f.querySelector<HTMLImageElement | HTMLVideoElement>('img, video')!
      const pret =
        media instanceof HTMLVideoElement
          ? new Promise<void>((ok) => (media.readyState >= 2 ? ok() : media.addEventListener('loadeddata', () => ok(), { once: true })))
          : ((media.loading = 'eager'), media.decode().catch(() => {}))
      pret.then(() => {
        if (!root.value) return
        const canvas = document.createElement('canvas')
        canvas.className = 'plan'
        canvas.setAttribute('aria-hidden', 'true')
        f.appendChild(canvas)
        const rayon = parseFloat(getComputedStyle(f).borderTopLeftRadius) || 0
        const plan = creerPlanCourbe(canvas, media, rayon)
        if (plan) plans.set(f, plan)
        else canvas.remove()
      })
    })

    let aPlat = true
    deformer = () => {
      const c = pli.c
      const plie = Math.abs(c) > 0.01
      // Déjà à plat et rien ne bouge : rien à faire
      if (!plie && aPlat) return
      aPlat = !plie
      figures.forEach((f, n) => {
        const plan = plans.get(f)
        if (!plan) return
        // Un visuel invisible (au fond ou déjà passé) reste à plat : rien à dessiner
        const visible = f.style.visibility !== 'hidden'
        f.classList.toggle('en-mouvement', plie && visible)
        // Légère bascule en plus du pli
        $gsap.set(f, { rotateX: visible ? -c * 8 : 0 })
        if (plie && visible) plan.dessiner(c, (n % 2 ? 1 : -1) * c * 0.7, f.offsetWidth, f.offsetHeight)
      })
    }
    $gsap.ticker.add(deformer)

    // ——— Défilement par étapes ———
    // Étapes, en px de défilement : un par visuel « posé » (le premier au début de la section,
    // le dernier à la fin), réparties régulièrement
    const etapes = () => {
      const n = props.visuels.length
      return props.visuels.map((_, k) => st.start + (n > 1 ? k / (n - 1) : 0) * (st.end - st.start))
    }
    const TOL = 2 // marge en px pour considérer qu'on est sur une étape

    /** Étape suivante dans le sens dir (1 = vers le bas), ou null si on est hors de la section */
    function cible(dir: number): number | null {
      const pts = etapes()
      const y = scrollY
      if (y < pts[0]! - TOL || y > pts.at(-1)! + TOL) return null
      if (dir > 0) return pts.find((p) => p > y + TOL) ?? null
      return [...pts].reverse().find((p) => p < y - TOL) ?? null
    }
    /**
     * Le geste fait-il entrer dans la section depuis l'extérieur ? Dès qu'elle occupe une
     * bonne partie de l'écran (ou si l'élan la traverserait), un seul geste amène le premier
     * visuel en place — ou le dernier en remontant. Sinon il faudrait un premier geste pour
     * approcher, puis un second pour caler : pas naturel.
     */
    const APPROCHE = 0.55 // part de l'écran à partir de laquelle on prend la main
    function entree(dir: number, delta: number): number | null {
      const pts = etapes()
      const y = scrollY
      const zone = innerHeight * APPROCHE
      if (dir > 0 && y < pts[0]! - TOL && (y + delta >= pts[0]! || y >= pts[0]! - zone)) return pts[0]!
      if (dir < 0 && y > pts.at(-1)! + TOL && (y + delta <= pts.at(-1)! || y <= pts.at(-1)! + zone)) return pts.at(-1)!
      return null
    }

    cibleDe = cible
    // Clic sur un point : aller directement au visuel n
    allerAuVisuel = (n: number) => {
      const y = etapes()[n]
      if (y != null) aller?.(y, true)
    }
    entreeDe = entree
    const proxy = { y: 0 }
    aller = (y: number, interne = false) => {
      enCours = true
      const dir = Math.sign(y - scrollY)
      proxy.y = scrollY
      const tw = $gsap.to(proxy, {
        y,
        duration: DUREE_ETAPE,
        ease: 'power3.inOut',
        overwrite: true,
        onUpdate: () => {
          scrollTo(0, proxy.y)
          // Pli = vitesse du glissé : nul au départ, maximal au milieu, nul à l'arrivée.
          // (dérivée de power3.inOut : 12p² puis 12(1 − p)², au plus 3 au milieu)
          if (!interne) return
          const p = tw.progress()
          const v = (p < 0.5 ? 12 * p * p : 12 * (1 - p) ** 2) / 3
          pli.c = dir * reponse(v * PLI)
        },
        onComplete: () => {
          enCours = false
          pli.c = 0
        },
      })
    }
  }, root.value)

  addEventListener('wheel', surMolette, { passive: false })
  addEventListener('touchstart', surDebutTouch, { passive: true })
  addEventListener('touchmove', surTouchMove, { passive: false })
  addEventListener('touchend', surFinTouch, { passive: true })
  addEventListener('keydown', surTouche)
})

// État du défilement par étapes (partagé avec les écouteurs ci-dessous)
const menuOuvert = useState('menuOuvert', () => false)
let aller: ((y: number, interne?: boolean) => void) | undefined
let allerAuVisuel: ((n: number) => void) | undefined
let cibleDe: ((dir: number) => number | null) | undefined
let entreeDe: ((dir: number, delta: number) => number | null) | undefined
let enCours = false // passage d'une étape à l'autre en cours
let verrou = false // geste en cours : levé après 220 ms sans événement (ignore l'élan des trackpads)
let finGeste: ReturnType<typeof setTimeout> | undefined

/** Tente un pas dans le sens dir ; renvoie true si la section a pris le geste en charge */
function pas(dir: number, delta: number): boolean {
  if (menuOuvert.value || !aller || !cibleDe || !entreeDe) return false
  // Entrée dans la section : glissé sans pli ; d'un visuel à l'autre : avec pli
  const e = entreeDe(dir, delta)
  const t = e ?? cibleDe(dir)
  if (t == null) return false
  clearTimeout(finGeste)
  finGeste = setTimeout(() => (verrou = false), 220)
  if (!verrou && !enCours) {
    verrou = true
    aller(t, e == null)
  }
  return true
}

function surMolette(e: WheelEvent) {
  const dir = Math.sign(e.deltaY)
  if (dir && pas(dir, e.deltaY)) e.preventDefault()
}

// Tactile : le défilement natif est bloqué dans la section, un swipe = une étape
let debutY = 0
let dejaPris = false
function surDebutTouch(e: TouchEvent) {
  debutY = e.touches[0]?.clientY ?? 0
  dejaPris = false
}
function surTouchMove(e: TouchEvent) {
  const dy = debutY - (e.touches[0]?.clientY ?? debutY)
  const dir = Math.sign(dy)
  if (!dir || !cibleDe) return
  // Dans la section (ou en train d'y entrer) : on bloque le défilement natif
  if (cibleDe(dir) != null || entreeDe?.(dir, dy) != null) {
    e.preventDefault()
    if (!dejaPris && Math.abs(dy) > 40) {
      dejaPris = true
      verrou = false
      pas(dir, dy)
    }
  }
}
function surFinTouch() {
  dejaPris = false
}

function surTouche(e: KeyboardEvent) {
  if ((e.target as HTMLElement).closest?.('input, textarea, select, [contenteditable]')) return
  const bas = ['ArrowDown', 'PageDown'].includes(e.key) || (e.key === ' ' && !e.shiftKey)
  const haut = ['ArrowUp', 'PageUp'].includes(e.key) || (e.key === ' ' && e.shiftKey)
  if (!bas && !haut) return
  // Espace sur un bouton ou un lien : c'est un clic, pas un défilement
  if (e.key === ' ' && (e.target as HTMLElement).closest?.('button, a')) return
  verrou = false
  if (pas(bas ? 1 : -1, bas ? innerHeight * 0.8 : -innerHeight * 0.8)) e.preventDefault()
}

onBeforeUnmount(() => {
  if (deformer) $gsap.ticker.remove(deformer)
  plans.forEach((p) => p.detruire())
  plans.clear()
  removeEventListener('wheel', surMolette)
  removeEventListener('touchstart', surDebutTouch)
  removeEventListener('touchmove', surTouchMove)
  removeEventListener('touchend', surFinTouch)
  removeEventListener('keydown', surTouche)
  clearTimeout(finGeste)
  ctx?.revert()
})
</script>

<template>
  <section
    ref="root"
    class="profondeur"
    :class="{ statique }"
    :style="{ height: statique ? 'auto' : `calc(100svh + ${longueur * DEFILEMENT}vh)` }"
    aria-label="Visuels du projet"
  >
    <div class="scene">
      <!-- Un visuel est toujours plus proche que ceux qui le suivent : il passe devant (z-index) -->
      <figure
        v-for="(v, n) in visuels"
        :key="n"
        class="visuel"
        :style="{ zIndex: visuels.length - n }"
      >
        <video v-if="v.video && !leger" :src="v.video" :poster="v.src" autoplay muted loop playsinline aria-hidden="true" />
        <img v-else :src="v.src" :alt="v.alt" loading="lazy" />
        <!-- Sans animation, la légende animée est masquée : chaque visuel garde son titre -->
        <figcaption v-if="statique && v.titre" class="label legende-statique">{{ v.titre }}</figcaption>
      </figure>
      <!-- Compteur et petit titre du visuel en cours ; le titre change en glissant -->
      <!-- Points (un par visuel, celui en cours s'allonge ; cliquables) et petit titre du visuel
           en cours, qui change en glissant -->
      <div class="legende">
        <nav class="points" aria-label="Visuels">
          <button
            v-for="(v, n) in visuels"
            :key="n"
            type="button"
            class="point"
            :class="{ actif: n === actuel }"
            :aria-label="v.titre ? `Visuel ${n + 1} sur ${visuels.length} : ${v.titre}` : `Visuel ${n + 1} sur ${visuels.length}`"
            :aria-current="n === actuel ? 'true' : undefined"
            @click="allerAuVisuel?.(n)"
          />
        </nav>
        <span class="titre-masque" aria-live="polite">
          <Transition name="titre">
            <span v-if="visuels[actuel]?.titre" :key="actuel" class="titre">{{ visuels[actuel]?.titre }}</span>
          </Transition>
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profondeur {
  position: relative;
}
/* Scène fixée à l'écran pendant tout le défilement de la section */
.scene {
  position: sticky;
  top: 0;
  height: 100svh;
  overflow: hidden;
  perspective: 1000px;
  perspective-origin: 50% 50%;
}
.visuel {
  position: absolute;
  left: 50%;
  top: 50%;
  margin: 0;
  overflow: hidden;
  border-radius: clamp(10px, 1.1vw, 18px);
  background: var(--line);
  visibility: hidden;
  will-change: transform, opacity;
}
/* Pendant le pli : le plan WebGL (canvas plus grand que le visuel) remplace l'image */
.visuel.en-mouvement {
  overflow: visible;
  background: none;
}
.visuel.en-mouvement > img,
.visuel.en-mouvement > video {
  opacity: 0;
}
.visuel :deep(.plan) {
  position: absolute;
  inset: -25%;
  width: 150%;
  height: 150%;
  pointer-events: none;
  display: none;
}
.visuel.en-mouvement :deep(.plan) {
  display: block;
}
.visuel img,
.visuel video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* Tailles à pleine échelle ; posé devant nous, un visuel en fait environ 60 %.
   Limitées aussi par la hauteur : posé, il doit tenir dans l'écran */
.visuel {
  /* Tous en paysage 16:10 (l'image est recadrée pour remplir) */
  width: min(72vw, 190svh);
  aspect-ratio: 16 / 10;
}
.legende {
  position: absolute;
  left: var(--gutter);
  bottom: var(--gutter);
  z-index: 10;
  display: grid;
  justify-items: start;
  gap: 0.7em;
}
/* Le titre glisse dans une fenêtre masquée : l'ancien remonte, le nouveau arrive d'en dessous */
.titre-masque {
  display: grid;
  overflow: hidden;
  font-size: var(--text-md);
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.titre {
  grid-area: 1 / 1;
}
.titre-enter-active,
.titre-leave-active {
  transition: transform 0.6s var(--ease), opacity 0.6s var(--ease);
}
.titre-enter-from {
  transform: translateY(100%);
  opacity: 0;
}
.titre-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
@media (max-width: 760px) {
  .visuel {
    width: 130vw;
  }
}

/* Sans animation : les visuels les uns sous les autres, centrés */
.statique .scene {
  position: static;
  height: auto;
  overflow: visible;
  display: grid;
  justify-items: center;
  gap: 8vh;
  padding-block: 8vh;
}
.statique .visuel {
  position: static;
  visibility: visible;
  width: min(80vw, 900px);
  /* Le titre passe sous l'image : c'est l'image (pas la figure) qui garde le format et l'arrondi */
  aspect-ratio: auto;
  overflow: visible;
  background: none;
  border-radius: 0;
}
.statique .visuel > img,
.statique .visuel > video {
  height: auto;
  aspect-ratio: 16 / 10;
  border-radius: clamp(10px, 1.1vw, 18px);
  background: var(--line);
}
.legende-statique {
  display: block;
  margin-top: 0.9em;
  opacity: 0.7;
}
.points {
  display: flex;
  align-items: center;
  gap: 10px;
}
.point {
  width: 8px;
  height: 8px;
  padding: 0;
  border: 0;
  border-radius: 99px;
  background: currentColor;
  opacity: 0.25;
  cursor: pointer;
  transition: width 0.5s var(--ease), background 0.3s var(--ease), opacity 0.3s var(--ease);
}
/* Zone de clic plus grande que le point */
.point::before {
  content: '';
  display: block;
  margin: -8px;
  width: calc(100% + 16px);
  height: calc(100% + 16px);
}
.point:hover {
  opacity: 0.6;
}
.point.actif {
  width: 26px;
  background: currentColor;
  opacity: 1;
}
.point:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 4px;
}
.statique .points,
.statique .legende {
  display: none;
}
</style>
