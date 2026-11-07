<script setup lang="ts">
const { $gsap } = useNuxtApp()
const voileEl = ref<HTMLElement>()
const year = new Date().getFullYear()
const introDone = useState('introDone', () => false)
// Voile noir du premier chargement. Sur l'accueil, c'est l'écran (ProjectScreen) qui le retire
// et joue l'intro (la télé s'allume) ; sur les autres pages, il s'efface simplement.
const voile = useState('introVoile', () => true)
const route = useRoute()
// Pages plein écran (ex. accueil) : hauteur de l'écran, pas de scroll, pas de footer
const fullscreen = computed(() => !!route.meta.fullscreen)
// Header posé par-dessus le contenu (ex. page projet qui commence par une image plein écran)
const overlay = computed(() => !!route.meta.overlayHeader)

// Menu « écran télé » (voir SiteMenu)
const menuOuvert = useState('menuOuvert', () => false)

// Header superposé : textes clairs tant qu'il est posé sur une zone sombre (image du hero,
// section sombre… marquées `data-header-clair`), comme sur l'accueil ; sombres sinon
const header = ref<HTMLElement>()
const surImage = ref(true)
// Header superposé encore posé sur le hero : l'accroche (« Agence de design & web · Lausanne »)
// n'est affichée qu'à ce moment-là, elle disparaît une fois le hero dépassé
const surHero = ref(true)
// Autres pages : l'accroche disparaît dès qu'on a un peu défilé, et revient tout en haut
const enHaut = ref(true)
function majSurImage() {
  enHaut.value = scrollY < 80
  const milieu = (header.value?.offsetHeight ?? 0) / 2
  surImage.value = [...document.querySelectorAll('main [data-header-clair]')].some((el) => {
    const r = el.getBoundingClientRect()
    return r.top <= milieu && r.bottom > milieu
  })
  const hero = document.querySelector('main .hero')
  surHero.value = !hero || hero.getBoundingClientRect().bottom > milieu
}
watch(() => route.fullPath, () => nextTick(majSurImage))
// Hauteurs réelles du header et de la ligne du bas de l'accueil (--h-header, --h-bas) :
// l'écran de l'accueil se centre entre les deux, à égale distance de chacun
const layoutEl = ref<HTMLElement>()
const miniFooter = ref<HTMLElement>()
let mesure: ResizeObserver | undefined
function mesurer() {
  const l = layoutEl.value
  if (!l) return
  l.style.setProperty('--h-header', `${header.value?.offsetHeight ?? 0}px`)
  l.style.setProperty('--h-bas', `${miniFooter.value?.offsetHeight ?? 0}px`)
}
watch(miniFooter, (el) => {
  if (el) mesure?.observe(el)
  mesurer()
})

onMounted(() => {
  mesure = new ResizeObserver(mesurer)
  if (header.value) mesure.observe(header.value)
  if (miniFooter.value) mesure.observe(miniFooter.value)
  mesurer()
  majSurImage()
  addEventListener('scroll', majSurImage, { passive: true })
  addEventListener('resize', majSurImage)
})
onBeforeUnmount(() => {
  mesure?.disconnect()
  removeEventListener('scroll', majSurImage)
  removeEventListener('resize', majSurImage)
})

// Mode léger (voir useLeger) : classe `leger` sur <html> (animations CSS coupées, voir main.css),
// et la page est remontée à chaque changement de mode pour repartir proprement
const { leger, reduit, version, synchroniser } = useLeger()

useHead({
  htmlAttrs: {
    class: computed(() =>
      [fullscreen.value && 'no-scroll', menuOuvert.value && 'menu-ouvert', leger.value && 'leger'].filter(Boolean).join(' '),
    ),
  },
})

