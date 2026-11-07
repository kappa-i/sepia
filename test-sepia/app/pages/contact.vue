<script setup lang="ts">
// Pas de formulaire : on écrit directement. La page tient sur un écran et finit par
// sa propre ligne de bas de page (le footer « Un projet en tête ? » renverrait ici même)
definePageMeta({ sansFooter: true })

useSeoMeta({
  title: 'Contact — Sepia',
  description: 'Parlons de votre projet : écrivez-nous.',
})

const { $gsap } = useNuxtApp()
// Mouvement réduit ou mode léger (voir useLeger) : pas d'animation
const { reduit } = useLeger()
const root = ref<HTMLElement>()
const annee = new Date().getFullYear()

// L'e-mail s'ouvre avec un objet et quelques questions déjà posées : le client sait quoi écrire
const corps = [
  'Bonjour,',
  '',
  'Notre activité : ',
  'Ce dont nous avons besoin (site vitrine, e-commerce, identité…) : ',
  'Délai souhaité : ',
  'Budget indicatif : ',
  '',
  'Merci !',
].join('\n')
const mailto = `mailto:${email}?subject=${encodeURIComponent('Nouveau projet')}&body=${encodeURIComponent(corps)}`

// Ce qu'il est utile de dire dans le message (rappelé sous l'adresse)
const pistes = ['Votre activité', 'Ce dont vous avez besoin', 'Délai et budget indicatif']

// Copier l'adresse (pour ceux qui n'ont pas de logiciel de messagerie configuré)
const copie = ref(false)
let minuteur: ReturnType<typeof setTimeout> | undefined
async function copier() {
  try {
    await navigator.clipboard.writeText(email)
    copie.value = true
    clearTimeout(minuteur)
    minuteur = setTimeout(() => (copie.value = false), 2200)
  } catch {
    // Presse-papiers refusé : on laisse le lien mailto faire le travail
    location.href = mailto
  }
}

let ctx: ReturnType<typeof $gsap.context> | undefined
onMounted(() => {
  if (reduit()) return
  ctx = $gsap.context(() => {
    // Le titre monte ligne par ligne derrière son masque, puis l'adresse et le reste
    $gsap
      .timeline({ delay: 0.15 })
      .from('.ligne > span', { yPercent: 110, duration: 1, ease: 'power4.out', stagger: 0.1 })
      .from('.adresse, .actions', { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08 }, '-=0.6')
      .from('.suivre, .pistes li, .bas > *', { y: 12, opacity: 0, duration: 0.6, ease: 'power3.out', stagger: 0.05 }, '-=0.5')
  }, root.value)
})
onBeforeUnmount(() => {
  ctx?.revert()
  clearTimeout(minuteur)
})
</script>

<template>
  <section ref="root" class="contact">
    <h1 class="titre">
      <span class="ligne"><span>Parlons de</span></span>
      <span class="ligne"><span class="serif">votre projet</span></span>
    </h1>

    <div class="corps grid">
      <div class="ecrire">
        <span class="label muted">Écrivez-nous</span>
        <a :href="mailto" class="adresse">
          <span class="adresse-texte link">{{ email }}</span>
          <span class="fleche" aria-hidden="true">↗</span>
        </a>
        <div class="actions">
          <button type="button" class="bouton" @click="copier">
            <span class="copier-masque">
              <Transition name="copie">
                <span :key="String(copie)">{{ copie ? 'Adresse copiée' : "Copier l'adresse" }}</span>
              </Transition>
            </span>
          </button>
          <span class="sr-only" aria-live="polite">{{ copie ? 'Adresse e-mail copiée' : '' }}</span>
        </div>

        <div class="suivre">
          <span class="label muted">Suivez-nous</span>
          <ul class="reseaux">
            <li v-for="r in reseaux" :key="r.nom">
              <a :href="r.url" target="_blank" rel="noopener" class="reseau">
                <span class="link">{{ r.nom }}</span><span class="reseau-fleche" aria-hidden="true">↗</span>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div class="infos">
        <span class="label muted">Pour bien démarrer, dites-nous</span>
        <ol class="pistes">
          <li v-for="(p, i) in pistes" :key="p">
            <span class="num label">{{ String(i + 1).padStart(2, '0') }}</span>{{ p }}
          </li>
        </ol>
      </div>
    </div>

    <!-- Bas de page de la page contact (le footer est retiré, voir definePageMeta) -->
    <div class="bas grid label">
      <span>© {{ annee }} Sepia</span>
      <nav class="bas-liens" aria-label="Informations légales">
        <BoutonLeger />
        <NuxtLink to="/mentions-legales" class="link">Mentions légales</NuxtLink>
      </nav>
    </div>
  </section>
