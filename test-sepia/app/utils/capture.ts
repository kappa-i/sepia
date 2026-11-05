/**
 * Copie l'image affichée par une vidéo (même origine : lisible) en data URL.
 * Sert au passage d'une page à l'autre : la page projet affiche cette image le temps
 * que sa propre vidéo se cale au même moment (pas d'affiche ni de saut).
 */
export function capturerVideo(v: HTMLVideoElement): string | null {
  try {
    const c = document.createElement('canvas')
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d')!.drawImage(v, 0, 0)
    return c.toDataURL('image/jpeg', 0.85)
  } catch {
    return null
  }
}