onMounted(() => {
  synchroniser()
  // Accueil : déjà retiré par l'écran (monté avant le layout), qui s'occupe de l'intro
  if (!voile.value) return
  const fin = () => {
    voile.value = false
    introDone.value = true
  }
  if (reduit() || !voileEl.value) return fin()
  // Autre page : pas d'intro, le noir s'efface
  introDone.value = true
  $gsap.to(voileEl.value, { opacity: 0, duration: 0.5, delay: 0.1, ease: 'power2.out', onComplete: fin })
})
</script>

<template>
  <div ref="layoutEl" class="layout" :class="{ fullscreen, 'avec-menu': menuOuvert, intro: !introDone }">
    <!-- Noir du premier chargement sur les autres pages (voir `voile`). Sur l'accueil, l'écran
         rend lui-même la pièce noire avec le logo dès le premier affichage -->
    <div v-if="voile && !fullscreen" ref="voileEl" class="voile" aria-hidden="true" />

    <header ref="header" class="header grid" :class="{ overlay, 'sur-image': overlay && (surImage || menuOuvert) }">
      <div class="marque">
        <NuxtLink to="/" class="logo">Sepia<sup>©</sup></NuxtLink>
        <!-- Apparaît en glissant vers le haut une fois l'intro terminée -->
        <p class="tagline label" :class="{ visible: introDone && (overlay ? surHero : enHaut) }">
          <span class="tagline-mot">{{ accroche }}</span>
          <span v-if="ville" class="tagline-mot">· {{ ville }}</span>
        </p>
      </div>
      <button
        type="button"
        class="menu-btn"
        aria-controls="menu"
        :aria-expanded="menuOuvert"
        :aria-label="menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'"
        @click="menuOuvert = !menuOuvert"
      >
        <span aria-hidden="true">[</span><span class="menu-mot">{{ menuOuvert ? 'Fermer' : 'Menu' }}</span><span aria-hidden="true">]</span>
      </button>
    </header>
    <!-- Hors du header : son mix-blend-mode fausserait les couleurs de l'écran -->
    <SiteMenu />
    <!-- Extinction de télé entre deux pages (écran « Votre projet » de l'accueil) -->
    <TeleExtinction />

    <main :inert="menuOuvert">
      <!-- Remontée à chaque changement de mode léger ; sans boîte propre (display: contents) -->
      <div :key="version" class="page-mode"><slot /></div>
    </main>

    <!-- Pages plein écran (accueil) : pas de footer, juste une ligne discrète en bas -->
    <div v-if="fullscreen" ref="miniFooter" class="mini-footer grid label" :inert="menuOuvert">
      <!-- Même page que « À propos » dans le menu -->
      <NuxtLink to="/a-propos" class="mini-apropos"><span class="link">À propos de Sepia</span></NuxtLink>
      <!-- Au centre, seul : l'accueil ne montre que les projets marquants, ici on va à tous les autres -->
      <NuxtLink to="/projets" class="mini-cta mini-projets">
        <span class="link">Tous les projets</span><sup class="mini-compte">{{ projets.length }}</sup>
        <span class="mini-fleche" aria-hidden="true">→</span>
      </NuxtLink>
      <!-- Les réseaux sont sur la page Contact -->
      <nav class="footer-links" aria-label="Contact">
        <NuxtLink to="/contact" class="mini-cta"><span class="link">Contact</span></NuxtLink>
      </nav>
    </div>

    <!-- Footer des pages intérieures (pas l'accueil, ni les pages projet qui finissent sur
         « Projet suivant », ni Contact qui a sa propre ligne, identique à celle-ci) -->
    <footer v-if="!fullscreen && !route.meta.sansFooter" class="footer" :inert="menuOuvert">
      <div class="footer-haut grid">
        <NuxtLink to="/contact" class="footer-cta">
          <span class="link">Un projet<span class="serif"> en tête&nbsp;?</span></span>
        </NuxtLink>
        <div class="footer-ecrire">
          <span class="label footer-discret">Écrivez-nous</span>
          <a :href="`mailto:${email}`" class="link">{{ email }}</a>
        </div>
      </div>
      <!-- Mêmes colonnes que le bas de la page Contact ; les réseaux au milieu -->
      <div class="footer-bottom grid label">
        <span>© {{ year }} Sepia</span>
        <span class="footer-mid footer-reseaux">
          <a v-for="r in reseaux" :key="r.nom" :href="r.url" target="_blank" rel="noopener" class="link">{{ r.nom }}</a>
        </span>
        <span class="footer-links">
          <BoutonLeger />
          <NuxtLink to="/mentions-legales" class="link">Mentions légales</NuxtLink>
        </span>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.layout.fullscreen {
  position: relative;
  height: 100svh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--fond-accueil);
}
/* Accueil : header transparent posé sur l'ambiance (halo, grain), seuls les liens restent.
   Le mélange « difference » teintait les liens avec le halo : couleur claire simple ici. */
