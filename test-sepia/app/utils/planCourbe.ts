/**
 * Plan WebGL qui affiche une image (ou une vidéo) et peut se courber en 3D, comme une
 * feuille souple. Sert à la distorsion de vitesse des visuels du projet : quand on défile
 * vite, l'image se plie (le centre mène, les bords traînent) et se vrille un peu.
 *
 * Le canvas est plus grand que le visuel (marge pour la courbure) ; à plat, le plan couvre
 * exactement la place du visuel, cadré comme l'<img> (« cover ») : le relais est invisible.
 */

const VERT = `
attribute vec2 a;          // coordonnées dans le plan, de 0 à 1
uniform vec2 uTaille;      // taille du visuel, en px
uniform vec2 uCanvas;      // taille du canvas, en px
uniform float uCourbe;     // -1 à 1 : > 0, les bords reculent (on avance) ; < 0, ils avancent
uniform float uTorsion;    // -1 à 1 : vrille autour de l'axe vertical
varying vec2 vUv;
varying float vOmbre;
void main() {
  vUv = a;
  vec2 c = a - 0.5;
  vec2 p = c * uTaille;
  // Feuille qui se plie : surtout dans la hauteur, un peu dans la largeur
  float pli = (c.y * c.y * 4.0) * 0.32 * uTaille.y + (c.x * c.x * 4.0) * 0.12 * uTaille.x;
  float z = -uCourbe * pli;
  // Vrille : un coin avance pendant que l'autre recule
  z += uTorsion * c.x * c.y * 4.0 * 0.18 * uTaille.y;
  // Perspective
  float focale = 1.6 * max(uTaille.x, uTaille.y);
  vec2 s = p * focale / (focale - z);
  gl_Position = vec4(s / (uCanvas * 0.5), 0.0, 1.0);
  // Les parties qui reculent sont un peu plus sombres
  vOmbre = clamp(-z / (0.35 * uTaille.y), -1.0, 1.0);
}`

const FRAG = `
// Même précision que le vertex shader : uTaille est partagé (sinon le programme refuse de se lier)
precision highp float;
varying vec2 vUv;
varying float vOmbre;
uniform sampler2D uTex;
uniform vec2 uTaille;
uniform vec2 uImg;
uniform float uRayon;
void main() {
  // Équivalent de object-fit: cover
  float rp = uTaille.x / uTaille.y, ri = uImg.x / uImg.y;
  vec2 k = rp < ri ? vec2(rp / ri, 1.0) : vec2(1.0, ri / rp);
  vec3 col = texture2D(uTex, (vUv - 0.5) * k + 0.5).rgb;
  col *= 1.0 - 0.35 * max(vOmbre, 0.0);
  col *= 1.0 + 0.08 * max(-vOmbre, 0.0);
  // Coins arrondis, comme le visuel en HTML
  vec2 q = abs((vUv - 0.5) * uTaille) - (uTaille * 0.5 - uRayon);
  float d = length(max(q, 0.0)) - uRayon;
  float m = 1.0 - smoothstep(-0.75, 0.75, d);
  gl_FragColor = vec4(col * m, m);
}`

/** Marge du canvas autour du visuel (fraction de sa taille, de chaque côté) */
export const MARGE_COURBE = 0.25

export interface PlanCourbe {
  /** Dessine le plan ; largeur / hauteur = taille du visuel en px (CSS) */
  dessiner: (courbe: number, torsion: number, largeur: number, hauteur: number) => void
  detruire: () => void
}

export function creerPlanCourbe(
  canvas: HTMLCanvasElement,
  source: HTMLImageElement | HTMLVideoElement,
  rayon: number,
): PlanCourbe | null {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true })
  if (!gl) return null

  const shader = (type: number, src: string) => {
    const s = gl.createShader(type)!
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('[planCourbe]', gl.getShaderInfoLog(s))
    return s
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn('[planCourbe]', gl.getProgramInfoLog(prog))
    return null
  }
  gl.useProgram(prog)

  // Grille de 32 × 32 carrés : assez fine pour une courbe lisse
  const N = 32
  const sommets: number[] = []
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const x0 = i / N
      const x1 = (i + 1) / N
      const y0 = j / N
      const y1 = (j + 1) / N
      sommets.push(x0, y0, x1, y0, x0, y1, x0, y1, x1, y0, x1, y1)
    }
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sommets), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'a')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const u = (n: string) => gl.getUniformLocation(prog, n)
  const uTaille = u('uTaille')
  const uCanvas = u('uCanvas')
  const uCourbe = u('uCourbe')
  const uTorsion = u('uTorsion')
  const uImg = u('uImg')
  const uRayon = u('uRayon')

  const tex = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const video = source instanceof HTMLVideoElement
  const envoyer = () => gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
  envoyer()
  const imgW = video ? source.videoWidth : source.naturalWidth
  const imgH = video ? source.videoHeight : source.naturalHeight

  return {
    dessiner(courbe, torsion, largeur, hauteur) {
      // Résolution un peu réduite : le canvas est grand (marge) et l'image bouge
      const dpr = Math.min(devicePixelRatio, 1.5)
      const cw = largeur * (1 + 2 * MARGE_COURBE)
      const ch = hauteur * (1 + 2 * MARGE_COURBE)
      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr)
        canvas.height = Math.round(ch * dpr)
        gl.viewport(0, 0, canvas.width, canvas.height)
      }
      if (video) envoyer()
      gl.uniform2f(uTaille, largeur, hauteur)
      gl.uniform2f(uCanvas, cw, ch)
      gl.uniform1f(uCourbe, courbe)
      gl.uniform1f(uTorsion, torsion)
      gl.uniform2f(uImg, imgW || largeur, imgH || hauteur)
      gl.uniform1f(uRayon, rayon)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLES, 0, N * N * 6)
    },
    detruire() {
      gl.deleteTexture(tex)
      gl.deleteBuffer(buf)
      gl.deleteProgram(prog)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
