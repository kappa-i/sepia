import type { gsap as Gsap } from 'gsap'

/**
 * Extinction d'une télé cathodique (fermeture du menu, écran « Votre projet » de l'accueil) :
 * l'image s'écrase en une ligne blanche sur fond noir, la ligne devient une étoile découpée
 * dans un voile noir, l'étoile se referme en un point, puis le noir s'efface.
 *
 * `root` : calque plein écran au fond noir ; `ecran` : l'image qui s'éteint ;
 * `trou` / `etoile` : le voile noir et son étoile (voir TeleTrou).
 * Renvoie la timeline (durée ~1,07 s) pour que l'appelant y ajoute ce qu'il veut.
 */
export function eteindreTele(
  gsap: typeof Gsap,
  el: { root: HTMLElement; ecran: HTMLElement; trou: Element; etoile: SVGPathElement },
  onComplete?: () => void,
) {
  const W = window.innerWidth
  const H = window.innerHeight
  // Au départ, l'étoile a exactement la taille de la ligne de l'écran écrasé
  const forme = { sx: (W - 12) / 2, sy: 2, k: 1 }
  const maj = () =>
    el.etoile.setAttribute('transform', `translate(${W / 2} ${H / 2}) scale(${forme.sx * forme.k} ${forme.sy * forme.k})`)
  maj()
  gsap.killTweensOf([el.root, el.ecran, el.trou])
  return (
    gsap
      .timeline({
        onComplete: () => {
          gsap.set(el.trou, { opacity: 0 })
          onComplete?.()
        },
      })
      // L'image s'écrase en une ligne blanche sur le fond noir…
      .to(el.ecran, { scaleY: 0.004, filter: 'brightness(5)', duration: 0.25, ease: 'power3.in' }, 0)
      // …la ligne devient une étoile découpée dans le noir, à travers laquelle on voit encore l'écran
      .set(el.ecran, { scaleY: 1, filter: 'brightness(2)' }, 0.25)
      .set(el.trou, { opacity: 1 }, 0.25)
      // Elle se resserre et ses pointes verticales poussent : une étoile allongée…
      .to(forme, { sx: W * 0.12, duration: 0.3, ease: 'power3.inOut', onUpdate: maj }, 0.25)
      .to(forme, { sy: H * 0.06, duration: 0.2, ease: 'power2.out', onUpdate: maj }, 0.28)
      // …qui se referme en un point : c'est la dernière chose qui s'éteint
      .to(forme, { k: 0, duration: 0.28, ease: 'power3.in', onUpdate: maj }, 0.5)
      // Puis le noir s'efface et la page réapparaît
      .to(el.root, { opacity: 0, duration: 0.25, ease: 'power2.out' }, 0.82)
  )
}