.layout.fullscreen .header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background: transparent;
  mix-blend-mode: normal;
  color: var(--bg);
}
.layout.fullscreen main {
  flex: 1;
  min-height: 0;
}
.page-mode {
  display: contents;
}
.mini-footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  align-items: baseline;
  padding-block: var(--gutter);
  color: rgba(237, 234, 226, 0.55);
}
.mini-footer > :first-child {
  grid-column: 1 / span 3;
}
/* Survol : le trait commun à tous les liens (.link, voir main.css) */
.mini-apropos {
  justify-self: start;
  white-space: nowrap;
}
.mini-cta {
  color: var(--bg);
}
/* Contact, à droite : après « Tous les projets » (colonnes 5 à 8), sinon il passe à la ligne */
.mini-footer .footer-links {
  grid-column: 9 / -1;
}
.mini-projets {
  grid-column: 5 / span 4;
  justify-self: center;
  display: inline-flex;
  align-items: baseline;
  white-space: nowrap;
}
.mini-compte {
  margin-left: 0.25em;
  font-size: 0.75em;
  vertical-align: super;
  opacity: 0.55;
}
.mini-fleche {
  margin-left: 0.6em;
}

/* Menu ouvert : le header (logo, [Off]) reste au-dessus de l'écran télé */
.avec-menu .header {
  z-index: 60;
}
/* Header superposé (page projet) : comme sur l'accueil, pas de mélange « difference » */
.header.overlay {
  position: fixed;
  left: 0;
  right: 0;
  /* La page projet (feuille posée avec une marge) décale le header du bord via --decalage-header */
  padding: calc(var(--gutter) + var(--decalage-header, 0px)) calc(var(--gutter) + var(--decalage-header, 0px)) var(--gutter);
  mix-blend-mode: normal;
  color: var(--fg);
  transition: color 0.4s var(--ease);
}
.header.overlay.sur-image {
  color: var(--bg);
}

.voile {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: var(--nuit);
}
/* Pendant l'intro, le header et la ligne du bas attendent que la télé ait capté le premier projet */
.header,
.mini-footer {
  transition: opacity 0.8s var(--ease);
}
.intro .header,
.intro .mini-footer {
  opacity: 0;
}

