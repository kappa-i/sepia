<script setup lang="ts">
/**
 * Tous les projets (l'accueil ne montre que les plus marquants, voir `accueil` dans les
 * fiches), avec filtres par savoir-faire.
 *
 * Deux affichages (bouton Grille / Liste, mémorisé) : dans la grille, chaque visuel apparaît
 * en arrivant à l'écran, étiré et penché, puis se remet en place d'un coup (GSAP) ;
 * au clic, il grandit jusqu'au plein écran, comme l'écran de l'accueil. La liste est un index
 * sans image : nom en grand, savoir-faire, année, et une flèche sur la ligne survolée.
 */
useSeoMeta({
  title: 'Projets — Sepia',
  description: 'Tous nos projets : sites vitrines, e-commerce et identités visuelles.',
})

const { $gsap } = useNuxtApp()
// Passage de relais à la page projet (comme depuis l'accueil) : elle reprend la vidéo du
// hero à cet instant et affiche cette image le temps que sa propre vidéo soit prête
const videoTemps = useState<number>('videoTemps', () => 0)
const instantane = useState<string | null>('videoInstantane', () => null)
function passerRelais(v: HTMLVideoElement | null | undefined) {
  videoTemps.value = v?.currentTime ?? 0
  instantane.value = v && v.readyState >= 2 ? capturerVideo(v) : null
}
const root = ref<HTMLElement>()

// ——— Filtres ———
const filtre = ref<string | null>(null)
const filtres = savoirFaire.map((nom) => ({ nom, n: projets.filter((p) => p.tags.includes(nom)).length }))
// Tri par date : plus récents d'abord (par défaut) ou plus anciens d'abord. Date précise de la
// fiche (`date`, au mois ou au jour) si elle existe, sinon l'année ; à égalité, l'ordre des
// fiches (`ordre`) est gardé
const tri = ref<'recents' | 'anciens'>('recents')
const liste = computed(() => {
  const choisis = filtre.value ? projets.filter((p) => p.tags.includes(filtre.value!)) : projets
  const sens = tri.value === 'recents' ? -1 : 1
  return [...choisis].sort((a, b) => sens * a.quand.localeCompare(b.quand))
})
// Numéro d'origine (fixe), pour qu'un projet garde son numéro quel que soit le filtre
const numero = (slug: string) => String(projets.findIndex((p) => p.slug === slug) + 1).padStart(2, '0')

// ——— Affichage : grille (par défaut) ou liste ———
type Vue = 'grille' | 'liste'
const vue = ref<Vue>('grille')
const CLE_VUE = 'sepia-vue-projets'
function choisirVue(v: Vue) {
  vue.value = v
  survol.value = null
  try {
    localStorage.setItem(CLE_VUE, v)
  } catch {}
}

// ——— Apparition des visuels de la grille ———
// Tant que le JS n'a pas démarré, les visuels s'affichent normalement ; ensuite, chacun est
// caché jusqu'à son arrivée à l'écran, puis arrive d'en bas étiré en hauteur et penché, et
// se remet d'aplomb pendant que l'image dézoome dans son cadre. Ceux qui arrivent ensemble
// se suivent. Que des transformations : fluide partout, sans filtre.
const reveles = new Set<string>()
let observateur: IntersectionObserver | undefined
// Projets en vidéo : le visuel est la vidéo (comme l'accueil et la page projet), lue
// seulement tant qu'elle est à l'écran
let lecteur: IntersectionObserver | undefined
function observer() {
  nextTick(() => {
    root.value?.querySelectorAll<HTMLElement>('.carte').forEach((carte) => {
      if (!observateur || reveles.has(carte.dataset.slug!) || carte.dataset.attente) return
      carte.dataset.attente = '1'
      $gsap.set(carte.querySelector('.visuel'), {
        opacity: 0,
        y: 140,
        scaleX: 0.86,
        scaleY: 1.45,
        skewY: 7,
        transformOrigin: '50% 100%',
      })
      $gsap.set(carte.querySelector('.visuel-media'), { scale: 1.5 })
      $gsap.set(carte.querySelector('.carte-infos'), { opacity: 0, y: 20 })
      observateur.observe(carte)
    })
    root.value?.querySelectorAll<HTMLVideoElement>('.visuel video').forEach((v) => lecteur?.observe(v))
  })
}
watch(liste, observer)

