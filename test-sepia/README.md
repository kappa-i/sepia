# Sepia — site de l'agence

Site Nuxt 4 (Vue 3 + GSAP).

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de production
npm run preview    # prévisualiser le build
```

## Ajouter un projet

Toutes les pages projet utilisent le même gabarit (`app/pages/projets/[slug].vue`). Un projet n'est qu'une **fiche JSON** et un **dossier d'images**.

1. **Copier** `app/projets/_modele.json` en `app/projets/<slug>.json`. Le nom du fichier donne l'adresse : `atelier-brun.json` → `/projets/atelier-brun`. Les fichiers qui commencent par `_` sont ignorés.
2. **Déposer les médias** dans `public/medias/<slug>/` : au minimum `hero.jpg`, et si besoin `hero.mp4` et les visuels.
3. **Remplir la fiche.** Les médias s'écrivent avec leur seul nom (`"image": "hero.jpg"`). Le projet apparaît tout seul sur l'écran de l'accueil, dans le menu et dans l'enchaînement « projet suivant », à la place donnée par `ordre`.

Dans VS Code, la fiche est reliée à `app/projets/_schema.json` (ligne `"$schema"`). On a l'autocomplétion, la description de chaque champ au survol, et un soulignement rouge si un champ obligatoire manque ou si une couleur est mal écrite. Une fiche incomplète bloque aussi le lancement du site avec un message qui nomme le fichier et les champs manquants.

Exemple minimal :

```json
{
  "$schema": "./_schema.json",
  "ordre": 5,
  "titre": "Nom du projet",
  "tags": ["Site vitrine"],
  "annee": "2026",
  "description": "Ce qu’est le projet en deux ou trois phrases.",
  "teinte": "#8a6a4a",
  "image": "hero.jpg"
}
```

### Ce que contient une page projet

| Section | Champs | Obligatoire |
|---|---|---|
| Hero : image en plein écran qui se pose en feuille | `titre`, `tags`, `annee`, `image`, `teinte` | oui |
| Vidéo à la place de l'image, ouvrable en plein écran | `video` | non |
| Intro : titre et description | `description` | oui |
| Bouton « Voir le site » | `lien` | non |
| Couloir de visuels en profondeur (défilement par étapes, points, titres) | `visuels` | non |
| Planche d'identité : logo, palette en mire, typographies | `identite` | non |
| Fin : la feuille remonte sur le projet suivant | automatique | — |

Une section non renseignée disparaît simplement de la page.

### Médias

- **Hero** : paysage, environ 1920 px de large, JPG ou WebP. Vidéo : MP4 muet, en boucle, courte.
- **Visuels** : environ 1600 px de large. Ils sont tous recadrés en paysage 16:10.
- **`teinte`** : une couleur proche de la dominante de l'image, affichée le temps qu'elle charge.

## Où est quoi

| Fichier | Rôle |
|---|---|
| `app/projets/*.json` | Une fiche par projet ; `_modele.json` sert de modèle, `_schema.json` décrit les champs |
| `app/utils/projets.ts` | Chargement et vérification des fiches, types des projets |
| `app/pages/projets/[slug].vue` | Gabarit de page projet : feuille, hero, intro |
| `app/components/ProjetLecteur.vue` | Lecteur vidéo plein écran |
| `app/components/ProjetVisuels.vue` | Couloir de visuels en profondeur |
| `app/components/ProjetIdentite.vue` | Planche d'identité |
| `app/components/ProjetSuite.vue` | Fin de page vers le projet suivant |
| `app/components/ProjectScreen.vue` | Écran cathodique de l'accueil |
