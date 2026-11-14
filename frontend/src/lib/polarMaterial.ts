// Material del globo con casquetes polares.
//
// Una textura equirectangular converge en los polos: toda la fila superior/inferior se aprieta en un
// punto y la GPU elige mal el mip (la derivada de u explota) → rayos y estiramiento. Para |lat| > 62°
// mezclamos una textura en proyección estereográfica polar (scripts/build_polar_caps.py):
//   Luna  → mosaico real LROC WAC Global Morphologic Map (PDS), 90°→60°.
//   Marte/Tierra → reproyección de la textura 8k (elimina la convergencia).
// Las coordenadas del casquete se calculan desde la posición del vértice, sin atan2, así que no
// hay singularidad en el polo.
import { MeshPhongMaterial, SRGBColorSpace, TextureLoader, type Texture } from 'three'
import type { Body } from '../engine/data'

const CAP_FROM = Math.sin((62 * Math.PI) / 180)
const CAP_TO = Math.sin((70 * Math.PI) / 180)
const RHO_MAX = 2 * Math.tan((15 * Math.PI) / 180) // casquete hasta |lat| = 60°

const f = (n: number) => n.toFixed(6)

export function createPolarGlobeMaterial(body: Body): MeshPhongMaterial {
  const loader = new TextureLoader()
  const load = (url: string): Texture => {
    const t = loader.load(url)
    t.colorSpace = SRGBColorSpace
    t.anisotropy = 16 // three la limita al máximo de la GPU
    return t
  }
  const capS = load(`/textures/caps/${body}_s.jpg`)
  const capN = load(`/textures/caps/${body}_n.jpg`)

  const mat = new MeshPhongMaterial({ shininess: body === 'earth' ? 10 : 2 })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.capS = { value: capS }
    shader.uniforms.capN = { value: capN }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCapPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCapPos = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D capS;\nuniform sampler2D capN;\nvarying vec3 vCapPos;')
      .replace(
        '#include <map_fragment>',
        /* glsl */ `
#ifdef USE_MAP
  vec4 sampledDiffuseColor = texture2D( map, vMapUv );
  // Espacio objeto de three-globe: lat = asin(y), lon = atan2(-z, x).
  vec3 cp = normalize( vCapPos );
  float sinAbsLat = abs( cp.y );
  // Estereográfica polar sin trigonometría: rho·(sin lon, ±cos lon) = 2·(−z, ±x) / (1 + |sin lat|)
  vec2 xy = vec2( -cp.z, cp.y < 0.0 ? cp.x : -cp.x ) * ( 2.0 / ( ( 1.0 + sinAbsLat ) * ${f(RHO_MAX)} ) );
  vec2 capUv = 0.5 + 0.5 * xy;
  // Se muestrean ambos fuera de ramas para que las derivadas (mipmaps) sean válidas.
  vec4 cS = texture2D( capS, capUv );
  vec4 cN = texture2D( capN, capUv );
  float w = smoothstep( ${f(CAP_FROM)}, ${f(CAP_TO)}, sinAbsLat );
  sampledDiffuseColor = mix( sampledDiffuseColor, cp.y < 0.0 ? cS : cN, w );
  diffuseColor *= sampledDiffuseColor;
#endif
`,
      )
  }
  mat.customProgramCacheKey = () => `polar-caps-${body}`

  const baseDispose = mat.dispose.bind(mat)
  mat.dispose = () => {
    capS.dispose()
    capN.dispose()
    baseDispose()
  }
  return mat
}
