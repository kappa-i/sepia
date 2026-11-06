<script setup lang="ts">
/** Grand titre de page qui monte derrière un masque à l'arrivée (comme Projets et Contact) */
const root = ref<HTMLElement>()
const { $gsap } = useNuxtApp()
let tw: ReturnType<typeof $gsap.from> | undefined
onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  tw = $gsap.from(root.value!.querySelector('.titre-masque > span')!, {
    yPercent: 110,
    duration: 1,
    ease: 'power4.out',
    delay: 0.15,
  })
})
onBeforeUnmount(() => tw?.revert())
</script>

<template>
  <h1 ref="root" class="titre-page">
    <span class="titre-masque"><span><slot /></span></span>
  </h1>
</template>

<style scoped>
.titre-page {
  margin: 0;
  padding: 10vh var(--gutter) 0;
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
</style>
