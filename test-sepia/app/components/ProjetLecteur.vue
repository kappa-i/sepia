<script setup lang="ts">
/**
 * Lecteur plein écran de la vidéo d'un projet.
 * S'ouvre depuis le hero (la vidéo grandit depuis sa place jusqu'au plein écran),
 * avec le son, et des commandes en bas posées sur l'image : lecture/pause, son,
 * une barre de progression fine (un rond marque l'image en cours ; clic ou glisser
 * pour avancer) et le temps écoulé.
 * Une pastille « Fermer » suit la souris ; clic hors de la barre ou Échap pour fermer.
 */
const props = defineProps<{ src: string; poster?: string; fond: string; titre: string }>()
// fermeture : début de la fermeture (le hero se cale sur ce moment de la vidéo, caché sous
// le lecteur qui se rétracte) ; ferme : lecteur refermé (le titre du hero peut réapparaître)
const emit = defineEmits<{ fermeture: [temps: number]; ferme: [] }>()

const { $gsap } = useNuxtApp()
const root = ref<HTMLElement>()
const cadre = ref<HTMLElement>()
const video = ref<HTMLVideoElement>()
const barre = ref<HTMLElement>()
const piste = ref<HTMLElement>()
const pastille = ref<HTMLElement>()
const ouvert = ref(false)
const lecture = ref(true)
const muet = ref(false)
const progres = ref(0)
const temps = ref(0)
const duree = ref(0)
const glisse = ref(false)
/** 75 → « 1:15 » */
const minutes = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
let depart: DOMRect | null = null
let reduit = false

// ——— Ouverture / fermeture ———
// La boîte de la vidéo elle-même grandit depuis la place du hero jusqu'au plein écran
// (et l'inverse) : la vidéo y est toujours cadrée en « cover », exactement comme dans
// le hero. En fin de fermeture, les deux images sont identiques : rien ne saute.
let rayonDepart = 0
const boite = (r: DOMRect) => ({
  left: r.left,
  top: r.top,
  width: r.width,
  height: r.height,
  // Coins du haut arrondis comme la feuille, bas droit comme le hero
  borderRadius: `${rayonDepart}px ${rayonDepart}px 0px 0px`,
})
const pleinEcran = () => ({ left: 0, top: 0, width: innerWidth, height: innerHeight, borderRadius: '0px 0px 0px 0px' })

/** Attend que la vidéo affiche l'image demandée (sinon on verrait l'affiche un instant) */
function calee(v: HTMLVideoElement): Promise<void> {
  return new Promise((ok) => {
    const fini = () => ok()
    if (!v.seeking && v.readyState >= 2) return ok()
    v.addEventListener('seeked', fini, { once: true })
    v.addEventListener('loadeddata', fini, { once: true })
    setTimeout(fini, 400) // au pire, on n'attend pas plus
  })
}

async function ouvrir(rect: DOMRect, temps = 0, rayon = 0) {
  if (ouvert.value) return
  reduit = matchMedia('(prefers-reduced-motion: reduce)').matches
  depart = rect
  rayonDepart = rayon
  ouvert.value = true
  document.documentElement.style.overflow = 'hidden'
  await nextTick()
  const v = video.value!
  // Boîte invisible tant que la vidéo n'affiche pas la bonne image : en attendant,
  // on voit la vidéo du hero, juste dessous (pas d'affiche ni de fond qui clignote)
  $gsap.set(cadre.value!, { ...(reduit ? {} : boite(rect)), autoRound: false, autoAlpha: 0 })
  const voile = root.value!.querySelector('.voile')
  $gsap.set(barre.value!, { yPercent: 160 })
  $gsap.set(voile, { opacity: 0 })
  v.currentTime = temps
  v.muted = muet.value
  root.value?.focus()
  await calee(v)
  $gsap.set(cadre.value!, { autoAlpha: 1 })
  $gsap.to(voile, { opacity: 1, duration: 0.6, delay: reduit ? 0 : 0.4 })
  v.play().then(() => (lecture.value = true)).catch(() => {
    // Lecture avec son refusée par le navigateur : on relance en muet
    v.muted = muet.value = true
    v.play().catch(() => {})
  })
  if (reduit) return $gsap.set(barre.value!, { yPercent: 0 })
  $gsap.to(cadre.value!, {
    ...pleinEcran(),
    duration: 0.9,
    ease: 'power4.inOut',
    // Ensuite la boîte suit la taille de la fenêtre (CSS : inset 0)
    onComplete: () => $gsap.set(cadre.value!, { clearProps: 'left,top,width,height,borderRadius' }),
  })
  $gsap.fromTo(barre.value!, { yPercent: 160 }, { yPercent: 0, duration: 0.8, ease: 'power3.out', delay: 0.5 })
}

