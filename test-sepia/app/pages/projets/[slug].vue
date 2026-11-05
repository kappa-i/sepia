<script setup lang="ts">
// La page commence par l'image plein écran : c'est la fin de l'animation d'ouverture de l'accueil
definePageMeta({ overlayHeader: true })

const route = useRoute()
const { $gsap } = useNuxtApp()
const root = ref<HTMLElement>()
const video = ref<HTMLVideoElement>()
const videoTemps = useState<number>('videoTemps', () => 0)

const i = projets.findIndex((p) => p.slug === route.params.slug)
if (i === -1) throw createError({ statusCode: 404, statusMessage: 'Projet introuvable', fatal: true })
const projet = projets[i]!
const suivant = projets[(i + 1) % projets.length]!

useSeoMeta({
  title: `${projet.titre} — Sepia`,
  description: projet.description,
})

let ctx: ReturnType<typeof $gsap.context> | undefined
onMounted(() => {
  if (video.value && videoTemps.value) {
    video.value.currentTime = videoTemps.value
    videoTemps.value = 0
  }
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.value?.querySelector<HTMLElement>('.hero')?.style.setProperty('height', '80svh')
    return
  }
  ctx = $gsap.context(() => {
    // L'image arrive plein écran (fin de l'animation de l'accueil) puis se réduit à 80vh
    $gsap.to('.hero', { height: '80svh', duration: 1.2, ease: 'power4.inOut', delay: 0.2 })
    $gsap.from('.hero-titre > *', { y: 30, opacity: 0, duration: 0.9, stagger: 0.1, ease: 'power3.out' })
    $gsap.from('.contenu > *', { y: 30, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', delay: 0.3 })
  }, root.value)
})
onBeforeUnmount(() => ctx?.revert())
</script>

<template>
  <article ref="root">
    <section class="hero" :style="{ background: projet.teinte }">
      <video
        v-if="projet.video"
        ref="video"
        :src="projet.video"
        :poster="projet.image"
        class="hero-img"
        autoplay
        muted
        loop
        playsinline
        aria-hidden="true"
      />
      <img v-else-if="projet.image" :src="projet.image" :alt="projet.titre" class="hero-img" />
      <div class="hero-titre">
        <h1>{{ projet.titre }}</h1>
        <span class="label">{{ projet.tags.join(' · ') }} — {{ projet.annee }}</span>
      </div>
    </section>

    <section class="contenu grid">
      <dl class="infos">
        <div>
          <dt class="label">Client</dt>
          <dd>{{ projet.client }}</dd>
        </div>
        <div>
          <dt class="label">Services</dt>
          <dd>{{ projet.tags.join(', ') }}</dd>
        </div>
        <div>
          <dt class="label">Année</dt>
          <dd>{{ projet.annee }}</dd>
        </div>
      </dl>
      <p class="description">{{ projet.description }}</p>
    </section>

    <NuxtLink :to="`/projets/${suivant.slug}`" class="suivant grid">
      <span class="label">Projet suivant</span>
      <span class="suivant-titre">{{ suivant.titre }} <span class="serif">→</span></span>
    </NuxtLink>
  </article>
</template>

<style scoped>
.hero {
  position: relative;
  /* Part du plein écran, réduit à 80svh au montage (voir onMounted) */
  height: 100svh;
  overflow: hidden;
}
.hero-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
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

.contenu {
  padding-top: 12vh;
  row-gap: 6vh;
}
.infos {
  grid-column: 1 / span 4;
  margin: 0;
  display: grid;
  gap: 1.5em;
}
.infos dt {
  color: var(--muted);
  margin-bottom: 0.3em;
}
.infos dd {
  margin: 0;
  font-size: var(--text-md);
  letter-spacing: -0.02em;
}
.description {
  grid-column: 6 / -1;
  margin: 0;
  font-size: var(--text-lg);
  line-height: 1.1;
  letter-spacing: -0.03em;
  text-indent: 15%;
}

.suivant {
  margin-top: 20vh;
  padding-block: 4vh;
  border-top: 1px solid var(--line);
  align-items: baseline;
  transition: color 0.4s var(--ease);
}
.suivant:hover {
  color: var(--accent);
}
.suivant .label {
  grid-column: 1 / span 3;
}
.suivant-titre {
  grid-column: 4 / -1;
  font-size: var(--text-lg);
  font-weight: 500;
  letter-spacing: -0.03em;
}

@media (max-width: 760px) {
  .hero-titre h1 {
    font-size: var(--text-lg);
  }
  .infos,
  .description,
  .suivant .label,
  .suivant-titre {
    grid-column: 1 / -1;
  }
  .description {
    text-indent: 0;
  }
}
</style>