function reveler(carte: HTMLElement, delai: number) {
  const visuel = carte.querySelector<HTMLElement>('.visuel')!
  $gsap
    .timeline({ delay: delai })
    .to(visuel, { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0)
    .to(visuel, { y: 0, scaleX: 1, scaleY: 1, skewY: 0, duration: 1.4, ease: 'expo.out' }, 0)
    .to(carte.querySelector('.visuel-media'), { scale: 1, duration: 1.8, ease: 'expo.out' }, 0)
    .to(carte.querySelector('.carte-infos'), { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.3)
}

// ——— Ouverture d'un projet depuis la grille ———
// Calque fixe qui reçoit le visuel cliqué et grandit jusqu'au plein écran
const apercu = ref<HTMLElement>()
const ouverture = ref(false)
// Ligne survolée dans la liste (les autres s'estompent)
const survol = ref<string | null>(null)
// Mouvement réduit ou mode léger (voir useLeger)
const { leger, reduit: animReduite } = useLeger()
let reduit = false

/**
 * Clic sur un visuel de la grille, comme sur l'accueil : le reste de la page s'efface, le
 * visuel grandit jusqu'au plein écran en perdant ses coins arrondis, puis la page projet
 * s'ouvre (elle commence par cette même image plein écran).
 */
function ouvrirCarte(e: MouseEvent, slug: string) {
  const dest = `/projets/${slug}`
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  e.preventDefault()
  const el = apercu.value
  const visuel = (e.currentTarget as HTMLElement).querySelector<HTMLElement>('.visuel')
  // Clic capté avant le lien (sinon il navigue tout de suite) ; une ouverture en cours suffit
  if (ouverture.value) return
  if (reduit || !el || !visuel) return navigateTo(dest)
  const r = visuel.getBoundingClientRect()
  ouverture.value = true
  $gsap.killTweensOf(el)
  $gsap.set(el, {
    x: r.left,
    y: r.top,
    width: r.width,
    height: r.height,
    borderRadius: getComputedStyle(visuel).borderRadius,
  })
  // Le média (vidéo en cours de lecture ou image) passe dans l'aperçu, posé à la place
  // exacte du visuel : rien ne saute, la vidéo continue pendant l'agrandissement
  const media = visuel.querySelector<HTMLImageElement | HTMLVideoElement>('.visuel-media')
  if (media) {
    media.classList.add('apercu-depart')
    el.prepend(media)
  }
  visuel.style.visibility = 'hidden'
  const video = media instanceof HTMLVideoElement ? media : null
  $gsap
    .timeline({
      onComplete: () => {
        passerRelais(video)
        navigateTo(dest)
      },
    })
    .to(root.value!.querySelectorAll('.tete, .grille'), { opacity: 0, duration: 0.3 }, 0)
    .to(el, { x: 0, y: 0, width: innerWidth, height: innerHeight, duration: 1, ease: 'power4.inOut' }, 0.1)
    .to(el, { borderRadius: 0, duration: 1, ease: 'power3.inOut' }, 0.1)
}

let ctx: ReturnType<typeof $gsap.context> | undefined
onMounted(() => {
  try {
    if (localStorage.getItem(CLE_VUE) === 'liste') vue.value = 'liste'
  } catch {}
  reduit = animReduite()
  if (reduit) return
  // Visuels : cachés jusqu'à leur arrivée à l'écran
  observateur = new IntersectionObserver(
    (entrees) => {
      let i = 0
      for (const e of entrees) {
        if (!e.isIntersecting) continue
        const carte = e.target as HTMLElement
        reveles.add(carte.dataset.slug!)
        observateur!.unobserve(carte)
        reveler(carte, 0.15 + i++ * 0.15)
      }
    },
    { threshold: 0.15 },
  )
  lecteur = new IntersectionObserver((entrees) => {
    for (const e of entrees) {
      const v = e.target as HTMLVideoElement
      if (e.isIntersecting) v.play().catch(() => {})
      else v.pause()
    }
  })
  observer()
  ctx = $gsap.context(() => {
    const tl = $gsap
      .timeline({ delay: 0.15 })
      .from('.titre-masque > *', { yPercent: 110, duration: 1, ease: 'power4.out' })
      .from('.filtres > *, .tri, .vues', { y: 14, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.04 }, '-=0.6')
    if (vue.value === 'liste') tl.from('.ligne', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06 }, '-=0.5')
  }, root.value)
})
onBeforeUnmount(() => {
  ctx?.revert()
  observateur?.disconnect()
  lecteur?.disconnect()
})
</script>

<template>
  <section ref="root" class="page-projets">
    <header class="tete grid">
      <h1 class="titre">
        <span class="titre-masque"><span>Projets<sup class="compte">({{ projets.length }})</sup></span></span>
      </h1>
      <div class="outils">
        <!-- Filtres par savoir-faire -->
        <div class="filtres" role="group" aria-label="Filtrer par savoir-faire">
          <button type="button" class="filtre" :aria-pressed="filtre === null" @click="filtre = null">
            Tout <span class="n">{{ projets.length }}</span>
          </button>
          <button
            v-for="f in filtres"
            :key="f.nom"
            type="button"
            class="filtre"
            :aria-pressed="filtre === f.nom"
            @click="filtre = filtre === f.nom ? null : f.nom"
          >
            {{ f.nom }} <span class="n">{{ f.n }}</span>
          </button>
        </div>

        <!-- Tri par date : un clic inverse le sens -->
        <button
          type="button"
          class="tri"
          :aria-label="tri === 'recents' ? 'Trié du plus récent au plus ancien, inverser' : 'Trié du plus ancien au plus récent, inverser'"
          @click="tri = tri === 'recents' ? 'anciens' : 'recents'"
        >
          <span class="tri-masque">
            <Transition name="tri">
              <span :key="tri">{{ tri === 'recents' ? 'Plus récents' : 'Plus anciens' }}</span>
            </Transition>
          </span>
          <span class="tri-fleche" :class="{ inverse: tri === 'anciens' }" aria-hidden="true">↓</span>
        </button>

        <!-- Affichage : grille ou liste -->
        <div class="vues" :class="{ 'sur-liste': vue === 'liste' }" role="group" aria-label="Affichage">
          <!-- Pastille foncée qui glisse sous le choix actif -->
          <span class="vues-curseur" aria-hidden="true" />
          <button type="button" class="vue" :aria-pressed="vue === 'grille'" @click="choisirVue('grille')">Grille</button>
          <button type="button" class="vue" :aria-pressed="vue === 'liste'" @click="choisirVue('liste')">Liste</button>
        </div>
      </div>
    </header>

    <Transition name="vue" mode="out-in" @enter="observer">
      <!-- Grille : un visuel par projet, qui apparaît en se remettant d'aplomb (voir `reveler`) -->
      <TransitionGroup v-if="vue === 'grille'" key="grille" tag="ul" name="carte" class="grille grid">
        <li
          v-for="p in liste"
          :key="p.slug"
          :data-slug="p.slug"
          class="carte"
          @click.capture="ouvrirCarte($event, p.slug)"
        >
          <NuxtLink :to="`/projets/${p.slug}`" class="carte-lien">
            <span class="visuel" :style="{ background: p.teinte }" aria-hidden="true">
              <video
                v-if="p.video && !leger"
                :src="p.video"
                class="visuel-media"
                muted
                loop
                playsinline
                preload="auto"
              />
              <img v-else :src="p.image" alt="" class="visuel-media" loading="lazy" />
            </span>
            <span class="carte-infos">
              <span class="carte-num label">{{ numero(p.slug) }}</span>
              <span class="carte-nom">{{ p.titre }}</span>
              <span class="carte-meta label">{{ p.tags.join(' · ') }} — {{ p.annee }}</span>
            </span>
          </NuxtLink>
        </li>
      </TransitionGroup>

      <!-- Liste : un index sans image, une ligne par projet -->
      <div v-else key="liste" class="vue-liste">
        <div class="entetes grid label" aria-hidden="true">
          <span class="col-num">N°</span>
          <span class="col-titre">Projet</span>
          <span class="col-tags">Savoir-faire</span>
          <span class="col-annee">Année</span>
        </div>

        <TransitionGroup
          tag="ul"
          name="ligne"
          class="liste"
          :class="{ 'avec-survol': survol }"
          @pointerleave="survol = null"
        >
          <li v-for="p in liste" :key="p.slug" class="ligne">
            <NuxtLink
              :to="`/projets/${p.slug}`"
              class="lien grid"
              :class="{ actif: survol === p.slug }"
              @pointerenter="survol = p.slug"
              @focus="survol = p.slug"
              @blur="survol = null"
            >
              <span class="col-num label">{{ numero(p.slug) }}</span>
              <span class="col-titre nom">{{ p.titre }}</span>
              <span class="col-tags label">{{ p.tags.join(' · ') }}</span>
              <span class="col-annee label">{{ p.annee }}</span>
              <span class="col-fleche" aria-hidden="true">→</span>
            </NuxtLink>
          </li>
        </TransitionGroup>
      </div>
    </Transition>

    <!-- Calque de l'ouverture depuis la grille : reçoit le visuel cliqué et grandit -->
    <div ref="apercu" class="apercu" :class="{ ouverture }" aria-hidden="true" />
  </section>
</template>

<style scoped>
.page-projets {
  padding-top: 10vh;
}
.tete {
  row-gap: 4vh;
  align-items: end;
  margin-bottom: 10vh;
}
.titre {
  grid-column: 1 / span 5;
  margin: 0;
  font-size: clamp(56px, 9vw, 170px);
  font-weight: 500;
  line-height: 0.92;
  letter-spacing: -0.055em;
}
.titre-masque {
  display: block;
  overflow: hidden;
  padding-bottom: 0.06em;
}
.titre-masque > span {
  display: inline-block;
}
.compte {
  margin-left: 0.15em;
  font-size: 0.22em;
  font-weight: 400;
  letter-spacing: 0;
  vertical-align: super;
  color: var(--muted);
}
.outils {
  grid-column: 6 / -1;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 1em 1.6em;
}
.filtres {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.5em;
}
.filtre {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5em;
  padding: 0.6em 1.1em;
  border: 1px solid var(--line);
  border-radius: 99px;
  background: transparent;
  color: var(--fg);
  font: inherit;
  font-size: var(--text-xs);
  cursor: pointer;
  transition:
    background 0.3s var(--ease),
    color 0.3s var(--ease),
    border-color 0.3s var(--ease);
}
.filtre:hover {
  border-color: var(--fg);
}
.filtre[aria-pressed='true'] {
  background: var(--fg);
  border-color: var(--fg);
  color: var(--bg);
}
.filtre .n {
  opacity: 0.5;
  font-variant-numeric: tabular-nums;
}
.filtre:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 3px;
}

