<script setup lang="ts">
const { $gsap } = useNuxtApp()
const loader = ref<HTMLElement>()
const year = new Date().getFullYear()
const introDone = useState('introDone', () => false)
const route = useRoute()
// Pages plein écran (ex. accueil) : hauteur de l'écran, pas de scroll, pas de footer
const fullscreen = computed(() => !!route.meta.fullscreen)
// Header posé par-dessus le contenu (ex. page projet qui commence par une image plein écran)
const overlay = computed(() => !!route.meta.overlayHeader)
// Mots qui défilent sous le logo au chargement ; le dernier reste affiché
const metiers = ['sites web', 'identité visuelle', 'design & web']

// Menu « écran télé » (voir SiteMenu)
const menuOuvert = useState('menuOuvert', () => false)

// Header superposé : textes clairs tant qu'il est posé sur une zone sombre (image du hero,
// section sombre… marquées `data-header-clair`), comme sur l'accueil ; sombres sinon
const header = ref<HTMLElement>()
const surImage = ref(true)
// Header superposé encore posé sur le hero : l'accroche (« Agence de design & web · Lausanne »)
// n'est affichée qu'à ce moment-là, elle disparaît une fois le hero dépassé
const surHero = ref(true)
function majSurImage() {
  const milieu = (header.value?.offsetHeight ?? 0) / 2
  surImage.value = [...document.querySelectorAll('main [data-header-clair]')].some((el) => {
    const r = el.getBoundingClientRect()
    return r.top <= milieu && r.bottom > milieu
  })
  const hero = document.querySelector('main .hero')
  surHero.value = !hero || hero.getBoundingClientRect().bottom > milieu
}
watch(() => route.fullPath, () => nextTick(majSurImage))
onMounted(() => {
  majSurImage()
  addEventListener('scroll', majSurImage, { passive: true })
  addEventListener('resize', majSurImage)
})
onBeforeUnmount(() => {
  removeEventListener('scroll', majSurImage)
  removeEventListener('resize', majSurImage)
})

useHead({
  htmlAttrs: {
    class: computed(() => [fullscreen.value && 'no-scroll', menuOuvert.value && 'menu-ouvert'].filter(Boolean).join(' ')),
  },
})

onMounted(() => {
  if (!loader.value) return
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    loader.value.remove()
    introDone.value = true
    return
  }
  const tl = $gsap.timeline()
  const boite = document.querySelector<HTMLElement>('.loader-metiers')!
  const mots = $gsap.utils.toArray<HTMLElement>('.loader-metier')
  // Le CSS les cache déjà dès le rendu serveur (translateY) : on repasse en yPercent pour GSAP
  $gsap.set(['.loader-word', '.loader-agence', ...mots], { y: 0, yPercent: 110 })

  // Logo puis « Agence de … »
  tl.to('.loader-word', { yPercent: 0, duration: 0.6, ease: 'power3.out' })
    .to('.loader-agence', { yPercent: 0, duration: 0.5, ease: 'power3.out' }, '-=0.35')
    .set(boite, { width: () => mots[0]!.offsetWidth }, '<')

  // Les métiers défilent dans le même emplacement ; sa largeur suit chaque mot
  // pour que la ligne « Agence de … » reste centrée
  mots.forEach((mot, i) => {
    tl.fromTo(mot, { yPercent: 110 }, { yPercent: 0, duration: 0.35, ease: 'power3.out' }, i ? '>-0.15' : '<')
    if (i) tl.to(boite, { width: () => mot.offsetWidth, duration: 0.35, ease: 'power3.inOut' }, '<')
    if (i < mots.length - 1) tl.to(mot, { yPercent: -110, duration: 0.3, ease: 'power3.in' }, '>0.1')
  })

  tl.to('.loader-word, .loader-ligne', { yPercent: -110, duration: 0.5, ease: 'power3.in', stagger: 0.05, delay: 0.4 })
    .to(loader.value, {
      clipPath: 'inset(0 0 100% 0)',
      duration: 0.8,
      ease: 'power4.inOut',
      onComplete: () => loader.value?.remove(),
    })
    .call(() => { introDone.value = true }, [], '-=0.5')
})
</script>

