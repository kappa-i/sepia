<script setup lang="ts">
// La page commence par l'image plein écran : c'est la fin de l'animation d'ouverture de l'accueil
// sansFooter : la page se termine sur le projet suivant, qu'on ouvre en continuant à défiler
definePageMeta({ overlayHeader: true, sansFooter: true })

const route = useRoute()
const { $gsap, $ScrollTrigger } = useNuxtApp()
// Mouvement réduit ou mode léger (voir useLeger) : pas d'animation
const { leger, reduit } = useLeger()
const root = ref<HTMLElement>()
const video = ref<HTMLVideoElement>()
const videoTemps = useState<number>('videoTemps', () => 0)
// Image capturée sur l'accueil au moment d'ouvrir le projet : affiche de la vidéo du hero
// le temps qu'elle se cale (sinon la photo du projet apparaît une fraction de seconde)
const instantane = useState<string | null>('videoInstantane', () => null)

const i = projets.findIndex((p) => p.slug === route.params.slug)
if (i === -1) throw createError({ statusCode: 404, statusMessage: 'Projet introuvable', fatal: true })
const projet = projets[i]!
// Projet suivant : le prochain dans l'ordre qui n'a pas encore été vu pendant la visite ;
// null quand tout a été vu (la fin de page affiche alors « Vous avez tout vu »). Avant le
// montage (rendu serveur), rien n'est connu : c'est simplement le suivant dans l'ordre
const vus = ref<string[]>([])
const suivant = computed(() => {
  for (let k = 1; k < projets.length; k++) {
    const p = projets[(i + k) % projets.length]!
    if (!vus.value.includes(p.slug)) return p
  }
  return null
})
onMounted(() => (vus.value = marquerVu(projet.slug)))
// Affiche de la vidéo du hero : la capture de l'accueil si on en vient, sinon la photo du projet
const affiche = instantane.value ?? projet.image
// Sections listées dans le sommaire flottant (seulement celles que la fiche remplit)
const sections = [
  { id: 'intro', titre: 'Le projet' },
  projet.recit && { id: 'recit', titre: 'Défi & réponse' },
  projet.visuels?.length && { id: 'visuels', titre: 'Visuels' },
  projet.identite && { id: 'identite', titre: 'Identité' },
  projet.temoignage && { id: 'temoignage', titre: 'Témoignage' },
  { id: 'suite', titre: 'La suite' },
].filter((s): s is { id: string; titre: string } => !!s)
// Fiche du projet : lignes renseignées seulement, l'année en dernier
const fiche = [
  { nom: 'Client', valeur: projet.fiche?.client },
  { nom: 'Secteur', valeur: projet.fiche?.secteur },
  { nom: 'Réalisé', valeur: projet.fiche?.role?.join(', ') },
  { nom: 'Année', valeur: projet.annee },
].filter((l): l is { nom: string; valeur: string } => !!l.valeur)
// La vidéo reste invisible tant qu'elle n'affiche pas la bonne image
const videoPrete = ref(false)

useSeoMeta({
  title: `${projet.titre} — Sepia`,
  description: projet.description,
})
// La page projet est une « feuille » posée sur le fond sombre du site (comme l'accueil)
useHead({ bodyAttrs: { style: 'background: var(--fg)' } })