.header {
  position: sticky;
  top: 0;
  z-index: 10;
  align-items: baseline;
  padding-block: var(--gutter);
  mix-blend-mode: difference;
  color: #fff;
}
.marque {
  grid-column: 1 / span 7;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  column-gap: 1.5em;
  row-gap: 0.35em;
}
.logo {
  /* Sinon le lien s'étire sur toute la largeur (zone cliquable et contour trop larges) */
  justify-self: start;
  font-weight: 600;
  font-size: var(--text-md);
  letter-spacing: -0.03em;
}
.tagline {
  display: flex;
  gap: 0.4em;
  margin: 0;
  overflow: hidden;
  opacity: 0.7;
  white-space: nowrap;
}
.tagline-mot {
  display: inline-block;
  transform: translateY(110%);
  transition: transform 0.8s var(--ease);
}
.tagline-mot + .tagline-mot {
  transition-delay: 0.12s;
}
.tagline.visible .tagline-mot {
  transform: none;
}
@media (prefers-reduced-motion: reduce) {
  .tagline-mot {
    transition: none;
  }
}
.menu-btn {
  grid-column: 8 / -1;
  justify-self: end;
  padding: 0;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
}
/* Survol : les crochets s'écartent un peu autour du mot */
.menu-mot {
  display: inline-block;
  margin-inline: 0.1em;
  transition: margin 0.4s var(--ease);
}
.menu-btn:hover .menu-mot,
.menu-btn:focus-visible .menu-mot {
  margin-inline: 0.35em;
}
.menu-btn:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 4px;
}
sup {
  font-size: 0.4em;
  vertical-align: super;
}

.footer {
  margin-top: 20vh;
  background: var(--fg);
  color: var(--bg);
  padding-top: 14vh;
}
/* L'appel, à taille de titre (plus de lettres géantes), et l'adresse en face */
.footer-haut {
  align-items: end;
  row-gap: 5vh;
}
.footer-cta {
  grid-column: 1 / span 8;
  justify-self: start;
  font-size: clamp(40px, 5.2vw, 96px);
  line-height: 1;
  letter-spacing: -0.045em;
  font-weight: 500;
}
.footer-cta .serif {
  font-weight: 400;
  letter-spacing: -0.02em;
}
.footer-ecrire {
  grid-column: 9 / -1;
  justify-self: end;
  display: grid;
  justify-items: end;
  gap: 0.5em;
  font-size: var(--text-sm);
  letter-spacing: -0.01em;
}
.footer-discret {
  color: rgba(237, 234, 226, 0.55);
}
/* Ligne du bas : mêmes colonnes que le bas de la page Contact */
.footer-bottom {
  margin-top: 14vh;
  padding-block: var(--gutter);
  align-items: baseline;
  border-top: 1px solid rgba(237, 234, 226, 0.12);
  color: rgba(237, 234, 226, 0.55);
}
.footer-bottom > :first-child {
  grid-column: 1 / span 3;
}
.footer-mid {
  grid-column: 4 / span 4;
}
.footer-reseaux {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4em 1.5em;
}
.footer-links {
  grid-column: 8 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 1.5em;
}

@media (max-width: 760px) {
  .footer-cta {
    grid-column: 1 / -1;
  }
  .footer-ecrire {
    grid-column: 1 / -1;
    justify-self: start;
    justify-items: start;
  }
  /* Ligne du bas : © et mentions légales, les réseaux en dessous */
  .footer-reseaux {
    grid-column: 1 / -1;
    grid-row: 2;
    margin-top: 0.8em;
  }
  /* Le logo et l'accroche prennent 3 colonnes sur 4 : « Agence de design & web · Lausanne »
     tient sur une ligne (et passe à la ligne plutôt que d'être coupé sur un très petit écran) */
  .marque {
    grid-column: 1 / span 3;
  }
  .menu-btn {
    grid-column: 4 / -1;
  }
  .tagline {
    flex-wrap: wrap;
  }
  .footer-bottom > :first-child,
  .mini-footer > :first-child {
    grid-column: 1 / span 2;
  }
  .mini-footer .footer-links {
    grid-column: 3 / -1;
    justify-content: flex-end;
  }
  /* Mobile : pas de place au centre, le lien passe sur sa propre ligne au-dessus */
  .mini-projets {
    grid-column: 1 / -1;
    grid-row: 1;
    justify-self: start;
    margin-bottom: 0.8em;
  }
  .footer-links {
    grid-column: 1 / -1;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
  .footer-bottom .footer-links {
    grid-column: 3 / -1;
    grid-row: 1;
    justify-content: flex-end;
  }
}
</style>