<template>
  <div class="layout" :class="{ fullscreen, 'avec-menu': menuOuvert }">
    <div ref="loader" class="loader" aria-hidden="true">
      <div class="loader-inner">
        <span class="loader-mask"><span class="loader-word">Sepia<sup>©</sup></span></span>
        <span class="loader-mask loader-sous">
          <span class="loader-ligne">
            <span class="loader-agence">Agence de</span>
            <span class="loader-metiers">
              <span v-for="m in metiers" :key="m" class="loader-metier serif">{{ m }}</span>
            </span>
          </span>
        </span>
      </div>
    </div>

    <header ref="header" class="header grid" :class="{ overlay, 'sur-image': overlay && (surImage || menuOuvert) }">
      <div class="marque">
        <NuxtLink to="/" class="logo">Sepia<sup>©</sup></NuxtLink>
        <!-- Apparaît en glissant vers le haut une fois l'intro terminée -->
        <p class="tagline label" :class="{ visible: introDone && (!overlay || surHero) }">
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

    <main :inert="menuOuvert">
      <slot />
    </main>

    <!-- Pages plein écran (accueil) : pas de footer, juste une ligne discrète en bas -->
    <div v-if="fullscreen" class="mini-footer grid label" :inert="menuOuvert">
      <span>© {{ year }} Sepia</span>
      <nav class="footer-links" aria-label="Contact et réseaux">
        <NuxtLink to="/contact" class="mini-cta">Contact</NuxtLink>
        <a v-for="r in reseaux" :key="r.nom" :href="r.url" target="_blank" rel="noopener" class="link">{{ r.nom }}</a>
      </nav>
    </div>

    <footer v-if="!fullscreen && !route.meta.sansFooter" class="footer" :inert="menuOuvert">
      <NuxtLink to="/contact" class="footer-cta">
        Un projet<span class="serif"> en tête&nbsp;?</span>
      </NuxtLink>
      <div class="footer-bottom grid label">
        <span>© {{ year }} Sepia</span>
        <span class="footer-mid">Sites vitrines · E-commerce · Identité</span>
        <span class="footer-links">
          <a href="#" class="link">Mentions légales</a>
          <a v-for="r in reseaux" :key="r.nom" :href="r.url" target="_blank" rel="noopener" class="link">{{ r.nom }}</a>
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
  background: var(--fg);
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
.mini-cta {
  color: var(--bg);
}
.mini-footer a {
  transition: color 0.3s var(--ease);
}
.mini-footer a:hover {
  color: var(--bg);
}
.mini-footer .mini-cta:hover {
  color: var(--accent);
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

.loader {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  background: var(--fg);
  color: var(--bg);
  clip-path: inset(0 0 0 0);
}
.loader-mask {
  overflow: hidden;
  display: block;
}
.loader-inner {
  display: grid;
  justify-items: center;
  gap: 0.6em;
  padding-inline: var(--gutter);
  text-align: center;
}
.loader-word {
  display: block;
  font-size: var(--text-lg);
  font-weight: 500;
  letter-spacing: -0.03em;
}
.loader-sous {
  font-size: var(--text-md);
  letter-spacing: -0.02em;
  color: rgba(237, 234, 226, 0.7);
}
.loader-ligne {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.3em;
}
.loader-agence {
  display: block;
}
/* Cachés dès le HTML serveur, sinon ils s'affichent avant que GSAP ne démarre */
.loader-word,
.loader-agence {
  transform: translateY(110%);
}
/* Tous les métiers dans la même case : un seul visible à la fois */
.loader-metiers {
  display: grid;
  justify-items: start;
  overflow: hidden;
  color: var(--bg);
}
.loader-metier {
  grid-area: 1 / 1;
  white-space: nowrap;
  transform: translateY(110%);
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
  padding-top: 10vh;
}
.footer-cta {
  display: block;
  padding-inline: var(--gutter);
  font-size: var(--text-xl);
  line-height: 0.95;
  letter-spacing: -0.05em;
  font-weight: 500;
  transition: color 0.4s var(--ease);
}
.footer-cta:hover {
  color: var(--accent);
}
.footer-bottom {
  padding-block: 8vh var(--gutter);
  color: rgba(237, 234, 226, 0.6);
}
.footer-bottom > :first-child {
  grid-column: 1 / span 3;
}
.footer-mid {
  grid-column: 4 / span 5;
}
.footer-links {
  grid-column: 9 / -1;
  display: flex;
  justify-content: flex-end;
  gap: 1.5em;
}

@media (max-width: 760px) {
  .footer-mid {
    display: none;
  }
  .marque {
    grid-column: 1 / span 2;
  }
  .menu-btn {
    grid-column: 3 / -1;
  }
  .footer-bottom > :first-child,
  .mini-footer > :first-child {
    grid-column: 1 / span 2;
  }
  .mini-footer .footer-links {
    grid-column: 3 / -1;
    justify-content: flex-end;
  }
  .footer-links {
    grid-column: 1 / -1;
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
