<script setup lang="ts">
useSeoMeta({
  title: 'Contact — Sepia',
  description: 'Parlons de votre projet : demandez un devis gratuit.',
})

const form = reactive({ nom: '', email: '', message: '' })
const envoye = ref(false)

function envoyer() {
  // Pas encore branché : on ajoutera Formspree ou une route serveur plus tard.
  envoye.value = true
}
</script>

<template>
  <section class="contact">
    <h1 class="title">Parlons de<br /><em class="serif">votre projet</em></h1>

    <div class="grid body">
      <aside class="aside">
        <span class="label">Contact direct</span>
        <a href="mailto:hello@sepia.fr" class="link">hello@sepia.fr</a>
        <span class="label muted">Réponse sous 48 h · Devis gratuit</span>
        <span v-if="ville" class="label muted">Studio basé à {{ ville }}</span>
      </aside>

      <p v-if="envoye" class="merci">
        Merci {{ form.nom }}, <em class="serif">on revient vers vous rapidement.</em>
      </p>
      <form v-else class="form" @submit.prevent="envoyer">
        <label>
          <span class="label">Nom</span>
          <input v-model="form.nom" required autocomplete="name" />
        </label>
        <label>
          <span class="label">E-mail</span>
          <input v-model="form.email" type="email" required autocomplete="email" />
        </label>
        <label>
          <span class="label">Votre projet</span>
          <textarea v-model="form.message" rows="4" required />
        </label>
        <button type="submit">Envoyer <span aria-hidden="true">→</span></button>
      </form>
    </div>
  </section>
</template>

<style scoped>
.contact {
  padding-top: 10vh;
}
.title {
  margin: 0 0 10vh;
  padding-inline: var(--gutter);
  font-size: var(--text-xl);
  font-weight: 500;
  line-height: 0.92;
  letter-spacing: -0.055em;
}
.aside {
  grid-column: 1 / span 4;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.6em;
  font-size: var(--text-md);
}
.muted {
  color: var(--muted);
}
.form,
.merci {
  grid-column: 6 / -1;
}
.merci {
  margin: 0;
  font-size: var(--text-lg);
  letter-spacing: -0.03em;
}
.form {
  display: grid;
  gap: 2.5rem;
}
label {
  display: grid;
  gap: 0.5rem;
}
input,
textarea {
  width: 100%;
  padding: 0.3em 0;
  font: inherit;
  font-size: var(--text-md);
  color: var(--fg);
  background: transparent;
  border: 0;
  border-bottom: 1px solid var(--line);
  border-radius: 0;
  resize: vertical;
  transition: border-color 0.3s;
}
input:focus,
textarea:focus {
  outline: none;
  border-bottom-color: var(--fg);
}
button {
  justify-self: start;
  padding: 1em 2em;
  font: inherit;
  font-weight: 500;
  background: var(--fg);
  color: var(--bg);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.3s, color 0.3s;
}
button:hover {
  background: var(--accent);
  color: var(--fg);
}

@media (max-width: 760px) {
  .aside,
  .form,
  .merci {
    grid-column: 1 / -1;
  }
  .aside {
    margin-bottom: 3rem;
  }
}
</style>