/* Tri par année : pilule contour ; le mot change en glissant, la flèche se retourne */
.tri {
  display: inline-flex;
  align-items: baseline;
  gap: 0.5em;
  padding: 0.6em 1.1em;
  border: 1px solid var(--line);
  border-radius: 99px;
  background: transparent;
  color: var(--fg);
  font: inherit;
  font-size: var(--text-xs);
  cursor: pointer;
  transition: border-color 0.3s var(--ease);
}
.tri:hover {
  border-color: var(--fg);
}
.tri:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 3px;
}
.tri-masque {
  display: grid;
  overflow: hidden;
}
.tri-masque > span {
  grid-area: 1 / 1;
  white-space: nowrap;
}
.tri-enter-active,
.tri-leave-active {
  transition: transform 0.45s var(--ease);
}
.tri-enter-from {
  transform: translateY(110%);
}
.tri-leave-to {
  transform: translateY(-110%);
}
.tri-fleche {
  display: inline-block;
  color: var(--accent);
  transition: transform 0.5s var(--ease);
}
.tri-fleche.inverse {
  transform: rotate(180deg);
}

/* Bascule Grille / Liste : deux cases égales, une pastille foncée glisse sous le choix actif
   pendant que les couleurs des deux mots s'échangent */
.vues {
  position: relative;
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 99px;
}
.vues-curseur {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc(50% - 3px);
  border-radius: 99px;
  background: var(--fg);
  transition: transform 0.55s cubic-bezier(0.65, 0, 0.35, 1);
}
.vues.sur-liste .vues-curseur {
  transform: translateX(100%);
}
.vue {
  position: relative;
  z-index: 1;
  padding: 0.5em 1em;
  border: 0;
  border-radius: 99px;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: var(--text-xs);
  cursor: pointer;
  transition: color 0.45s var(--ease);
}
.vue:hover {
  color: var(--fg);
}
.vue[aria-pressed='true'] {
  color: var(--bg);
}
.vue:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 2px;
}