</template>

<style scoped>
/* Tout tient sur un écran : titre, adresse, puis la ligne du bas collée en bas */
.contact {
  min-height: calc(100svh - var(--header-h));
  display: flex;
  flex-direction: column;
  padding-top: 12vh;
}
.titre {
  margin: 0 0 16vh;
  padding-inline: var(--gutter);
  font-size: clamp(52px, 7.5vw, 140px);
  font-weight: 500;
  line-height: 0.92;
  letter-spacing: -0.055em;
}
/* Chaque ligne monte derrière un masque */
.ligne {
  display: block;
  overflow: hidden;
  /* Évite de rogner l'italique et les jambages */
  padding: 0 0.06em 0.08em;
  margin: 0 -0.06em -0.08em;
}
.ligne > span {
  display: inline-block;
}
.titre .serif {
  font-weight: 400;
  letter-spacing: -0.03em;
}

.corps {
  flex: 1;
  align-content: start;
  row-gap: 10vh;
}
.ecrire {
  grid-column: 1 / span 6;
  display: grid;
  justify-items: start;
  gap: 1.4em;
}
.muted {
  color: var(--muted);
}

/* L'adresse en grand : au survol, le trait commun à tous les liens (.link) */
.adresse {
  display: inline-flex;
  align-items: baseline;
  gap: 0.25em;
  font-size: clamp(26px, 3.4vw, 60px);
  font-weight: 500;
  letter-spacing: -0.04em;
  line-height: 1.05;
  /* Une longue adresse passe à la ligne plutôt que de déborder sur mobile */
  overflow-wrap: anywhere;
}
.fleche {
  font-size: 0.6em;
  color: var(--accent);
}
.adresse:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 6px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6em;
  margin-top: 0.4em;
}
/* Bouton pilule discret (contour), dans la famille de « Voir le site » sur la page projet */
.bouton {
  display: inline-flex;
  align-items: center;
  padding: 0.7em 1.2em;
  border: 1px solid var(--line);
  border-radius: 99px;
  background: transparent;
  color: var(--fg);
  font: inherit;
  font-size: var(--text-xs);
  cursor: pointer;
  transition: border-color 0.3s var(--ease);
}
.bouton:hover {
  border-color: var(--fg);
}
.bouton:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 3px;
}
/* « Copier » ↔ « Copiée » : l'ancien texte remonte, le nouveau arrive d'en dessous */
.copier-masque {
  display: grid;
  overflow: hidden;
}
.copier-masque > span {
  grid-area: 1 / 1;
  white-space: nowrap;
}
.copie-enter-active,
.copie-leave-active {
  transition: transform 0.45s var(--ease);
}
.copie-enter-from {
  transform: translateY(110%);
}
.copie-leave-to {
  transform: translateY(-110%);
}

/* Réseaux, sous l'adresse : liens moyens, alignés */
.suivre {
  display: grid;
  gap: 0.9em;
  margin-top: 8vh;
}
.reseaux {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4em 2em;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-md);
  letter-spacing: -0.02em;
}
.reseau {
  display: inline-flex;
  align-items: baseline;
  gap: 0.2em;
}
.reseau-fleche {
  font-size: 0.65em;
  color: var(--accent);
}
.reseau:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 4px;
}
.infos {
  grid-column: 9 / -1;
  display: grid;
  align-content: start;
  gap: 1.4em;
  padding-top: 0.2em;
}
.pistes {
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--text-sm);
  letter-spacing: -0.01em;
}
.pistes li {
  display: flex;
  align-items: baseline;
  gap: 1em;
  padding-block: 0.8em;
  border-bottom: 1px solid var(--line);
}
.pistes .num {
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}

.bas {
  margin-top: 14vh;
  padding-block: var(--gutter);
  align-items: baseline;
  color: var(--muted);
}
.bas > :first-child {
  grid-column: 1 / span 3;
}
.bas-liens {
  grid-column: 8 / -1;
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 1.5em;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@media (max-width: 760px) {
  .ecrire,
  .infos {
    grid-column: 1 / -1;
  }
  .bas > :first-child {
    grid-column: 1 / span 2;
  }
  .bas-liens {
    grid-column: 3 / -1;
  }
}
</style>
