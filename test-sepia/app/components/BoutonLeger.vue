<script setup lang="ts">
/** Interrupteur du mode léger (voir useLeger) : dans le menu, le footer et le bas de la page Contact */
const { leger } = useLeger()
</script>

<template>
  <button
    type="button"
    role="switch"
    class="bouton-leger"
    :aria-checked="leger"
    title="Photos à la place des vidéos et animations coupées : moins de données, moins d'énergie"
    @click="leger = !leger"
  >
    <span class="link">Mode léger</span>
    <span class="interrupteur" aria-hidden="true"><span class="bille" /></span>
  </button>
</template>

<style scoped>
.bouton-leger {
  display: inline-flex;
  align-items: center;
  gap: 0.6em;
  padding: 0;
  background: none;
  border: 0;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  white-space: nowrap;
  cursor: pointer;
}
/* Même trait au survol que les autres liens (.link, voir main.css) */
.bouton-leger:hover .link::after,
.bouton-leger:focus-visible .link::after {
  transform: scaleX(1);
  transform-origin: left;
}
.bouton-leger:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 4px;
}
/* Petit interrupteur dessiné à la couleur du texte */
.interrupteur {
  position: relative;
  box-sizing: border-box;
  width: 2em;
  height: 1.1em;
  border: 1px solid currentColor;
  border-radius: 1em;
  opacity: 0.6;
  transition: opacity 0.3s var(--ease);
}
.bille {
  position: absolute;
  top: 50%;
  left: 0.18em;
  width: 0.6em;
  height: 0.6em;
  border-radius: 50%;
  background: currentColor;
  transform: translateY(-50%);
  transition: transform 0.3s var(--ease);
}
.bouton-leger[aria-checked='true'] .interrupteur {
  opacity: 1;
}
.bouton-leger[aria-checked='true'] .bille {
  /* Largeur intérieure − bille − deux marges */
  transform: translate(calc(2em - 2px - 0.6em - 0.36em), -50%);
}
</style>