// ——— Vidéo du hero : pastille « Regarder » qui suit la souris, clic = lecteur plein écran ———
const hero = ref<HTMLElement>()
const pastille = ref<HTMLElement>()
const lecteur = ref<{ ouvrir: (rect: DOMRect, temps?: number, rayon?: number) => void }>()
const survolHero = ref(false)
// La pastille n'apparaît qu'une fois placée sous la souris (sinon elle surgit en haut à gauche)
const pastillePlacee = ref(false)
const pastilleActive = computed(() => survolHero.value && pastillePlacee.value)
let suivreX: ((v: number) => void) | undefined
let suivreY: ((v: number) => void) | undefined
function surMouvementHero(e: PointerEvent) {
  if (e.pointerType !== 'mouse' || !hero.value || !pastille.value) return
  const r = hero.value.getBoundingClientRect()
  const x = e.clientX - r.left
  const y = e.clientY - r.top
  if (!suivreX) {
    suivreX = $gsap.quickTo(pastille.value, 'x', { duration: 0.45, ease: 'power3.out' })
    suivreY = $gsap.quickTo(pastille.value, 'y', { duration: 0.45, ease: 'power3.out' })
    $gsap.set(pastille.value, { x, y, xPercent: -50, yPercent: -50 })
    pastillePlacee.value = true
  }
  suivreX(x)
  suivreY!(y)
}
function surEntreeHero(e: PointerEvent) {
  survolHero.value = true
  surMouvementHero(e)
}
function regarder() {
  if (!hero.value) return
  // Arrondi des coins de la feuille : la vidéo part de (et revient à) la même forme
  const rayon = root.value ? parseFloat(getComputedStyle(root.value).borderTopLeftRadius) || 0 : 0
  lecteur.value?.ouvrir(hero.value.getBoundingClientRect(), video.value?.currentTime ?? 0, rayon)
  // Le titre s'efface pendant que la vidéo s'agrandit
  $gsap.to('.hero-titre > *', { opacity: 0, duration: 0.3, overwrite: true })
}
// Début de la fermeture : la vidéo du hero se cale sur le moment où en est le lecteur
// (cachée dessous), pour que rien ne saute quand le lecteur disparaît
function surFermetureLecteur(temps: number) {
  const v = video.value
  if (v && Math.abs(v.currentTime - temps) > 0.15) v.currentTime = temps
}
// Lecteur refermé : le titre réapparaît
function surFermeLecteur() {
  $gsap.fromTo(
    '.hero-titre > *',
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 0.9, stagger: 0.1, ease: 'power3.out', overwrite: true },
  )
}

// Écart du header par rapport au bord une fois la feuille posée (= sa marge, voir .feuille)
const DECALAGE = 'max(10px, 1.6vw)'

