<script setup lang="ts">
/**
 * Sommaire flottant de la page projet : indique la section en cours et l'avancement dans la
 * feuille, et permet d'aller directement à une section (on ne lit que ce qui nous intéresse).
 * Caché sur le hero (rien encore à suivre) et une fois la feuille partie (projet suivant).
 */
const props = defineProps<{ sections: { id: string; titre: string }[] }>()

const { $gsap } = useNuxtApp()
// Mouvement réduit ou mode léger (voir useLeger) : pas d'animation
const { reduit } = useLeger()
const menuOuvert = useState('menuOuvert', () => false)

const ouvert = ref(false)
const visible = ref(false)
const actuelle = ref(0)
const avance = ref(0)
const racine = ref<HTMLElement>()

const el = (id: string) => document.getElementById(id)

function maj() {
  const hero = document.querySelector('main .hero')
  const suite = el('suite')
  const fin = suite ? suite.getBoundingClientRect().top + scrollY - innerHeight : document.documentElement.scrollHeight - innerHeight
  const debutHero = hero ? hero.getBoundingClientRect().bottom + scrollY - innerHeight * 0.5 : 0
  // Visible entre la fin du hero et le départ de la feuille
  visible.value = scrollY > debutHero && (!suite || suite.getBoundingClientRect().top > innerHeight * 0.5)
  if (!visible.value) ouvert.value = false
  avance.value = Math.min(1, Math.max(0, scrollY / Math.max(1, fin)))
  // Section en cours : la dernière dont le haut a passé le milieu de l'écran
  let n = 0
  props.sections.forEach((s, k) => {
    const e = el(s.id)
    if (e && e.getBoundingClientRect().top <= innerHeight * 0.5) n = k
  })
  actuelle.value = n
}

let tw: ReturnType<typeof $gsap.to> | undefined
function aller(id: string) {
  const e = el(id)
  ouvert.value = false
  if (!e) return
  // Haut de la section en haut de l'écran : le couloir des visuels se cale ainsi sur son
  // premier visuel, et les autres sections ont déjà assez d'air au-dessus pour le header
  const y = Math.max(0, e.getBoundingClientRect().top + scrollY)
  if (reduit()) return scrollTo(0, y)
  const proxy = { y: scrollY }
  const distance = Math.abs(y - scrollY)
  tw?.kill()
  tw = $gsap.to(proxy, {
    y,
    duration: Math.min(1.6, 0.6 + distance / 4000),
    ease: 'power3.inOut',
    onUpdate: () => scrollTo(0, proxy.y),
  })
}

// Un geste de l'utilisateur pendant le trajet reprend la main
const stopper = () => tw?.kill()
function horsSommaire(e: PointerEvent) {
  if (ouvert.value && racine.value && !racine.value.contains(e.target as Node)) ouvert.value = false
}
function echap(e: KeyboardEvent) {
  if (e.key === 'Escape') ouvert.value = false
}

onMounted(() => {
  maj()
  addEventListener('scroll', maj, { passive: true })
  addEventListener('resize', maj)
  addEventListener('wheel', stopper, { passive: true })
  addEventListener('touchstart', stopper, { passive: true })
  addEventListener('pointerdown', horsSommaire)
  addEventListener('keydown', echap)
})
onBeforeUnmount(() => {
  tw?.kill()
  removeEventListener('scroll', maj)
  removeEventListener('resize', maj)
  removeEventListener('wheel', stopper)
  removeEventListener('touchstart', stopper)
  removeEventListener('pointerdown', horsSommaire)
  removeEventListener('keydown', echap)
})

const numero = (k: number) => String(k + 1).padStart(2, '0')
</script>

