<script setup lang="ts">
/**
 * Mentions légales et protection des données (droit suisse : nLPD, en vigueur depuis le
 * 1er septembre 2023). Les informations de l'éditeur et de l'hébergeur viennent de
 * utils/site.ts. À faire relire par un juriste avant la mise en ligne.
 */
useSeoMeta({
  title: 'Mentions légales — Sepia',
  description: 'Éditeur du site, hébergement, propriété intellectuelle et protection des données.',
})

const majTexte = new Date(`${mentionsMaj}T12:00:00`).toLocaleDateString('fr-CH', { day: 'numeric', month: 'long', year: 'numeric' })
// Un champ encore à compléter (« [ … ] ») est mis en évidence
const aCompleter = (v: string) => v.startsWith('[')

const sections = [
  { id: 'editeur', titre: 'Éditeur du site' },
  { id: 'hebergement', titre: 'Hébergement' },
  { id: 'propriete', titre: 'Propriété intellectuelle' },
  { id: 'donnees', titre: 'Protection des données' },
  { id: 'liens', titre: 'Liens externes' },
  { id: 'responsabilite', titre: 'Responsabilité' },
  { id: 'droit', titre: 'Droit applicable' },
  { id: 'credits', titre: 'Crédits' },
]
const num = (id: string) => String(sections.findIndex((s) => s.id === id) + 1).padStart(2, '0')
</script>

