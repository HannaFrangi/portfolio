"use client";

import { useEffect, useMemo, useState } from 'react';
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { useQuality } from "@/lib/quality";
import { useTheme } from "@/lib/theme";

/** Neo-Y2K palette, shared with globals.css: liquid chrome, aqua and lilac glass, one lime spark. */
export const palette = {
  aqua: '#5CE1E6',
  lilac: '#B9A6FF',
  pearl: '#F4F6FF',
  sky: '#CFE6FF',
  cobalt: '#3B5BFF',
  lime: '#C8F53A',
  navy: '#0B1433',
  chrome: '#eef2f8',
};

/** Window-level pointer, -1..1, shared by every view. Not React state. */
export const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

export const motion = {
  reduced: typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const easeOut = (v: number) => 1 - (1 - v) ** 3;
export const easeInOut = (v: number) => (v < 0.5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2);
/** Overshoots then settles: the "pop" for blobs arriving. */
export const easeOutBack = (v: number) => 1 + 2.70158 * (v - 1) ** 3 + 1.70158 * (v - 1) ** 2;

/** Pinned sections pin from the md breakpoint up; phones scroll them normally. */
export const pinsActive = () => typeof window !== "undefined" && window.innerWidth >= 768;

/** 0 when the element's top enters the bottom of the viewport, 1 when its bottom leaves the top. */
export function scrollProgress(el: Element | null) {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight;
  return clamp01((vh - r.top) / (vh + r.height));
}

/** Progress through a pinned (sticky) section: 0 as it pins, 1 as it releases. */
export function pinProgress(el: Element | null) {
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  const span = r.height - window.innerHeight;
  return span <= 0 ? scrollProgress(el) : clamp01(-r.top / span);
}

/** A section's own timeline: pinned progress on desktop, pass-through progress on phones. */
export function sectionProgress(el: Element | null) {
  return pinsActive() ? pinProgress(el) : scrollProgress(el);
}

// Seeded so every visitor sees the same shapes.
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

/**
 * A soft organic lump: a sphere pushed around by a few low-frequency waves.
 * Cached by shape and detail, so every blob with the same seed shares one geometry.
 */
const blobCache = new Map<string, THREE.BufferGeometry>();
export function blobGeometry(seed: number, amount = 0.22, segments = 64) {
  const key = `${seed}:${amount}:${segments}`;
  const hit = blobCache.get(key);
  if (hit) return hit;
  const g = new THREE.SphereGeometry(1, segments, Math.round(segments * 0.66));
  const r = rng(seed * 7919 + 1);
  const waves = Array.from({ length: 4 }, () => ({
    dir: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
    freq: 1.2 + r() * 2.2,
    phase: r() * Math.PI * 2,
    amp: (0.4 + r() * 0.6) * amount,
  }));
  const p = g.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).normalize();
    let d = 1;
    for (const w of waves) d += Math.sin(v.dot(w.dir) * w.freq * Math.PI + w.phase) * w.amp;
    v.multiplyScalar(d);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  blobCache.set(key, g);
  return g;
}

/** Segment counts per tier: the low tier roughly thirds the triangle count. */
// export function useDetail() {
//   return useQuality() === "low" ? { blob: 36, sphere: 28 } : { blob: 64, sphere: 48 };
// }

/** Segment counts per tier: the low tier roughly thirds the triangle count. */
export function useDetail() {
  return useQuality() === 'low'
    ? { blob: 36, sphere: 28, liquid: 72 }
    : { blob: 64, sphere: 48, liquid: 144 };
}

export type Finish = 'chrome' | 'glass' | 'jelly' | 'plastic' | 'glow';

/**
 * A soap-bubble skin: nearly clear face-on, bright and rainbow-filmed at the rim.
 * Alpha comes from a fresnel term rather than `opacity`, so reflections stay at full strength.
 */
const bubbleCache = new Map<string, THREE.MeshPhysicalMaterial>();
export function bubbleMaterial(low: boolean, tint = '#ffffff') {
  const key = `${low}|${tint}`;
  const hit = bubbleCache.get(key);
  if (hit) return hit;
  const m = new THREE.MeshPhysicalMaterial({
    color: tint,
    metalness: 0,
    roughness: 0.04,
    transparent: true,
    depthWrite: false,
    envMapIntensity: 2.2,
    ...(low
      ? {}
      : {
          iridescence: 1,
          iridescenceIOR: 1.33,
          iridescenceThicknessRange: [180, 820] as [number, number],
          clearcoat: 1,
          clearcoatRoughness: 0.02,
        }),
  });
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `#include <opaque_fragment>
      float rim = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 3.2);
      float glint = smoothstep(0.7, 1.1, max(gl_FragColor.r, max(gl_FragColor.g, gl_FragColor.b)));
      gl_FragColor.a = clamp(0.03 + rim * 0.9 + glint * 0.85, 0.0, 1.0);`,
    );
  };
  bubbleCache.set(key, m);
  return m;
}

