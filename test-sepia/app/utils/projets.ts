/**
 * Projets du portfolio.
 *
 * Chaque projet est une fiche JSON : app/projets/<slug>.json (copier _modele.json ;
 * le schéma _schema.json donne l'autocomplétion et signale les erreurs dans l'éditeur).
 * Le nom du fichier donne l'adresse (/projets/<slug>). Les images et vidéos vont dans
 * public/medias/<slug>/ et s'écrivent dans la fiche avec leur seul nom (« hero.jpg »).
 * Les projets sont chargés automatiquement, vérifiés, et triés par `ordre`.
 *
 * Une seule page sert de gabarit à tous les projets (pages/projets/[slug].vue) :
 *   hero (image ou vidéo) → intro → visuels en profondeur → identité → projet suivant.
 * Les sections facultatives n'apparaissent que si le projet les renseigne.
 */

export interface Projet {
  /** Identifiant dans l'adresse : /projets/<slug> — c'est le nom du fichier JSON */
  slug: string
  /** Position dans la liste (accueil, menu, enchaînement « projet suivant ») : plus petit = avant */
  ordre: number
  titre: string
  /** Savoir-faire, affichés sous le titre du hero et dans la fin de page */
  tags: string[]
  annee: string
  /** Ce qu'est le projet, en deux ou trois phrases (intro de la page) */
  description: string
  /** Couleur de fond tant que l'image n'est pas chargée (proche de la teinte dominante du visuel) */
  teinte: string
  /** Visuel principal (paysage, ~1920 px) : écran de l'accueil, hero, menu, fin de page */
  image: string
  /** Vidéo muette en boucle à la place de l'image (l'image sert alors d'affiche) ; ouvrable en plein écran */
  video?: string
  /** Adresse du site réalisé : bouton « Voir le site » de l'intro */
  lien?: string
  /** Visuels du couloir « en profondeur » (tous recadrés en paysage 16:10) */
  visuels?: Visuel[]
  /** Planche d'identité : logo, palette, typographies */
  identite?: Identite
}

export interface Visuel {
  /** Image (ou affiche de la vidéo), ~1600 px de large */
  src: string
  /** Description pour les lecteurs d'écran ('' si purement décorative) */
  alt: string
  /** Vidéo muette en boucle à la place de l'image */
  video?: string
  /** Petit titre affiché sous les points quand le visuel est devant nous */
  titre?: string
}

/** Identité visuelle du projet, présentée en planche (voir ProjetIdentite) */
export interface Identite {
  /** Phrase courte à côté du titre « Identité » */
  texte?: string
  /** Case du logo : monogramme en grand, nom en dessous, sur la couleur `fond` */
  logo: { monogramme: string; nom: string; fond: string; encre: string }
  /** Palette : une barre de la mire par couleur (4 conseillées) */
  couleurs: { nom: string; hex: string }[]
  /** Typographies (2 conseillées) : famille CSS, usage, couleurs de la case */
  typos: { nom: string; famille: string; usage: string; serif?: boolean; fond: string; encre: string }[]
}

// ——— Chargement des fiches ———

// Toutes les fiches de app/projets/ (sauf celles qui commencent par « _ » : modèle, schéma)
const fiches = import.meta.glob<Record<string, unknown>>(['~/projets/*.json', '!~/projets/_*.json'], {
  eager: true,
  import: 'default',
})

/** « hero.jpg » → « /medias/<slug>/hero.jpg » ; un chemin absolu ou une adresse est gardé tel quel */
function media(slug: string, chemin: string): string
function media(slug: string, chemin: string | undefined): string | undefined
function media(slug: string, chemin?: string) {
  if (!chemin) return chemin
  return /^(\/|https?:|#)/.test(chemin) ? chemin : `/medias/${slug}/${chemin}`
}

/** Vérifie les champs obligatoires ; une fiche incomplète donne une erreur claire au lancement */
function verifier(slug: string, f: Record<string, unknown>) {
  const manquants = ['titre', 'annee', 'description', 'teinte', 'image'].filter(
    (c) => typeof f[c] !== 'string' || !(f[c] as string).trim(),
  )
  if (!Array.isArray(f.tags) || !f.tags.length) manquants.push('tags')
  if (manquants.length)
    throw new Error(`Projet « ${slug} » (app/projets/${slug}.json) : champ(s) manquant(s) ou vide(s) : ${manquants.join(', ')}`)
}

function charger(fichier: string, f: Record<string, unknown>): Projet {
  const slug = fichier.split('/').pop()!.replace(/\.json$/, '')
  verifier(slug, f)
  const p = f as unknown as Omit<Projet, 'slug' | 'ordre'> & { ordre?: number }
  return {
    ...p,
    slug,
    ordre: p.ordre ?? Number.MAX_SAFE_INTEGER,
    image: media(slug, p.image),
    video: media(slug, p.video),
    visuels: p.visuels?.map((v) => ({ ...v, alt: v.alt ?? '', src: media(slug, v.src), video: media(slug, v.video) })),
  }
}

export const projets: Projet[] = Object.entries(fiches)
  .map(([fichier, f]) => charger(fichier, f))
  .sort((a, b) => a.ordre - b.ordre || a.slug.localeCompare(b.slug))