<template>
  <section class="mentions">
    <TitrePage>Mentions légales</TitrePage>

    <div class="corps grid">
      <!-- Sommaire, collé en haut pendant la lecture -->
      <nav class="sommaire" aria-label="Sommaire">
        <span class="label muted">Mise à jour le {{ majTexte }}</span>
        <ol>
          <li v-for="s in sections" :key="s.id">
            <a :href="`#${s.id}`" class="link">{{ s.titre }}</a>
          </li>
        </ol>
      </nav>

      <div class="texte">
        <section id="editeur" class="bloc">
          <h2><span class="num label">{{ num('editeur') }}</span>Éditeur du site</h2>
          <dl class="fiche">
            <dt>Nom</dt>
            <dd>{{ editeur.nom }}</dd>
            <dt>Forme juridique</dt>
            <dd :class="{ manque: aCompleter(editeur.forme) }">{{ editeur.forme }}</dd>
            <dt>Adresse</dt>
            <dd>
              <span :class="{ manque: aCompleter(editeur.adresse) }">{{ editeur.adresse }}</span>
              <template v-if="ville">, {{ ville }}</template>, Suisse
            </dd>
            <dt>Numéro IDE</dt>
            <dd :class="{ manque: aCompleter(editeur.ide) }">{{ editeur.ide }}</dd>
            <dt>Responsable de la publication</dt>
            <dd :class="{ manque: aCompleter(editeur.responsable) }">{{ editeur.responsable }}</dd>
            <dt>Contact</dt>
            <dd><a :href="`mailto:${email}`" class="link">{{ email }}</a></dd>
          </dl>
        </section>

        <section id="hebergement" class="bloc">
          <h2><span class="num label">{{ num('hebergement') }}</span>Hébergement</h2>
          <p>
            Le site est hébergé par
            <span :class="{ manque: aCompleter(hebergeur.nom) }">{{ hebergeur.nom }}</span>,
            <span :class="{ manque: aCompleter(hebergeur.adresse) }">{{ hebergeur.adresse }}</span><template v-if="hebergeur.site">
              (<a :href="hebergeur.site" target="_blank" rel="noopener" class="link">{{ hebergeur.site.replace(/^https?:\/\//, '') }}</a>)</template>.
          </p>
        </section>

        <section id="propriete" class="bloc">
          <h2><span class="num label">{{ num('propriete') }}</span>Propriété intellectuelle</h2>
          <p>
            L’ensemble du site — textes, visuels, vidéos, logo, mise en page et code — est protégé par
            le droit d’auteur suisse (LDA). Sauf mention contraire, il appartient à {{ editeur.nom }}.
          </p>
          <p>
            Les projets présentés le sont avec l’accord de nos clients ; leurs noms, logos et marques
            restent leur propriété. Toute reproduction, totale ou partielle, sans autorisation écrite
            préalable est interdite.
          </p>
        </section>

        <section id="donnees" class="bloc">
          <h2><span class="num label">{{ num('donnees') }}</span>Protection des données</h2>
          <p>
            Nous traitons vos données personnelles conformément à la loi fédérale sur la protection des
            données (nLPD) et, lorsqu’il s’applique, au règlement européen (RGPD). Le responsable du
            traitement est {{ editeur.nom }}, joignable à
            <a :href="`mailto:${email}`" class="link">{{ email }}</a>.
          </p>
          <h3>Ce que nous recueillons</h3>
          <p>
            Le site n’a ni formulaire ni compte. Nous ne recevons vos données que si vous nous écrivez
            par e-mail : votre adresse, votre nom et ce que vous nous dites de votre projet. Elles
            servent uniquement à vous répondre et à suivre votre demande. Elles sont conservées le temps
            de notre échange, puis, si nous travaillons ensemble, le temps exigé par la loi (pièces
            comptables notamment). Elles ne sont ni vendues ni transmises à des tiers, sauf obligation
            légale.
          </p>
          <!-- TODO : à préciser une fois l'outil de mesure d'audience et le bandeau de
               consentement en place (nom de l'outil, cookies posés, durée réelle) -->
          <h3>Cookies et mesure d’audience</h3>
          <p>
            Le site utilise des cookies, de petits fichiers déposés dans votre navigateur, principalement
            pour la mesure d’audience : savoir combien de personnes le visitent, quelles pages sont
            consultées, depuis quel type d’appareil et par quel chemin elles sont arrivées. Ces
            statistiques nous aident à comprendre ce qui intéresse nos visiteurs et à améliorer le site.
            D’autres outils tiers (contenus intégrés, réseaux sociaux, suivi de nos campagnes) peuvent
            aussi en déposer.
          </p>
          <p>
            Ces cookies ne sont déposés qu’avec votre accord, donné lors de votre première visite. Vous
            pouvez changer d’avis à tout moment, et refuser ou supprimer les cookies depuis les réglages
            de votre navigateur ; le site reste alors entièrement utilisable. Ils sont conservés au plus
            13 mois. Les données recueillies servent uniquement à établir des statistiques et ne sont
            pas revendues.
          </p>
          <p>
            Indépendamment des cookies, le site garde dans votre navigateur deux préférences d’affichage
            (l’animation d’arrivée déjà vue, la vue « grille » ou « liste » des projets). Elles ne
            quittent jamais votre appareil.
          </p>
          <h3>Services tiers</h3>
          <p>
            Les polices de caractères sont chargées depuis Google Fonts (Google, États-Unis) et Fontshare
            (Indian Type Foundry, Inde). Pour les afficher, votre navigateur leur transmet votre adresse
            IP. L’hébergeur enregistre aussi, comme tout serveur, des journaux techniques (adresse IP,
            date, page demandée) utilisés pour la sécurité et le bon fonctionnement du site.
          </p>
          <h3>Vos droits</h3>
          <p>
            Vous pouvez à tout moment demander à consulter, corriger ou effacer les données que nous
            détenons sur vous, ou vous opposer à leur traitement, en écrivant à
            <a :href="`mailto:${email}`" class="link">{{ email }}</a>. Si vous estimez que vos droits ne
            sont pas respectés, vous pouvez vous adresser au Préposé fédéral à la protection des données
            et à la transparence (PFPDT).
          </p>
        </section>

        <section id="liens" class="bloc">
          <h2><span class="num label">{{ num('liens') }}</span>Liens externes</h2>
          <p>
            Le site renvoie vers d’autres sites (réseaux sociaux, sites réalisés pour nos clients). Nous
            ne sommes pas responsables de leur contenu ni de la manière dont ils traitent vos données :
            leurs propres conditions s’appliquent.
          </p>
        </section>

        <section id="responsabilite" class="bloc">
          <h2><span class="num label">{{ num('responsabilite') }}</span>Responsabilité</h2>
          <p>
            Nous apportons le plus grand soin aux informations publiées, sans pouvoir garantir qu’elles
            soient complètes, exactes et à jour en permanence. Nous pouvons modifier le site et ces
            mentions à tout moment ; la version en ligne fait foi.
          </p>
        </section>

        <section id="droit" class="bloc">
          <h2><span class="num label">{{ num('droit') }}</span>Droit applicable</h2>
          <p>
            Le site et ces mentions sont soumis au droit suisse. Le for juridique est à
            {{ ville || 'Lausanne' }}, sous réserve des dispositions légales impératives.
          </p>
        </section>

        <section id="credits" class="bloc">
          <h2><span class="num label">{{ num('credits') }}</span>Crédits</h2>
          <dl class="fiche">
            <dt>Conception et réalisation</dt>
            <dd>{{ editeur.nom }}</dd>
            <dt>Typographies</dt>
            <dd>Chillax (Indian Type Foundry), Instrument Serif (Instrument)</dd>
          </dl>
        </section>
      </div>
    </div>
  </section>
</template>

<style scoped>
.mentions {
  padding-bottom: 4vh;
}
.corps {
  margin-top: 12vh;
  align-items: start;
}
.muted {
  color: var(--muted);
}

/* Sommaire à gauche, qui reste en vue pendant la lecture */
.sommaire {
  grid-column: 1 / span 3;
  position: sticky;
  top: calc(var(--header-h) + 4vh);
  display: grid;
  gap: 1.4em;
  font-size: var(--text-sm);
}
.sommaire ol {
  display: grid;
  gap: 0.55em;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sommaire a {
  color: var(--muted);
  transition: color 0.3s var(--ease);
}
.sommaire a:hover {
  color: var(--fg);
}

/* Texte : colonne de lecture confortable */
.texte {
  grid-column: 5 / span 7;
  display: grid;
  gap: 9vh;
  font-size: var(--text-sm);
  line-height: 1.6;
  letter-spacing: -0.005em;
}
.bloc {
  /* Lien du sommaire : le titre ne passe pas sous le header */
  scroll-margin-top: calc(var(--header-h) + 4vh);
  padding-top: 2.4em;
  border-top: 1px solid var(--line);
}
h2 {
  display: flex;
  align-items: baseline;
  gap: 1em;
  margin: 0 0 1em;
  font-size: var(--text-md);
  font-weight: 500;
  letter-spacing: -0.03em;
  line-height: 1.1;
}
.num {
  color: var(--accent);
  font-variant-numeric: tabular-nums;
}
h3 {
  margin: 1.8em 0 0.4em;
  font-size: var(--text-sm);
  font-weight: 500;
}
p {
  margin: 0 0 0.9em;
  max-width: 62ch;
}
p:last-child {
  margin-bottom: 0;
}

/* Fiche : intitulé à gauche, valeur à droite */
.fiche {
  display: grid;
  grid-template-columns: minmax(10em, 1fr) 2fr;
  margin: 0;
}
.fiche dt,
.fiche dd {
  margin: 0;
  padding-block: 0.7em;
  border-bottom: 1px solid var(--line);
}
.fiche dt {
  color: var(--muted);
}

/* Champ encore à compléter (voir utils/site.ts) : bien visible */
.manque {
  color: var(--accent);
  font-style: italic;
}

@media (max-width: 760px) {
  .corps {
    margin-top: 8vh;
    row-gap: 8vh;
  }
  .sommaire {
    grid-column: 1 / -1;
    position: static;
  }
  .texte {
    grid-column: 1 / -1;
    gap: 7vh;
  }
  .fiche {
    grid-template-columns: 1fr;
  }
  .fiche dt {
    padding-bottom: 0;
    border-bottom: 0;
  }
}
</style>
