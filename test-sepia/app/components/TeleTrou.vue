<script setup lang="ts">
/**
 * Voile noir percé d'une étoile allongée : fin de l'extinction d'une télé (voir utils/extinction.ts).
 * L'étoile est mise à l'échelle en JS via `etoile`.
 */
const id = useId()
const el = ref<SVGSVGElement>()
const etoile = ref<SVGPathElement>()
defineExpose({ el, etoile })
</script>

<template>
  <svg ref="el" class="trou" aria-hidden="true">
    <defs>
      <!-- Étoile à 4 branches aux côtés creusés, de -1 à 1 : mise à l'échelle en JS -->
      <path
        :id="`${id}-etoile`"
        ref="etoile"
        d="M-1 0 Q-0.12 -0.12 0 -1 Q0.12 -0.12 1 0 Q0.12 0.12 0 1 Q-0.12 0.12 -1 0 Z"
      />
      <!-- Bord flou de l'ouverture, en px (appliqué hors de la mise à l'échelle) -->
      <filter :id="`${id}-flou`" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.5" />
      </filter>
      <!-- Halo de phosphore autour de l'étoile -->
      <filter :id="`${id}-halo`" x="-100%" y="-100%" width="300%" height="300%">
        <feGaussianBlur stdDeviation="14" />
      </filter>
      <mask :id="`${id}-masque`" maskUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
        <rect width="100%" height="100%" fill="#fff" />
        <g :filter="`url(#${id}-flou)`">
          <use :href="`#${id}-etoile`" fill="#000" />
        </g>
      </mask>
    </defs>
    <rect width="100%" height="100%" style="fill: var(--nuit)" :mask="`url(#${id}-masque)`" />
    <g :filter="`url(#${id}-halo)`" opacity="0.35" style="mix-blend-mode: screen">
      <use :href="`#${id}-etoile`" fill="#edeae2" />
    </g>
  </svg>
</template>

<style scoped>
.trou {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
}
</style>
