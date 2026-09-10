import * as THREE from './three.module.min.js';
import { SYRIA_CITIES, SYRIA_LINKS } from './syria-cities.js';

const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = x => { const t = clamp01(x); return t * t * (3 - 2 * t); };

export function createSyriaNetwork(scene, project, color, pixelRatio) {
  const group = new THREE.Group();
  scene.add(group);
  const points = SYRIA_CITIES.map(city => new THREE.Vector3(...project(city.lon, city.lat), 0.0));
  const byId = new Map(SYRIA_CITIES.map((city, i) => [city.id, points[i]]));
  const geometries = [], materials = [], textures = [];
  const uniforms = { uTime: { value: 0 }, uFade: { value: 0 }, uReveal: { value: 0 } };

  // Tubes have an actual width on Safari/WebGL; native line widths often clamp to 1px.
  const links = SYRIA_LINKS.map(([from, to], index) => {
    const a = byId.get(from), b = byId.get(to);
    const middle = a.clone().lerp(b, 0.5);
    const dx = b.x - a.x, dy = b.y - a.y;
    middle.x -= dy * 0.065;
    middle.y += dx * 0.065;
    // Keep links in the same plane as their geographic endpoints.
    const curve = new THREE.QuadraticBezierCurve3(a, middle, b);
    const phase = (index * 0.381966) % 1;
    for (const halo of [true, false]) {
      const geometry = new THREE.TubeGeometry(curve, 36, halo ? 0.075 : 0.023, 6, false);
      const material = new THREE.ShaderMaterial({
        uniforms: { ...uniforms, uPhase: { value: phase }, uHalo: { value: halo ? 1 : 0 }, uColor: { value: color } },
        vertexShader: `varying float vAlong; void main() {
          vAlong = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
        fragmentShader: `precision mediump float;
          uniform float uTime, uFade, uReveal, uPhase, uHalo;
          uniform vec3 uColor; varying float vAlong;
          void main() {
            float reveal = smoothstep(vAlong - 0.08, vAlong + 0.08, uReveal * 1.16 - uPhase * 0.08);
            float head = fract(uTime * 0.21 + uPhase);
            float distance = abs(vAlong - head);
            float pulse = 1.0 - smoothstep(0.015, 0.15, distance);
            float strength = mix(0.46 + pulse * 0.5, 0.08 + pulse * 0.12, uHalo);
            vec3 ink = mix(uColor, vec3(0.91, 1.0, 1.0), pulse * 0.8);
            gl_FragColor = vec4(ink, strength * reveal * uFade);
          }`,
        transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
      });
      geometries.push(geometry); materials.push(material);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.renderOrder = halo ? 2 : 3;
      group.add(mesh);
    }
    return curve;
  });

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  geometry.setAttribute('aIndex', new THREE.Float32BufferAttribute(points.map((_, i) => i), 1));
  const nodeU = { ...uniforms, uPixelRatio: { value: pixelRatio }, uColor: { value: color } };
  const material = new THREE.ShaderMaterial({
    uniforms: nodeU,
    vertexShader: `attribute float aIndex; uniform float uPixelRatio;
      varying float vIndex; void main() { vIndex = aIndex;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = 44.0 * uPixelRatio;
    }`,
    fragmentShader: `precision mediump float;
      uniform float uTime, uFade; uniform vec3 uColor; varying float vIndex;
      void main() {
        float radius = length(gl_PointCoord - 0.5) * 2.0;
        float phase = fract(uTime * 0.29 + vIndex * 0.381966);
        float glow = exp(-radius * radius * 6.5) * 0.24;
        float core = 1.0 - smoothstep(0.09, 0.19, radius);
        float ring = (1.0 - smoothstep(0.025, 0.055, abs(radius - 0.36))) * 0.65;
        float ripple = (1.0 - smoothstep(0.018, 0.052, abs(radius - (0.39 + phase * 0.55)))) * (1.0 - phase) * 0.42;
        float alpha = (core + ring + glow + ripple) * uFade;
        if (radius > 1.0 || alpha < 0.005) discard;
        gl_FragColor = vec4(mix(uColor, vec3(0.94, 1.0, 1.0), core), alpha);
      }`,
    transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending
  });
  geometries.push(geometry); materials.push(material);
  const nodes = new THREE.Points(geometry, material);
  nodes.frustumCulled = false; nodes.renderOrder = 4;
  group.add(nodes);

  // Render both language textures once, after the page fonts have loaded.
  const labels = SYRIA_CITIES.map((city, i) => {
    const variants = {};
    for (const lang of ['en', 'ar']) {
      const canvas = document.createElement('canvas');
      canvas.width = 512; canvas.height = 112;
      const context = canvas.getContext('2d');
      context.font = '600 44px Cairo, sans-serif';
      context.direction = lang === 'ar' ? 'rtl' : 'ltr';
      context.textAlign = 'center'; context.textBaseline = 'middle';
      // A dark stroke keeps labels distinct from the dot field and the light paths.
      context.lineWidth = 10; context.strokeStyle = '#061820';
      context.strokeText(city[lang], 256, 56);
      context.fillStyle = '#edffff'; context.fillText(city[lang], 256, 56);
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.push(texture); variants[lang] = texture;
    }
    const labelMaterial = new THREE.SpriteMaterial({ map: variants.en, transparent: true, depthTest: false, depthWrite: false });
    materials.push(labelMaterial);
    const sprite = new THREE.Sprite(labelMaterial);
    const [dx, dy] = city.label;
    // Account for the transparent texture margin when aligning to the marker.
    sprite.center.set(dx < 0 ? 0.8 : 0.2, 0.5);
    sprite.position.copy(points[i]).add(new THREE.Vector3(dx, dy, 0.0));
    sprite.scale.set(3.6, 0.79, 1); sprite.renderOrder = 5;
    group.add(sprite);
    return { sprite, variants };
  });
  let language = '';
  return {
    count: points.length, links: links.length,
    update(progress, entrance, time, pinned, lang) {
      const fade = ease((progress - 0.846) / 0.042) * entrance;
      group.visible = fade > 0;
      uniforms.uFade.value = fade;
      uniforms.uReveal.value = ease((progress - 0.858) / 0.098);
      uniforms.uTime.value = pinned ? 0 : time;
      const nextLanguage = lang === 'ar' ? 'ar' : 'en';
      for (const { sprite, variants } of labels) {
        sprite.material.opacity = fade;
        if (language !== nextLanguage) sprite.material.map = variants[nextLanguage];
      }
      language = nextLanguage;
    },
    resize(ratio) { nodeU.uPixelRatio.value = ratio; },
    dispose() {
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      textures.forEach(t => t.dispose()); scene.remove(group);
    }
  };
}
