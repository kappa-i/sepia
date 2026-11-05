export interface Projet {
  slug: string
  titre: string
  tags: string[]
  annee: string
  client: string
  description: string
  /** Couleur de repli tant qu'il n'y a pas d'image */
  teinte: string
  /** Chemin d'une image dans /public, ex. '/projets/maison-ocre.jpg' (paysage, ~1920px) */
  image?: string
  /** Vidéo en boucle (muette) à la place de l'image, ex. '/projets/atelier-brun.mp4'. L'image sert d'affiche. */
  video?: string
}

// Projets factices avec photos aléatoires (picsum.photos) : à remplacer par les vrais
export const projets: Projet[] = [
  {
    slug: 'maison-ocre',
    titre: 'Maison Ocre',
    tags: ['Identité', 'Site vitrine'],
    annee: '2026',
    client: 'Maison Ocre, décoration',
    description:
      'Une identité chaleureuse et un site vitrine qui met en scène les pièces de la maison, pensé pour donner envie de pousser la porte de la boutique.',
    teinte: '#c8955a',
    image: '/projets/maison-ocre.jpg',
  },
  {
    slug: 'atelier-brun',
    titre: 'Atelier Brun',
    tags: ['E-commerce'],
    annee: '2026',
    client: 'Atelier Brun, maroquinerie',
    description:
      'Une boutique en ligne sur mesure pour un atelier artisanal : fiches produit soignées, paiement simple et gestion des stocks au quotidien.',
    teinte: '#4a3a2c',
    image: '/projets/atelier-brun.jpg',
    // Vidéo d'essai : extrait de « Big Buck Bunny » (© Blender Foundation, CC BY 3.0), à remplacer
    video: '/projets/atelier-brun.mp4',
  },
  {
    slug: 'cafe-noisette',
    titre: 'Café Noisette',
    tags: ['Identité', 'Site vitrine'],
    annee: '2025',
    client: 'Café Noisette, torréfacteur',
    description:
      'Logo, palette et site vitrine pour un torréfacteur de quartier, avec la carte, les horaires et la réservation en deux clics.',
    teinte: '#a67b5b',
    image: '/projets/cafe-noisette.jpg',
  },
  {
    slug: 'studio-lin',
    titre: 'Studio Lin',
    tags: ['Site vitrine'],
    annee: '2025',
    client: 'Studio Lin, architecture',
    description:
      'Un site épuré pour un studio d’architecture, où les projets respirent : grandes images, typographie discrète et navigation sans friction.',
    teinte: '#d8cbb3',
    image: '/projets/studio-lin.jpg',
  },
]
