<script setup lang="ts">
/**
 * Extinction de télé qui survit au changement de page : posée dans le layout, elle prend
 * le relais d'un écran neige plein écran (ex. « Votre projet » sur l'accueil), ouvre la page
 * visée dessous, puis s'éteint comme le menu (ligne, étoile, point) pour la découvrir.
 *
 * Déclenchée par useState('extinctionVers') = adresse de la page à ouvrir.
 */
const vers = useState<string | null>('extinctionVers', () => null)
const { $gsap } = useNuxtApp()

const root = ref<HTMLElement>()
const ecran = ref<HTMLElement>()
const neige = ref<HTMLCanvasElement>()
const voile = ref<{ el?: SVGSVGElement; etoile?: SVGPathElement }>()
const visible = ref(false)

// Neige plein écran, à la même finesse que celle de l'accueil (grain de ~2 px)
let raf = 0
function dessinerNeige(ctx: CanvasRenderingContext2D, img: ImageData) {
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const v = (Math.random() * 230) | 0
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = 255
  }
  ctx.putImageData(img, 0, 0)
  raf = requestAnimationFrame(() => dessinerNeige(ctx, img))
}

watch(vers, async (dest) => {
  if (!dest) return
  visible.value = true
  $gsap.set(root.value!, { opacity: 1 })
  await nextTick()
  const c = neige.value!
  c.width = Math.ceil(innerWidth / 2)
  c.height = Math.ceil(innerHeight / 2)
  const ctx = c.getContext('2d')!
  const img = ctx.createImageData(c.width, c.height)
  cancelAnimationFrame(raf)
  dessinerNeige(ctx, img)
  // La page visée s'ouvre sous le calque, qui la cache encore
  await navigateTo(dest)
  const trou = voile.value?.el
  const etoile = voile.value?.etoile
  const fin = () => {
    visible.value = false
    vers.value = null
    cancelAnimationFrame(raf)
    $gsap.set(ecran.value!, { clearProps: 'transform,filter' })
  }
  if (!trou || !etoile) return fin()
  eteindreTele($gsap, { root: root.value!, ecran: ecran.value!, trou, etoile }, fin)
})

onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<template>
  <div v-show="visible" ref="root" class="extinction" aria-hidden="true">
    <div ref="ecran" class="ecran">
      <canvas ref="neige" class="neige" />
      <div class="tube" />
    </div>
    <TeleTrou ref="voile" />
  </div>
</template>

<style scoped>
/* Au-dessus de tout (menu compris) : c'est la dernière chose qu'on voit avant la page */
.extinction {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: var(--nuit);
  pointer-events: none;
}
.ecran {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #0d0d0c;
  transform-origin: 50% 50%;
}
.neige {
  width: 100%;
  height: 100%;
  display: block;
}
/* Lignes de balayage et vignette, comme l'écran de l'accueil */
.tube {
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(to bottom, rgba(0, 0, 0, 0.28) 0 1px, transparent 1px 3px),
    radial-gradient(120% 90% at 50% 45%, transparent 45%, rgba(0, 0, 0, 0.6) 100%);
}
</style>
