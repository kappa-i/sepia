// Infos du studio partagées entre le menu et le footer

export const email = 'hello@sepia.net'

// Ce que fait le studio, affiché en permanence sous le logo
export const accroche = 'Agence de design & web'

// TODO : indiquer la ville du studio (ex. 'Lyon') ; rien n'est affiché tant que c'est vide
export const ville = 'Lausanne'

// TODO : remplacer les « # » par les vraies URL des comptes
export const reseaux = [
  { nom: 'Instagram', url: '#' },
  { nom: 'LinkedIn', url: '#' },
  { nom: 'Behance', url: '#' },
]

// Mentions légales (page /mentions-legales).
// TODO : compléter avec les vraies informations ; tant qu'un champ commence par « [ »,
// il s'affiche tel quel sur la page, en évidence, pour ne pas être oublié
export const editeur = {
  nom: 'Sepia',
  forme: '[Forme juridique : raison individuelle, Sàrl…]',
  adresse: '[Rue et numéro, NPA]',
  ide: '[CHE-000.000.000]',
  responsable: '[Prénom Nom]',
}
export const hebergeur = {
  nom: '[Nom de l’hébergeur]',
  adresse: '[Adresse de l’hébergeur]',
  site: '',
}
// Date de la dernière mise à jour de la page, au format AAAA-MM-JJ
export const mentionsMaj = '2026-11-06'