export function FinishMaterial({
  finish,
  color = palette.chrome,
}: {
  finish: Finish;
  color?: string;
}) {
  const low = useQuality() === 'low';
  if (finish === 'glass')
    return (
      <primitive
        object={bubbleMaterial(low, color)}
        attach='material'
        dispose={null}
      />
    );
  if (finish === 'glow')
    return (
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={1.4}
        toneMapped={false}
      />
    );
  if (low) {
    // Low tier: standard (not physical) shaders. No clearcoat or iridescence, the expensive
    // parts on a phone GPU; chrome still reads because it is mostly the environment map.
    if (finish === 'chrome')
      return (
        <meshStandardMaterial
          color={palette.chrome}
          metalness={1}
          roughness={0.08}
          envMapIntensity={1.3}
        />
      );
    if (finish === 'jelly')
      return (
        <meshStandardMaterial
          color={color}
          roughness={0.15}
          transparent
          opacity={0.8}
          envMapIntensity={1.2}
        />
      );
    return (
      <meshStandardMaterial
        color={color}
        roughness={0.25}
        envMapIntensity={1.1}
      />
    );
  }
  if (finish === 'chrome')
    return (
      <meshPhysicalMaterial
        color={palette.chrome}
        metalness={1}
        roughness={0.05}
        envMapIntensity={1.3}
        iridescence={0.22}
        iridescenceIOR={1.4}
      />
    );
  if (finish === 'jelly')
    return (
      <meshPhysicalMaterial
        color={color}
        roughness={0.1}
        transparent
        opacity={0.74}
        clearcoat={1}
        clearcoatRoughness={0.04}
        iridescence={0.55}
        iridescenceIOR={1.3}
        envMapIntensity={1.3}
      />
    );
  return (
    <meshPhysicalMaterial
      color={color}
      roughness={0.2}
      clearcoat={1}
      clearcoatRoughness={0.05}
      envMapIntensity={1.1}
    />
  );
}

/* ------------------------------------------------------------ liquid chrome */

const NOISE = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

export type LiquidUniforms = {
  uTime: { value: number };
  /** Surface churn: rises briefly when the cursor moves fast. */
  uAmp: { value: number };
  /** Unit direction (object space) the surface reaches toward, and how far. */
  uPull: { value: THREE.Vector3 };
  uPullAmt: { value: number };
};

/**
 * Liquid metal: a unit sphere whose surface is pushed around by moving noise on the GPU,
 * with a bulge that reaches toward `uPull`. Normals are rebuilt per vertex from two
 * neighbouring samples, so the chrome reflections ripple with the shape.
 */
