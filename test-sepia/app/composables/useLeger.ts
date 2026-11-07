/**
 * Mode léger : photos à la place des vidéos, animations coupées, écran de l'accueil
 * redessiné seulement quand il change. Moins de données à télécharger, moins de calcul
 * (carte graphique, batterie) pour le visiteur.
 *
 * Le choix est gardé un an dans un cookie, lu dès le rendu serveur : la page arrive
 * directement dans le bon mode. Sans choix, on suit le réglage système « réduire les animations ».
 */
const REDUIT = '(prefers-reduced-motion: reduce)'

export function useLeger() {
  const cookie = useCookie<boolean | undefined>('sepia-leger', { maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  // Choix du visiteur (null : pas encore choisi)
  const choix = useState<boolean | null>('legerChoix', () => (typeof cookie.value === 'boolean' ? cookie.value : null))
  // Réglage système, lu au montage (inconnu côté serveur)
  const systeme = useState('legerSysteme', () => false)
  // Augmente à chaque changement de mode : le layout remonte la page, qui repart dans le nouveau mode
  const version = useState('legerVersion', () => 0)

  const leger = computed({
    get: () => choix.value ?? systeme.value,
    set: (v: boolean) => {
      choix.value = v
      cookie.value = v
      version.value++
    },
  })

  /** Animations à couper : mode léger, ou réglage système (toujours respecté) */
  const reduit = () => leger.value || (import.meta.client && matchMedia(REDUIT).matches)

  /**
   * Au montage du layout : lit le réglage système et, sur un site généré en statique (pas de
   * cookie au rendu), le choix enregistré. Si le mode a changé, la page est remontée.
   */
  function synchroniser() {
    const avant = leger.value
    if (choix.value === null && typeof cookie.value === 'boolean') choix.value = cookie.value
    const mq = matchMedia(REDUIT)
    systeme.value = mq.matches
    mq.addEventListener('change', (e) => {
      const a = leger.value
      systeme.value = e.matches
      if (leger.value !== a) version.value++
    })
    // Avec le réglage système, la page s'est déjà montée sans animations (voir reduit) :
    // les vidéos passent en photos d'elles-mêmes, pas besoin de la remonter
    if (leger.value !== avant && !mq.matches) version.value++
  }

  return { leger, reduit, version, synchroniser }
}