/* Passage d'un affichage à l'autre */
.vue-enter-active,
.vue-leave-active {
  transition: opacity 0.35s var(--ease);
}
.vue-enter-from,
.vue-leave-to {
  opacity: 0;
}

/* ——— Grille : deux colonnes égales, visuels tous à la même taille, alignés ——— */
.grille {
  margin: 0 0 14vh;
  padding-block: 0;
  list-style: none;
  /* Assez d'écart entre les deux colonnes pour que les infos sous les visuels ne se touchent pas */
  column-gap: max(20px, 2.5vw);
  row-gap: 8vh;
  align-items: start;
}
.carte {
  grid-column: span 6;
}
.carte-lien {
  display: block;
}
.carte-lien:focus-visible {
  outline: none;
}
.carte-lien:focus-visible .visuel {
  outline: 1px solid var(--accent);
  outline-offset: 4px;
}

/* Le visuel : coins arrondis, teinte du projet tant que l'image n'est pas chargée */
.visuel {
  position: relative;
  display: block;
  aspect-ratio: 16 / 10;
  border-radius: clamp(12px, 1.4vw, 24px);
  overflow: hidden;
}
.visuel-media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Sous le visuel : numéro, nom, savoir-faire et année */
.carte-infos {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3em 1em;
  margin-top: 1.1em;
}
.carte-num {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
  transition: color 0.3s var(--ease);
}
.carte-nom {
  font-size: var(--text-md);
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1.1;
}
.carte-meta {
  margin-left: auto;
  color: var(--muted);
}

