<script setup lang="ts">
/**
 * L'identité du projet en une planche : logo, palette (présentée comme une mire de télé,
 * clin d'œil au thème du site) et typographies, dans des cases arrondies.
 * Les cases se dévoilent en cascade à l'arrivée, les barres de la mire tombent une à une.
 * Clic sur une couleur : son code est copié.
 */
import type { Identite } from '~/utils/projets'

const props = defineProps<{ identite: Identite }>()

const { $gsap } = useNuxtApp()
// Mouvement réduit ou mode léger (voir useLeger) : pas d'animation
const { reduit } = useLeger()
const root = ref<HTMLElement>()
const copiee = ref<string | null>(null)
let minuterie: ReturnType<typeof setTimeout> | undefined

/** Texte lisible sur une couleur : clair ou sombre selon sa luminance */
function encre(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const l = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
  return l > 0.55 ? '#1a120c' : '#f4ede3'
}

async function copier(hex: string) {
  try {
    await navigator.clipboard.writeText(hex)
    copiee.value = hex
    clearTimeout(minuterie)
    minuterie = setTimeout(() => (copiee.value = null), 1400)
  } catch {
    // Presse-papiers indisponible : tant pis, rien d'autre à faire
  }
}

// Extrait d'alphabet pour les spécimens
const ALPHABET = 'Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk 0123456789'

// Typos du projet : une police fournie en fichier est chargée sur la page (@font-face) ;
// sinon la famille indiquée, sinon celle du site. Repli : sans ou serif du site.
const FORMATS: Record<string, string> = { woff2: 'woff2', woff: 'woff', ttf: 'truetype', otf: 'opentype' }
const typos = computed(() =>
  props.identite.typos.map((t, i) => {
    const repli = t.serif ? 'var(--font-serif)' : 'var(--font-sans)'
    if (!t.fichier) return { ...t, css: t.famille ?? repli, face: '' }
    // Nom propre au fichier : deux projets ne se marchent pas dessus
    const nom = `typo-${i}-${[...t.fichier].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36)}`
    const ext = t.fichier.split('.').pop()!.toLowerCase()
    const format = FORMATS[ext] ? ` format('${FORMATS[ext]}')` : ''
    return {
      ...t,
      // Nom sans guillemets (identifiant CSS valide) : rien à échapper dans l'attribut style
      css: `${nom}, ${repli}`,
      face: `@font-face{font-family:'${nom}';src:url('${t.fichier}')${format};font-display:swap}`,
    }
  }),
)
useHead({
  style: computed(() => {
    const faces = typos.value.map((t) => t.face).join('')
    return faces ? [{ key: 'typos-projet', innerHTML: faces }] : []
  }),
})

let ctx: ReturnType<typeof $gsap.context> | undefined
onMounted(() => {
  if (reduit()) return
  ctx = $gsap.context(() => {
    const tl = $gsap.timeline({ scrollTrigger: { trigger: root.value!, start: 'top 75%', once: true } })
    // Cases : dévoilées de bas en haut, en cascade
    tl.fromTo(
      '.case',
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power4.out', stagger: 0.1, clearProps: 'clipPath' },
    )
      // Logo : arrive en grandissant légèrement
      .from('.logo-mono, .logo-img', { scale: 0.8, opacity: 0, duration: 1, ease: 'power3.out' }, 0.3)
      // Mire : les barres tombent une à une, puis la bande en damier
      .from('.barre', { scaleY: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07 }, 0.25)
      .from('.damier', { scaleX: 0, duration: 0.8, ease: 'expo.out' }, 0.6)
      // Spécimens : le « Aa » monte
      .from('.specimen', { yPercent: 40, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12 }, 0.4)
  }, root.value)
})
onBeforeUnmount(() => {
  ctx?.revert()
  clearTimeout(minuterie)
})
</script>

