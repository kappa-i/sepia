<script setup lang="ts">
// Accueil = un seul hero plein écran, sans scroll (voir `fullscreen` dans le layout)
definePageMeta({ fullscreen: true })

useSeoMeta({
  title: 'Sepia — Agence web',
  description: 'Sites vitrines, e-commerce et identité visuelle pour indépendants, PME et startups.',
})
</script>

<template>
  <section class="hero" aria-label="Projets réalisés">
    <h1 class="sr-only">Sepia — Agence web : sites vitrines, e-commerce et identité visuelle</h1>
    <ProjectScreen :items="projets" />
  </section>
</template>

<style scoped>
.hero {
  height: 100%;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