<template>
  <nav
    ref="racine"
    class="sommaire"
    :class="{ visible: visible && !menuOuvert, ouvert }"
    aria-label="Sections du projet"
    :inert="!visible || menuOuvert"
  >
    <ul id="sommaire-liste" class="liste">
      <li v-for="(s, k) in sections" :key="s.id">
        <button
          type="button"
          class="entree"
          :class="{ actif: k === actuelle }"
          :aria-current="k === actuelle ? 'true' : undefined"
          :tabindex="ouvert ? 0 : -1"
          @click="aller(s.id)"
        >
          <span class="num">{{ numero(k) }}</span>{{ s.titre }}
        </button>
      </li>
    </ul>
    <button
      type="button"
      class="pilule"
      aria-controls="sommaire-liste"
      :aria-expanded="ouvert"
      @click="ouvert = !ouvert"
    >
      <span class="num">{{ numero(actuelle) }}</span>
      <span class="titre-masque">
        <Transition name="titre">
          <span :key="actuelle" class="titre">{{ sections[actuelle]?.titre }}</span>
        </Transition>
      </span>
      <span class="jauge" aria-hidden="true"><span :style="{ transform: `scaleX(${avance})` }" /></span>
    </button>
  </nav>
</template>

<style scoped>
.sommaire {
  position: fixed;
  right: calc(var(--gutter) + max(10px, 1.6vw));
  bottom: calc(var(--gutter) + max(10px, 1.6vw));
  z-index: 20;
  display: grid;
  justify-items: end;
  gap: 0.5em;
  font-size: var(--text-xs);
  opacity: 0;
  transform: translateY(12px);
  pointer-events: none;
  transition:
    opacity 0.4s var(--ease),
    transform 0.4s var(--ease);
}
.sommaire.visible {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}
.pilule,
.liste {
  background: var(--fg);
  color: var(--bg);
  border-radius: 99px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.18);
}
.pilule {
  display: flex;
  align-items: center;
  gap: 0.8em;
  padding: 0.7em 1.1em;
  border: 0;
  font: inherit;
  cursor: pointer;
}
.pilule:focus-visible,
.entree:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 3px;
}
.num {
  opacity: 0.5;
  font-variant-numeric: tabular-nums;
  margin-right: 0.7em;
}
.pilule .num {
  margin-right: 0;
}
/* Le titre glisse quand on change de section (comme la légende des visuels) */
.titre-masque {
  display: grid;
  overflow: hidden;
  min-width: 7em;
  text-align: left;
}
.titre {
  grid-area: 1 / 1;
  white-space: nowrap;
}
.titre-enter-active,
.titre-leave-active {
  transition: transform 0.5s var(--ease);
}
.titre-enter-from {
  transform: translateY(110%);
}
.titre-leave-to {
  transform: translateY(-110%);
}
/* Avancement dans la feuille */
.jauge {
  width: 3.2em;
  height: 2px;
  border-radius: 2px;
  background: rgba(237, 234, 226, 0.2);
  overflow: hidden;
}
.jauge span {
  display: block;
  height: 100%;
  background: var(--accent);
  transform-origin: left;
}
/* Liste des sections, dépliée au-dessus de la pilule */
.liste {
  margin: 0;
  padding: 0.5em;
  list-style: none;
  border-radius: 1.2em;
  transform-origin: bottom right;
  transform: scale(0.9) translateY(8px);
  opacity: 0;
  visibility: hidden;
  transition:
    transform 0.35s var(--ease),
    opacity 0.25s var(--ease),
    visibility 0s 0.35s;
}
.ouvert .liste {
  transform: none;
  opacity: 1;
  visibility: visible;
  transition:
    transform 0.35s var(--ease),
    opacity 0.25s var(--ease);
}
.entree {
  display: block;
  width: 100%;
  padding: 0.6em 1.4em 0.6em 0.8em;
  border: 0;
  border-radius: 0.8em;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  opacity: 0.65;
  transition:
    opacity 0.25s var(--ease),
    background 0.25s var(--ease);
}
.entree:hover,
.entree.actif {
  opacity: 1;
}
.entree:hover {
  background: rgba(237, 234, 226, 0.08);
}
.entree.actif .num {
  color: var(--accent);
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .sommaire,
  .liste,
  .titre-enter-active,
  .titre-leave-active {
    transition: none;
  }
}
</style>