function fermer() {
  if (!ouvert.value) return
  const v = video.value!
  // Le hero se cale tout de suite sur le même moment : les deux vidéos tournent ensemble
  // pendant que le lecteur se rétracte, rien ne saute quand il disparaît
  emit('fermeture', v.currentTime)
  pastilleVisible.value = false
  const fin = () => {
    v.pause()
    ouvert.value = false
    document.documentElement.style.overflow = ''
    // La pastille sera recréée à la prochaine ouverture : le suivi de la souris aussi
    suivreX = suivreY = undefined
    emit('ferme')
  }
  if (reduit || !depart) return fin()
  $gsap.to(barre.value!, { yPercent: 160, duration: 0.4, ease: 'power3.in' })
  $gsap.to(root.value!.querySelector('.voile'), { opacity: 0, duration: 0.4 })
  $gsap.fromTo(cadre.value!, pleinEcran(), {
    ...boite(depart),
    // Pas d'arrondi au pixel : la boîte doit finir exactement sur le hero
    autoRound: false,
    duration: 0.85,
    ease: 'power4.inOut',
    delay: 0.05,
    onComplete: fin,
  })
}

defineExpose({ ouvrir })

// ——— Lecture ———
function basculerLecture() {
  const v = video.value!
  if (v.paused) v.play()
  else v.pause()
}
function basculerSon() {
  muet.value = !muet.value
  if (video.value) video.value.muted = muet.value
}
function surTemps() {
  const v = video.value
  if (!v?.duration || glisse.value) return
  temps.value = v.currentTime
  duree.value = v.duration
  progres.value = v.currentTime / v.duration
}

// Piste : clic ou glisser pour se déplacer dans la vidéo
function chercher(e: PointerEvent) {
  const f = piste.value
  const v = video.value
  if (!f || !v?.duration) return
  const r = f.getBoundingClientRect()
  const t = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
  v.currentTime = t * v.duration
  progres.value = t
  temps.value = t * v.duration
}
function debutPiste(e: PointerEvent) {
  glisse.value = true
  piste.value?.setPointerCapture(e.pointerId)
  chercher(e)
}
function bougePiste(e: PointerEvent) {
  if (glisse.value) chercher(e)
}
function finPiste() {
  glisse.value = false
}
/** Clavier sur la piste : flèches = ± 5 s */
function toucheePiste(e: KeyboardEvent) {
  const v = video.value
  if (!v?.duration) return
  const pas = e.key === 'ArrowRight' ? 5 : e.key === 'ArrowLeft' ? -5 : 0
  if (!pas) return
  e.preventDefault()
  v.currentTime = Math.min(v.duration, Math.max(0, v.currentTime + pas))
}

// ——— Pastille « Fermer » qui suit la souris ———
let suivreX: ((v: number) => void) | undefined
let suivreY: ((v: number) => void) | undefined
const pastilleVisible = ref(false)
function surMouvement(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || !pastille.value) return
  // Masquée au-dessus de la barre de contrôle
  pastilleVisible.value = !(e.target as HTMLElement).closest('.barre')
  // Premier mouvement : la pastille est posée directement sous la souris
  if (!suivreX) {
    suivreX = $gsap.quickTo(pastille.value, 'x', { duration: 0.45, ease: 'power3.out' })
    suivreY = $gsap.quickTo(pastille.value, 'y', { duration: 0.45, ease: 'power3.out' })
    $gsap.set(pastille.value, { x: e.clientX, y: e.clientY, xPercent: -50, yPercent: -50 })
  }
  suivreX?.(e.clientX)
  suivreY?.(e.clientY)
}
function surClic(e: MouseEvent) {
  if (!(e.target as HTMLElement).closest('.barre')) fermer()
}
function surTouche(e: KeyboardEvent) {
  if (!ouvert.value) return
  if (e.key === 'Escape') fermer()
  else if (e.key === ' ') {
    e.preventDefault()
    basculerLecture()
  }
}