let ctx: ReturnType<typeof $gsap.context> | undefined
onMounted(() => {
  const v = video.value
  if (v) {
    const montrer = () => (videoPrete.value = true)
    if (videoTemps.value) {
      // Reprise au moment exact où l'accueil l'a laissée ; visible une fois calée
      v.addEventListener('seeked', montrer, { once: true })
      v.currentTime = videoTemps.value
      videoTemps.value = 0
    } else if (v.readyState >= 2) montrer()
    else v.addEventListener('loadeddata', montrer, { once: true })
    setTimeout(montrer, 1500) // au pire, on ne la cache pas plus longtemps
  }
  instantane.value = null
  if (reduit()) {
    root.value?.querySelector<HTMLElement>('.hero')?.style.setProperty('height', '80svh')
    root.value?.classList.add('posee')
    document.documentElement.style.setProperty('--decalage-header', DECALAGE)
    return
  }
  ctx = $gsap.context(() => {
    // L'image arrive plein écran (fin de l'animation de l'accueil) puis se réduit à 80vh,
    // pendant que la page se détache des bords et devient une feuille aux coins arrondis
    $gsap.to('.hero', {
      height: '80svh',
      duration: 1.2,
      ease: 'power4.inOut',
      delay: 0.2,
      // Le hero a rétréci : tout ce qui suit est remonté. Les déclencheurs au défilement
      // (couloir des visuels, planche d’identité…) recalculent leurs positions, sinon ils sont décalés
      onComplete: () => $ScrollTrigger.refresh(),
    })
    const el = root.value!
    const marge = Math.max(10, innerWidth * 0.016)
    // Coins en squircle quand le navigateur le permet : rayon plus grand (voir .feuille)
    const SQUIRCLE = CSS.supports('corner-shape', 'squircle') ? 2 : 1
    const rayon = Math.min(28, Math.max(14, innerWidth * 0.016)) * SQUIRCLE
    $gsap.to(el, {
      '--marge': `${marge}px`,
      '--rayon': `${rayon}px`,
      duration: 1.2,
      ease: 'power4.inOut',
      delay: 0.2,
      // Ensuite c'est le CSS qui tient la main (valeurs qui suivent la largeur de l'écran)
      onComplete: () => {
        el.classList.add('posee')
        el.style.removeProperty('--marge')
        el.style.removeProperty('--rayon')
      },
    })
    // Le logo et le menu s'écartent du bord en même temps : ils restent à distance de la feuille
    const html = document.documentElement
    $gsap.fromTo(
      html,
      { '--decalage-header': '0px' },
      {
        '--decalage-header': `${marge}px`,
        duration: 1.2,
        ease: 'power4.inOut',
        delay: 0.2,
        onComplete: () => html.style.setProperty('--decalage-header', DECALAGE),
      },
    )
    $gsap.from('.hero-titre > *', { y: 30, opacity: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out' })
    $gsap.from('.intro > :not(.fiche), .intro-texte > *', {
      y: 30,
      opacity: 0,
      duration: 0.9,
      stagger: 0.08,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.intro', start: 'top 85%', once: true },
    })
    // Fiche, défi & réponse, témoignage : montent à leur arrivée à l'écran
    for (const [zone, items] of [
      ['.fiche', '.fiche-ligne'],
      ['.recit', '.recit-bloc'],
      ['.temoignage', '.temoignage > *'],
    ] as const) {
      if (!root.value!.querySelector(zone)) continue
      $gsap.from(items, {
        y: 30,
        opacity: 0,
        duration: 0.9,
        stagger: 0.08,
        ease: 'power3.out',
        scrollTrigger: { trigger: zone, start: 'top 85%', once: true },
      })
    }
  }, root.value)
})
onBeforeUnmount(() => {
  ctx?.revert()
  document.documentElement.style.removeProperty('--decalage-header')
})
</script>

<template>
  <div class="page-projet">
  <article ref="root" class="feuille">
    <section
      ref="hero"
      class="hero"
      :class="{ 'avec-video': projet.video, 'pastille-active': pastilleActive }"
      data-header-clair
      :style="{ background: projet.teinte }"
      @pointermove="surMouvementHero"
      @pointerenter="surEntreeHero"
      @pointerleave="survolHero = false"
    >
      <!-- Image de départ (capture de l'accueil) sous la vidéo, le temps qu'elle se cale -->
      <img v-if="projet.video && !leger && affiche" :src="affiche" alt="" class="hero-img hero-affiche" aria-hidden="true" />
      <!-- Mode léger : la photo à la place de la vidéo (« Regarder » reste possible, à la demande) -->
      <video
        v-if="projet.video && !leger"
        ref="video"
        :src="projet.video"
        class="hero-img hero-video"
        :class="{ prete: videoPrete }"
        autoplay
        muted
        loop
        playsinline
        aria-hidden="true"
      />
      <img v-else-if="projet.image" :src="projet.image" :alt="projet.titre" class="hero-img" />
      <div class="hero-titre">
        <h1>{{ projet.titre }}</h1>
        <!-- Savoir-faire et année : déjà dans la fiche sous l'intro ; seulement si elle manque -->
        <span v-if="!projet.fiche" class="label">{{ projet.tags.join(' · ') }} — {{ projet.annee }}</span>
      </div>
      <template v-if="projet.video">
        <button type="button" class="regarder" aria-label="Regarder la vidéo en plein écran" @click="regarder" />
        <div ref="pastille" class="pastille" :class="{ visible: pastilleActive }" aria-hidden="true">
          <span class="pastille-in">
            <svg viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z" /></svg>
            Regarder
          </span>
        </div>
      </template>
    </section>
    <ProjetLecteur
      v-if="projet.video"
      ref="lecteur"
      :src="projet.video"
      :poster="projet.image"
      :fond="projet.teinte"
      :titre="projet.titre"
      @fermeture="surFermetureLecteur"
      @ferme="surFermeLecteur"
    />

    <!-- Ce qu'est le projet, en deux phrases -->
    <section id="intro" class="intro grid">
      <h2 class="intro-titre">{{ projet.titre }}</h2>
      <div class="intro-texte">
        <p>{{ projet.description }}</p>
        <a v-if="projet.lien" :href="projet.lien" target="_blank" rel="noopener" class="bouton">
          Voir le site <span class="point" aria-hidden="true" />
        </a>
      </div>
      <!-- Fiche du projet : une ligne d'informations sous l'intro -->
      <dl v-if="projet.fiche" class="fiche">
        <div v-for="l in fiche" :key="l.nom" class="fiche-ligne">
          <dt class="label">{{ l.nom }}</dt>
          <dd>{{ l.valeur }}</dd>
        </div>
      </dl>
    </section>

    <!-- Le défi du client, et notre réponse -->
    <section v-if="projet.recit" id="recit" class="recit grid">
      <div class="recit-bloc">
        <h2 class="recit-titre">Le défi</h2>
        <p>{{ projet.recit.defi }}</p>
      </div>
      <div class="recit-bloc">
        <h2 class="recit-titre">Notre réponse</h2>
        <p>{{ projet.recit.reponse }}</p>
      </div>
    </section>

    <ProjetVisuels v-if="projet.visuels?.length" id="visuels" :visuels="projet.visuels" />

    <ProjetIdentite v-if="projet.identite" id="identite" :identite="projet.identite" />

    <!-- Les mots du client, en grand, pour finir la feuille -->
    <figure v-if="projet.temoignage" id="temoignage" class="temoignage grid">
      <blockquote class="citation serif">
        <p>« {{ projet.temoignage.citation }} »</p>
      </blockquote>
      <figcaption class="auteur">
        <span class="auteur-nom">{{ projet.temoignage.auteur }}</span>
        <span v-if="projet.temoignage.role" class="label">{{ projet.temoignage.role }}</span>
      </figcaption>
    </figure>


  </article>
  <!-- Fin : la feuille remonte et découvre le projet suivant, qu'on ouvre en continuant -->
  <!-- Clé : la fin change de projet (ou passe à « tout vu ») une fois les projets vus connus -->
  <ProjetSuite id="suite" :key="suivant?.slug ?? 'fin'" :projet="suivant" />
  <!-- Sommaire flottant : où on en est, et accès direct aux sections -->
  <ProjetSommaire :sections="sections" />
  </div>
</template>

<style scoped>
/* Feuille : part du plein écran (marge et arrondi à 0), puis se pose avec une marge tout autour */
.feuille {
  --marge-feuille: max(10px, 1.6vw);
  --rayon-feuille: clamp(14px, 1.6vw, 28px);
  /* Coins en squircle (arrondi continu, façon icône iOS) */
  corner-shape: squircle;
  --marge: 0px;
  --rayon: 0px;
  position: relative;
  /* Au-dessus de la fin de page (projet suivant), qui remonte dessous */
  z-index: 1;
  margin: var(--marge) var(--marge) 0;
  border-radius: var(--rayon);
  overflow: clip;
  background: var(--bg);
  padding-bottom: 6vh;
}
/* Un squircle paraît moins arrondi à rayon égal : on double le rayon (même valeur en JS) */
@supports (corner-shape: squircle) {
  .feuille {
    --rayon-feuille: clamp(28px, 3.2vw, 56px);
  }
}
.feuille.posee {
  --marge: var(--marge-feuille);
  --rayon: var(--rayon-feuille);
}
.hero {
  position: relative;
  /* Part du plein écran, réduit à 80svh au montage (voir onMounted) */
  height: 100svh;
  overflow: hidden;
}
/* La vraie souris ne disparaît que lorsque la pastille est là pour la remplacer */
.pastille-active,
.pastille-active .regarder {
  cursor: none;
}
/* Toute la surface du hero est cliquable ; le titre reste au-dessus mais laisse passer les clics */
.regarder {
  position: absolute;
  inset: 0;
  z-index: 1;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}
.regarder:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -6px;
}
.hero-titre {
  z-index: 2;
  pointer-events: none;
}
/* GSAP déplace .pastille (x, y) ; l'apparition se fait sur .pastille-in */
.pastille {
  position: absolute;
  left: 0;
  top: 0;
  z-index: 3;
  pointer-events: none;
}
.pastille-in {
  display: flex;
  align-items: center;
  gap: 0.45em;
  padding: 0.45em 0.95em 0.45em 0.8em;
  border-radius: 99px;
  background: var(--bg);
  color: var(--fg);
  font-size: var(--text-sm);
  letter-spacing: -0.01em;
  white-space: nowrap;
  transform: scale(0);
  transition: transform 0.35s var(--ease);
}
.pastille svg {
  width: 0.8em;
  height: 0.8em;
  fill: currentColor;
}
.pastille.visible .pastille-in {
  transform: scale(1);
}
@media (hover: none) {
  .avec-video,
  .regarder {
    cursor: pointer;
  }
  /* Tactile : la pastille reste posée au centre-bas du hero */
  .pastille {
    left: 50%;
    top: auto;
    bottom: var(--gutter);
    transform: translateX(-50%);
  }
  .pastille-in {
    transform: none;
  }
}
.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* Capture de départ et vidéo superposées ; la vidéo apparaît une fois calée */
.hero-affiche,
.hero-video {
  position: absolute;
  inset: 0;
}
.hero-video {
  opacity: 0;
}
.hero-video.prete {
  opacity: 1;
}
.hero-titre {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: #fff;
  text-shadow: 0 0 0.8em rgba(0, 0, 0, 0.45);
}
.hero-titre h1 {
  margin: 0 0 0.3em;
  font-size: max(48px, 8vw);
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1;
}

.intro {
  /* Pas de marge en bas : la scène des visuels qui suit a déjà de l'air autour de l'image */
  padding-block: 14vh 0;
  row-gap: 4vh;
  align-items: start;
}
/* Projet sans visuels ni identité : l'intro termine la feuille, on lui laisse de l'air */
.intro:last-child {
  padding-bottom: 18vh;
}
.intro-titre {
  grid-column: 1 / span 6;
  margin: 0;
  font-size: max(40px, 4.4vw);
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.03em;
}
.intro-texte {
  grid-column: 7 / span 4;
  display: grid;
  justify-items: start;
  gap: 2.2em;
}
.intro-texte p {
  margin: 0;
  font-size: max(16px, 1.35vw);
  line-height: 1.35;
  letter-spacing: -0.01em;
}
/* Bouton pilule noir avec un point */
.bouton {
  display: inline-flex;
  align-items: center;
  gap: 0.7em;
  padding: 0.75em 1.1em 0.75em 1.3em;
  border-radius: 99px;
  background: var(--fg);
  color: var(--bg);
  transition: background 0.3s var(--ease);
}
.bouton:hover {
  background: var(--accent);
}
.point {
  width: 0.4em;
  height: 0.4em;
  border-radius: 50%;
  background: currentColor;
  transition: transform 0.4s var(--ease);
}
.bouton:hover .point {
  transform: scale(1.6);
}


/* Fiche : une ligne sous l'intro, séparée par un trait fin. Même espace entre chaque
   information quelle que soit sa longueur : la première au bord gauche, la dernière au droit */
.fiche {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 2em 3em;
  margin: 6vh 0 0;
  padding-top: 2em;
  border-top: 1px solid var(--line);
}
.fiche-ligne {
  display: grid;
  align-content: start;
  gap: 0.5em;
}
.fiche dt {
  color: var(--muted);
}
.fiche dd {
  margin: 0;
  font-size: var(--text-sm);
  letter-spacing: -0.01em;
  line-height: 1.3;
}

/* Défi & réponse : deux colonnes de texte */
.recit {
  padding-block: 16vh 4vh;
  row-gap: 8vh;
  align-items: start;
}
.recit-bloc {
  grid-column: span 5;
  display: grid;
  gap: 1.2em;
}
.recit-bloc:last-child {
  grid-column: 7 / span 5;
}
.recit-titre {
  margin: 0;
  font-size: var(--text-md);
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1;
}
.recit-bloc p {
  margin: 0;
  max-width: 34em;
  font-size: max(16px, 1.35vw);
  line-height: 1.4;
  letter-spacing: -0.01em;
}

/* Témoignage : grande citation en italique, l'auteur dessous */
.temoignage {
  margin: 0;
  padding-block: 18vh 12vh;
  row-gap: 3em;
}
.citation {
  grid-column: 2 / span 10;
  margin: 0;
}
.citation p {
  margin: 0;
  font-size: clamp(30px, 3.8vw, 72px);
  font-style: italic;
  line-height: 1.1;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.auteur {
  grid-column: 2 / span 10;
  display: grid;
  gap: 0.35em;
}
.auteur-nom {
  font-size: var(--text-sm);
  font-weight: 500;
}
.auteur .label {
  color: var(--muted);
}

@media (max-width: 760px) {
  .hero-titre h1 {
    font-size: var(--text-lg);
  }
  .intro-titre,
  .intro-texte {
    grid-column: 1 / -1;
  }
  .fiche {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .recit {
    padding-top: 10vh;
    row-gap: 6vh;
  }
  .recit-bloc,
  .recit-bloc:last-child,
  .citation,
  .auteur {
    grid-column: 1 / -1;
  }
  .temoignage {
    padding-block: 12vh 8vh;
  }
}
</style>