<template>
  <section ref="root" class="identite grid" aria-label="Identité visuelle">
    <header class="tete">
      <span class="label">Identité</span>
      <p v-if="identite.texte">{{ identite.texte }}</p>
    </header>

    <!-- Logo -->
    <div class="case logo" :style="{ background: identite.logo.fond, color: identite.logo.encre ?? encre(identite.logo.fond) }">
      <!-- Fichier du logo (SVG, PNG) ; sinon monogramme et nom en texte -->
      <img
        v-if="identite.logo.image"
        :src="identite.logo.image"
        :alt="identite.logo.nom ? `Logo ${identite.logo.nom}` : 'Logo'"
        class="logo-img"
      />
      <template v-else>
        <span class="logo-mono serif">{{ identite.logo.monogramme }}</span>
        <span v-if="identite.logo.nom" class="logo-nom">{{ identite.logo.nom }}</span>
      </template>
      <span class="label coin">Logo</span>
    </div>

    <!-- Palette en mire -->
    <div class="case mire" role="group" aria-label="Palette de couleurs">
      <div class="barres">
        <button
          v-for="c in identite.couleurs"
          :key="c.hex"
          type="button"
          class="barre"
          :style="{ background: c.hex, color: encre(c.hex) }"
          :aria-label="`${c.nom}, ${c.hex} : copier le code`"
          @click="copier(c.hex)"
        >
          <span class="label barre-nom">{{ c.nom }}</span>
          <span class="label barre-hex">{{ copiee === c.hex ? 'Copié' : c.hex }}</span>
        </button>
      </div>
      <div class="damier" aria-hidden="true" />
    </div>

    <!-- Typographies -->
    <div
      v-for="(t, i) in typos"
      :key="t.nom"
      class="case typo"
      :class="i % 2 ? 'droite' : 'gauche'"
      :style="{ background: t.fond, color: t.encre }"
    >
      <span class="specimen" :class="{ serif: t.serif }" :style="{ fontFamily: t.css }">Aa</span>
      <div class="typo-infos">
        <span class="typo-nom">{{ t.nom }}</span>
        <span class="label">{{ t.usage }}</span>
      </div>
      <span class="alphabet" :class="{ serif: t.serif }" :style="{ fontFamily: t.css }">{{ ALPHABET }}</span>
    </div>
  </section>
</template>

<style scoped>
.identite {
  padding-block: 14vh 4vh;
  row-gap: var(--gap);
}
.tete {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 2em;
  margin-bottom: 4vh;
}
.tete .label {
  opacity: 0.6;
}
.tete p {
  margin: 0;
  max-width: 26em;
  font-size: max(16px, 1.35vw);
  line-height: 1.35;
  letter-spacing: -0.01em;
}

/* Cases de la planche : coins arrondis (squircle si possible) */
.case {
  position: relative;
  overflow: hidden;
  border-radius: clamp(12px, 1.4vw, 24px);
  corner-shape: squircle;
}
@supports (corner-shape: squircle) {
  .case {
    border-radius: clamp(24px, 2.8vw, 48px);
  }
}
.coin {
  position: absolute;
  left: 1.4em;
  top: 1.2em;
  opacity: 0.7;
}

/* Logo */
.logo {
  grid-column: 1 / span 7;
  aspect-ratio: 16 / 11;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.6em;
}
.logo-mono {
  font-size: max(90px, 14vw);
  line-height: 0.8;
  letter-spacing: -0.04em;
}
/* Fichier du logo : centré, sans déborder de la case */
.logo-img {
  width: min(60%, 560px);
  max-height: 55%;
  object-fit: contain;
}
.logo-nom {
  font-size: var(--text-md);
  letter-spacing: 0.24em;
  text-transform: uppercase;
}

/* Mire : barres de couleur, puis une bande en damier comme sur une mire de télé */
.mire {
  grid-column: 8 / -1;
  display: flex;
  flex-direction: column;
  background: #111;
}
.barres {
  flex: 1;
  display: flex;
}
.barre {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 0.3em;
  padding: 1em 0.8em;
  border: 0;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transform-origin: top;
  transition: flex 0.6s var(--ease);
}
.barre:hover,
.barre:focus-visible {
  flex: 1.7;
}
.barre:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -4px;
}
.barre-nom,
.barre-hex {
  white-space: nowrap;
}
.barre-hex {
  opacity: 0.7;
}
.damier {
  height: 9%;
  min-height: 18px;
  transform-origin: left;
  background: repeating-linear-gradient(to right, #f4ede3 0 6.25%, #111 6.25% 12.5%);
}

/* Typographies */
.typo {
  aspect-ratio: 16 / 9;
  display: grid;
  grid-template-rows: 1fr auto auto;
  gap: 1em;
  padding: 1.6em;
}
.gauche {
  grid-column: 1 / span 6;
}
.droite {
  grid-column: 7 / -1;
}
.specimen {
  align-self: center;
  font-size: max(80px, 11vw);
  line-height: 0.85;
  letter-spacing: -0.04em;
  font-weight: 500;
}
.specimen.serif {
  font-weight: 400;
}
.typo-infos {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1em;
  border-top: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  padding-top: 0.9em;
}
.typo-infos .label {
  opacity: 0.7;
}
.typo-nom {
  font-size: var(--text-md);
  letter-spacing: -0.02em;
}
.alphabet {
  font-size: var(--text-sm);
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 760px) {
  .tete {
    flex-direction: column;
  }
  .logo,
  .mire,
  .gauche,
  .droite {
    grid-column: 1 / -1;
  }
  .mire {
    aspect-ratio: 4 / 3;
  }
}
</style>