/* Filtrage : les projets arrivent par le bas, les autres glissent à leur place */
.carte-enter-active,
.carte-move {
  transition:
    opacity 0.5s var(--ease),
    transform 0.6s var(--ease);
}
.carte-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

/* Colonnes communes aux en-têtes et aux lignes */
.col-num {
  grid-column: 1 / span 1;
}
.col-titre {
  grid-column: 2 / span 6;
}
.col-tags {
  grid-column: 8 / span 3;
}
.col-annee {
  grid-column: 11 / span 1;
}
.col-fleche {
  grid-column: 12 / -1;
  justify-self: end;
}
.entetes {
  padding-bottom: 1em;
  color: var(--muted);
}

.liste {
  position: relative;
  margin: 0 0 6vh;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line);
}
.ligne {
  border-bottom: 1px solid var(--line);
}
.lien {
  align-items: baseline;
  padding-block: 3.2vh;
  transition: opacity 0.4s var(--ease);
}
.nom {
  font-size: var(--text-lg);
  font-weight: 500;
  letter-spacing: -0.035em;
  line-height: 1.05;
  transition: transform 0.6s var(--ease);
}
.col-tags,
.col-annee,
.col-num {
  color: var(--muted);
  transition: color 0.3s var(--ease);
}
/* Survol : la ligne glisse, les autres s'estompent (comme le menu) */
.lien.actif .nom {
  transform: translateX(0.25em);
}
.lien.actif .col-num {
  color: var(--accent);
}
.lien.actif .col-tags,
.lien.actif .col-annee {
  color: var(--fg);
}
/* Flèche : cachée, elle arrive de la gauche sur la ligne survolée */
.col-fleche {
  font-size: var(--text-md);
  line-height: 1;
  color: var(--accent);
  opacity: 0;
  transform: translateX(-0.6em);
  transition:
    opacity 0.4s var(--ease),
    transform 0.6s var(--ease);
}
.lien.actif .col-fleche {
  opacity: 1;
  transform: none;
}
.avec-survol .lien:not(.actif) {
  opacity: 0.35;
}
.lien:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: -1px;
}

/* Filtrage : les lignes s'effacent / arrivent, les autres glissent à leur place */
.ligne-enter-active,
.ligne-leave-active,
.ligne-move {
  transition:
    opacity 0.45s var(--ease),
    transform 0.55s var(--ease);
}
.ligne-enter-from,
.ligne-leave-to {
  opacity: 0;
  transform: translateY(16px);
}
.ligne-leave-active {
  position: absolute;
  left: 0;
  right: 0;
}

/* Calque de l'ouverture : GSAP le pose sur le visuel cliqué puis l'agrandit */
.apercu {
  position: fixed;
  left: 0;
  top: 0;
  z-index: 40;
  overflow: hidden;
  pointer-events: none;
  visibility: hidden;
}
.apercu.ouverture {
  visibility: visible;
}
.apercu .apercu-depart {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Écran tactile : pas de survol, rien ne s'estompe */
@media (hover: none) {
  .avec-survol .lien:not(.actif) {
    opacity: 1;
  }
  .col-fleche {
    opacity: 1;
    transform: none;
    color: var(--muted);
  }
}

@media (max-width: 760px) {
  .titre,
  .outils {
    grid-column: 1 / -1;
  }
  .outils,
  .filtres {
    justify-content: flex-start;
  }
  /* Grille : une télé par ligne */
  .grille {
    row-gap: 7vh;
  }
  .carte {
    grid-column: 1 / -1;
  }
  .carte-meta {
    margin-left: 0;
    flex-basis: 100%;
  }
  .entetes {
    display: none;
  }
  /* Liste : numéro et nom, la flèche à droite ; savoir-faire et année en dessous */
  .lien {
    row-gap: 0.5em;
    padding-block: 2.6vh;
  }
  .col-num {
    grid-column: 1 / span 1;
  }
  .col-titre {
    grid-column: 1 / span 3;
    grid-row: 2;
  }
  .col-fleche {
    grid-column: 4 / -1;
    grid-row: 2;
  }
  .col-tags {
    grid-column: 1 / span 3;
    grid-row: 3;
  }
  .col-annee {
    grid-column: 4 / -1;
    grid-row: 3;
    justify-self: end;
  }
  .nom {
    font-size: var(--text-md);
  }
}
</style>