onMounted(() => addEventListener('keydown', surTouche))
onBeforeUnmount(() => {
  removeEventListener('keydown', surTouche)
  document.documentElement.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="ouvert"
      ref="root"
      class="lecteur"
      role="dialog"
      aria-modal="true"
      :aria-label="`Vidéo : ${titre}`"
      tabindex="-1"
      @pointermove="surMouvement"
      @pointerleave="pastilleVisible = false"
      @click="surClic"
    >
      <div ref="cadre" class="cadre" :style="{ background: fond }">
        <video
          ref="video"
          :src="src"
          class="video"
          playsinline
          loop
          @timeupdate="surTemps"
          @play="lecture = true"
          @pause="lecture = false"
        />
      </div>

      <!-- Dégradé sombre en bas : les commandes restent lisibles sur n'importe quelle image -->
      <div class="voile" aria-hidden="true" />
      <div ref="barre" class="barre">
        <button type="button" class="icone" :aria-label="lecture ? 'Pause' : 'Lecture'" @click="basculerLecture">
          <svg v-if="lecture" viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="3.5" height="14" rx="1" /><rect x="13.5" y="5" width="3.5" height="14" rx="1" /></svg>
          <svg v-else viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
        </button>
        <button type="button" class="icone" :aria-label="muet ? 'Activer le son' : 'Couper le son'" @click="basculerSon">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
            <template v-if="!muet">
              <path d="M15.5 9a4 4 0 0 1 0 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              <path d="M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </template>
            <path v-else d="M16 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </button>
        <!-- Barre de progression : partie vue claire, reste translucide, rond sur l'image en cours -->
        <div
          ref="piste"
          class="piste"
          :class="{ glisse }"
          role="slider"
          tabindex="0"
          aria-label="Position dans la vidéo"
          :aria-valuenow="Math.round(temps)"
          aria-valuemin="0"
          :aria-valuemax="Math.round(duree)"
          :aria-valuetext="`${minutes(temps)} sur ${minutes(duree)}`"
          @pointerdown="debutPiste"
          @pointermove="bougePiste"
          @pointerup="finPiste"
          @pointercancel="finPiste"
          @keydown="toucheePiste"
        >
          <div class="rail">
            <div class="vu" :style="{ width: `${progres * 100}%` }" />
          </div>
          <div class="curseur" :style="{ left: `${progres * 100}%` }" />
        </div>
        <span class="temps label">{{ minutes(temps) }} / {{ minutes(duree) }}</span>
      </div>

      <div ref="pastille" class="pastille" :class="{ visible: pastilleVisible }" aria-hidden="true">
        <span class="pastille-in">Fermer</span>
      </div>
      <button type="button" class="fermer-clavier" @click.stop="fermer">Fermer la vidéo</button>
    </div>
  </Teleport>
</template>

<style scoped>
.lecteur {
  position: fixed;
  inset: 0;
  z-index: 80;
  cursor: none;
  outline: none;
}
.cadre {
  position: absolute;
  inset: 0;
  overflow: hidden;
  /* Même forme de coins que la feuille du projet */
  corner-shape: squircle;
}
.video {
  width: 100%;
  height: 100%;
  /* Remplit tout l'écran (quitte à rogner un peu les bords) */
  object-fit: cover;
}

/* Commandes posées sur l'image, en bas */
.voile {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 22vh;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.5), transparent);
  pointer-events: none;
}
.barre {
  position: absolute;
  left: var(--gutter);
  right: var(--gutter);
  bottom: max(18px, 3vh);
  display: flex;
  align-items: center;
  gap: 14px;
  color: #fff;
  cursor: default;
}
.icone {
  flex: none;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  display: grid;
  place-items: center;
  cursor: pointer;
  opacity: 0.9;
  transition: opacity 0.3s var(--ease), transform 0.3s var(--ease);
}
.icone:hover {
  opacity: 1;
  transform: scale(1.12);
}
.icone svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
  filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4));
}
.icone:focus-visible,
.piste:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 4px;
  border-radius: 99px;
}
/* Zone de clic haute, rail fin au milieu */
.piste {
  position: relative;
  flex: 1;
  height: 32px;
  margin-inline: 6px;
  cursor: pointer;
  touch-action: none;
}
.rail {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 8px;
  margin-top: -4px;
  border-radius: 99px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.35);
  transition: height 0.25s var(--ease), margin 0.25s var(--ease);
}
.vu {
  height: 100%;
  background: rgba(255, 255, 255, 0.92);
}
/* Rond sur l'image en cours : anneau blanc, centre gris */
.curseur {
  position: absolute;
  top: 50%;
  width: 22px;
  height: 22px;
  margin: -11px 0 0 -11px;
  border: 4px solid #fff;
  border-radius: 50%;
  background: #cfd0d2;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  pointer-events: none;
  transition: transform 0.25s var(--ease);
}
.piste:hover .rail,
.piste.glisse .rail {
  height: 10px;
  margin-top: -5px;
}
.piste:hover .curseur,
.piste.glisse .curseur {
  transform: scale(1.2);
}
.temps {
  flex: none;
  min-width: 7.5em;
  text-align: right;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}

/* Pastille qui suit la souris : GSAP déplace .pastille, l'apparition se fait sur .pastille-in */
.pastille {
  position: fixed;
  left: 0;
  top: 0;
  pointer-events: none;
}
.pastille-in {
  display: block;
  padding: 0.45em 0.95em;
  border-radius: 99px;
  background: var(--accent);
  color: var(--fg);
  font-size: var(--text-sm);
  letter-spacing: -0.01em;
  transform: scale(0);
  transition: transform 0.3s var(--ease);
}
.pastille.visible .pastille-in {
  transform: scale(1);
}
/* Bouton de fermeture pour le clavier et le tactile (invisible à la souris) */
.fermer-clavier {
  position: absolute;
  top: var(--gutter);
  right: var(--gutter);
  padding: 0.5em 1em;
  border: 0;
  border-radius: 99px;
  background: var(--bg);
  color: var(--fg);
  font: inherit;
  opacity: 0;
  pointer-events: none;
}
.fermer-clavier:focus-visible {
  opacity: 1;
  outline: 2px solid var(--accent);
}
@media (hover: none) {
  .lecteur {
    cursor: auto;
  }
  .pastille {
    display: none;
  }
  .fermer-clavier {
    opacity: 1;
    pointer-events: auto;
  }
  .temps {
    display: none;
  }
}
</style>
