/**
 * Projets déjà vus pendant la visite (sessionStorage) : la fin de page projet propose le
 * suivant pas encore vu, puis « Vous avez tout vu » une fois le tour fait.
 * Le stockage peut être indisponible (navigation privée…) : on fait alors comme si rien n'était vu.
 */
const CLE = 'sepia-vus'

export function lireVus(): string[] {
  try {
    const v = JSON.parse(sessionStorage.getItem(CLE) ?? '[]')
    return Array.isArray(v) ? v.filter((s) => typeof s === 'string') : []
  } catch {
    return []
  }
}

export function marquerVu(slug: string): string[] {
  const vus = [...new Set([...lireVus(), slug])]
  try {
    sessionStorage.setItem(CLE, JSON.stringify(vus))
  } catch {}
  return vus
}

/** Le tour est fait : on repart de zéro pour la prochaine fois */
export function oublierVus() {
  try {
    sessionStorage.removeItem(CLE)
  } catch {}
}