export function makeLiquidChrome(low: boolean, tint = palette.chrome) {
  const uniforms: LiquidUniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.1 },
    uPull: { value: new THREE.Vector3(0, 0, 1) },
    uPullAmt: { value: 0 },
  };
  const material = low
    ? new THREE.MeshStandardMaterial({
        color: tint,
        metalness: 1,
        roughness: 0.12,
        envMapIntensity: 1.3,
      })
    : new THREE.MeshPhysicalMaterial({
        color: tint,
        metalness: 1,
        roughness: 0.11,
        envMapIntensity: 1.35,
        iridescence: 0.35,
        iridescenceIOR: 1.45,
      });
  // Scenes reach the uniforms through the mesh's material, never through React state.
  material.userData.uniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTime; uniform float uAmp; uniform vec3 uPull; uniform float uPullAmt;
        ${NOISE}
        vec3 liquid(vec3 dir) {
          float n = snoise(dir * 1.05 + vec3(uTime * 0.28, uTime * 0.21, -uTime * 0.17)) * uAmp
                  + snoise(dir * 2.1 - vec3(uTime * 0.33)) * uAmp * 0.16;
          n += pow(max(0.0, dot(dir, uPull)), 5.0) * uPullAmt;
          return dir * (1.0 + n);
        }`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        `vec3 lqDir = normalize(position);
        vec3 lqT = normalize(cross(lqDir, abs(lqDir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
        vec3 lqB = cross(lqDir, lqT);
        vec3 lqP = liquid(lqDir);
        vec3 lqP1 = liquid(normalize(lqDir + lqT * 0.02));
        vec3 lqP2 = liquid(normalize(lqDir + lqB * 0.02));
        vec3 objectNormal = normalize(cross(lqP1 - lqP, lqP2 - lqP));
        if (dot(objectNormal, lqDir) < 0.0) objectNormal = -objectNormal;
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`,
      )
      .replace('#include <begin_vertex>', 'vec3 transformed = lqP;');
  };
  return { material, uniforms };
}

/* -------------------------------------------------------------- environment */

/**
 * The fallback room chrome reflects until the generated sky panorama arrives (and if it
 * never does): soft aqua and lilac light panels. Built once per theme, shared by every view.
 */
const envCache = new Map<string, THREE.Texture>();
function proceduralEnvironment(gl: THREE.WebGLRenderer, dark: boolean) {
  const key = dark ? 'dark' : 'light';
  const hit = envCache.get(key);
  if (hit) return hit;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(dark ? '#070b1e' : '#e8f1fb');
  const panel = (
    color: string,
    intensity: number,
    pos: [number, number, number],
    scale: [number, number],
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).multiplyScalar(intensity),
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    mesh.position.set(...pos);
    mesh.scale.set(scale[0], scale[1], 1);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  panel('#ffffff', dark ? 0.9 : 3, [0, 4, 3], [10, 3]);
  panel(dark ? '#5ce1e6' : '#bdf3f5', dark ? 1.6 : 1.6, [-5, 0, 2], [6, 3]);
  panel(dark ? '#b9a6ff' : '#ddd3ff', dark ? 1.8 : 1.5, [5, -1, 2], [6, 2]);
  panel(dark ? '#1a2350' : '#ffffff', 1, [0, -4, 1], [10, 3]);
  const pmrem = new THREE.PMREMGenerator(gl);
  const texture = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  envCache.set(key, texture);
  return texture;
}

/** The generated sky panoramas, loaded once per theme and shared by every view. */
const skyCache = new Map<string, Promise<THREE.Texture>>();
function skyEnvironment(gl: THREE.WebGLRenderer, dark: boolean) {
  const key = dark ? "dark" : "light";
  let hit = skyCache.get(key);
  if (!hit) {
    hit = new THREE.TextureLoader().loadAsync(`/textures/env-${key}.jpg`).then((t) => {
      t.mapping = THREE.EquirectangularReflectionMapping;
      t.colorSpace = THREE.SRGBColorSpace;
      const pmrem = new THREE.PMREMGenerator(gl);
      const env = pmrem.fromEquirectangular(t).texture;
      pmrem.dispose();
      t.dispose();
      return env;
    });
    skyCache.set(key, hit);
  }
  return hit;
}

/**
 * Daylight sky studio: cool key, lilac bounce, and the sky panorama in every reflection.
 * Night shift turns the room navy with cyan and lilac light strips.
 */
export function Studio() {
  const dark = useTheme() === "dark";
  const gl = useThree((s) => s.gl);
  const fallback = useMemo(() => proceduralEnvironment(gl, dark), [gl, dark]);
  const [sky, setSky] = useState<{ key: boolean; tex: THREE.Texture } | null>(
    null,
  );
  useEffect(() => {
    let live = true;
    skyEnvironment(gl, dark).then(
      (tex) => live && setSky({ key: dark, tex }),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [gl, dark]);
  const environment = sky && sky.key === dark ? sky.tex : fallback;
  return (
    <>
      <hemisphereLight
        args={dark ? ['#4a5aa8', '#05060f', 0.7] : ['#f2fbff', '#c9bcff', 1.1]}
      />
      <directionalLight
        position={[4, 6, 5]}
        intensity={dark ? 1.4 : 2.1}
        color={dark ? '#cdeeff' : '#ffffff'}
      />
      <directionalLight
        position={[-5, 2, -3]}
        intensity={dark ? 2.2 : 0.9}
        color={dark ? '#b49cff' : '#bdf3f5'}
      />
      {/* shared across views, so never disposed when one view unmounts */}
      <primitive object={environment} attach='environment' dispose={null} />
    </>
  );
}
