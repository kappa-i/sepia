# Sepia — Objectifs du site de l'agence web

> Document de cadrage à compléter avant tout développement.
> Les éléments marqués `[ ]` ou `À définir` restent à trancher.

---

## 1. L'agence

- **Nom** : Sepia
- **Positionnement** (en une phrase) : À définir
  "pas encore défini"
- **Services proposés** :
  - [x] Création de sites vitrines
  - [x] E-commerce
  - [] Applications web sur mesure
  - [ ] Refonte / maintenance
  - [ ] SEO / référencement
  - [x] Identité visuelle / branding
  - [ ] Autre : …
- **Ce qui nous différencie** : À définir (3 arguments max)

## 2. Objectifs du site

### Objectif principal
- [x] Générer des demandes de devis / prises de contact

### Objectifs secondaires
- [x] Asseoir la crédibilité (portfolio, références, témoignages)
- [x] Présenter clairement les services et la méthode de travail
- [x] Être visible sur Google (requêtes locales et métier)
- [ ] Recruter (freelances, stagiaires, salariés)
- [x] Servir lui-même de vitrine du savoir-faire (performance, design, accessibilité)

### Indicateurs de réussite (KPI)
| Indicateur | Cible | Échéance |
|---|---|---|
| Demandes de contact / mois | À définir | À définir |
| Taux de conversion visiteur → contact | À définir | À définir |
| Score Lighthouse (perf., accessibilité, SEO) | ≥ 95 | Mise en ligne |
| Positionnement sur requêtes clés | Top 10 | À définir |

## 3. Cibles

| Cible | Besoin principal | Ce qu'elle doit trouver sur le site |
|---|---|---|
| Indépendants / freelances | Une présence en ligne professionnelle, rapide à lancer, à petit budget | Des offres claires, des tarifs indicatifs, des exemples concrets, un contact simple |
| PME | Un site qui génère des clients (vitrine ou e-commerce), sans avoir à gérer la technique | Des études de cas avec résultats, la méthode de travail, un interlocuteur dédié, un suivi après la mise en ligne |
| Startups | Lancer vite une image de marque forte et un site qui convertit, capable d'évoluer | Du branding, de la réactivité, des délais courts, un site moderne qui suit la croissance |


- **Zone géographique** : À définir (locale, nationale, internationale)
- **Langues** : [x] Français  [x] Anglais  [ ] Autre

## 4. Arborescence envisagée

- [x] Accueil
- [x] Services (listé sur une page et développé dans une page)
- [x] Réalisations / Portfolio (études de cas)
- [x] À propos / Équipe
- [x] Méthode / Processus
- [x] Blog / Ressources
- [x] Contact / Demande de devis
- [x] Mentions légales, politique de confidentialité (obligatoires)

## 5. Fonctionnalités attendues

- [x] Formulaire de contact / devis
- [x] Prise de rendez-vous en ligne
- [x] Portfolio filtrable
- [x] Blog administrable
- [x] Multilingue
- [x] Animations / interactions avancées
- [x] Gestion des cookies (RGPD)
- [x] Analytics respectueux de la vie privée

## 6. Identité et ton

- **Ambiance visuelle** : À définir (mots-clés : ex. sobre, chaleureux, premium…)
- **Couleurs / typographies** : À définir (le nom « Sepia » suggère des tons chauds, bruns, vintage ?)
- **Ton rédactionnel** : [ ] Tutoiement  [ ] Vouvoiement — registre : À définir
- **Sites de référence / inspiration** : À lister

## 7. Contraintes techniques

- **Stack** :
  - Framework : **Nuxt** (Vue 3), en génération statique (`nuxt generate`) pour la performance et le SEO
  - Styles : **Tailwind CSS** (`@nuxtjs/tailwindcss`)
  - Animations : **GSAP** ou **@vueuse/motion**
  - SEO : `useSeoMeta`, `@nuxtjs/sitemap`, balises Open Graph
  - Formulaire de devis : **Formspree**, ou route serveur Nuxt + **Resend** (anti-spam : Cloudflare Turnstile)
  - Statistiques : **Plausible** ou **Umami** (conformes RGPD)
- **Gestion du contenu** : **Nuxt Content** (blog et études de cas en Markdown), éventuellement **Nuxt Studio** pour l'édition
- **Hébergement** : À définir (Netlify, Vercel ou Cloudflare Pages)
- **Nom de domaine** : À définir
- **Exigences** : responsive, accessibilité (RGAA / WCAG AA), performance, SEO technique

## 8. Contenus à produire

- [x] Textes des pages
- [ ] Études de cas (combien ? lesquelles ?)
- [x] Photos de l'équipe / des locaux
- [x] Logo et charte graphique
- [x] Témoignages clients


## 10. Hors périmètre (pour l'instant)

- À définir (ce qu'on ne fera pas dans la V1)
