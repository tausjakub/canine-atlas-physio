'use client';
import { sitePath } from './site-path';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { type Atlas, type SceneState, isShown, partColor } from './anatomy';
import { type Language, translate } from './i18n';
import {
  dogPoses,
  poseMatrix,
  poseRig,
  segmentKey,
  sideOf,
  bindSoftVertices,
  deformSoftVertices,
  type DogPose,
} from './poses';
type Engine = { update: (s: SceneState) => void; destroy: () => void };
export type Snapshot = {
  image: string;
  marks: { id: string; x: number; y: number }[];
};
export type SceneTools = { snapshot: (view?: string) => Snapshot };
// High-contrast colours by system (accessibility).
const contrastColors: Record<string, string> = {
  bone: '#ffffff',
  muscle: '#ff453a',
  organ: '#ff9f0a',
  ligament: '#ffd60a',
  connective: '#64d2ff',
  surface: '#8e8e93',
  landmark: '#ffd60a',
  lymph: '#30d158',
  vessel: '#ff375f',
  nerve: '#fff35c',
};
// Stable small hash; the side suffix is ignored so paired muscles match.
function tintOf(id: string) {
  let h = 7;
  for (const c of id.replace(/_[LR]$/, ''))
    h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
export default function AnatomyScene({
  atlas,
  state,
  onSelect,
  language,
  onMeasure,
  onTools,
  onPick,
}: {
  atlas: Atlas;
  state: SceneState;
  onSelect: (id: string) => void;
  language: Language;
  onMeasure?: (text: string) => void;
  onTools?: (tools: SceneTools | null) => void;
  onPick?: (point: number[]) => void;
}) {
  const t = (key: string) => translate(language, key),
    locale = useRef(language);
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<Engine | null>(null),
    latest = useRef(state),
    select = useRef(onSelect),
    measured = useRef(onMeasure),
    toolsReady = useRef(onTools),
    picked = useRef(onPick);
  const [status, setStatus] = useState('Loading anatomy…'),
    [error, setError] = useState('');
  // Keep the imperative engine's view of props current without re-initialising it.
  useLayoutEffect(() => {
    locale.current = language;
    latest.current = state;
    select.current = onSelect;
    measured.current = onMeasure;
    toolsReady.current = onTools;
    picked.current = onPick;
  });
  useEffect(() => {
    const el = host.current!;
    let dead = false;
    let cleanup = () => {};
    const abort = new AbortController();
    async function init() {
      try {
        const main = atlas.binaryPath || '/models/anatomy.bin';
        const paths = [
          main,
          ...new Set(
            atlas.parts.flatMap((p) =>
              p.binaryPath && p.binaryPath !== main ? [p.binaryPath] : [],
            ),
          ),
        ];
        const buffers = new Map<string, ArrayBuffer>();
        for (const path of paths) {
          const response = await fetch(sitePath(path), {
            signal: abort.signal,
          });
          if (!response.ok)
            throw Error('The anatomy file could not be loaded.');
          buffers.set(path, await response.arrayBuffer());
        }
        const buffer = buffers.get(main)!;
        if (dead) return;
        if (buffer.byteLength !== atlas.bytes)
          throw Error('The anatomy download is incomplete.');
        const renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
        });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setClearColor(0, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.localClippingEnabled = true;
        const cut = new THREE.Plane(),
          cutPlanes = [cut],
          noPlanes: THREE.Plane[] = [];
        el.appendChild(renderer.domElement);
        renderer.domElement.setAttribute(
          'aria-label',
          atlas.species
            ? locale.current === 'cs'
              ? 'Interaktivní anatomický model. Tažením otáčejte, kolečkem přibližujte. Struktury lze vybrat také ze seznamu.'
              : 'Interactive anatomy model. Drag to orbit, scroll to zoom. Structures can also be selected from the list.'
            : translate(
                locale.current,
                'Interactive canine anatomy. Drag to orbit; scroll or pinch to zoom. Select structures using the list for keyboard access.',
              ),
        );
        const scene = new THREE.Scene(),
          camera = new THREE.PerspectiveCamera(36, 1, 0.001, 100);
        camera.position.set(0, 0.4, -2);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.09;
        controls.minDistance = 0.035;
        controls.maxDistance = 30;
        controls.autoRotateSpeed = 0.8;
        controls.target.set(0, 0.35, 0);
        scene.add(new THREE.HemisphereLight(0xdcefff, 0x425367, 2));
        const key = new THREE.DirectionalLight(0xffefdf, 3);
        key.position.set(1, 3, -2);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0x8cc8ff, 1.6);
        fill.position.set(-2, 1, 2);
        scene.add(fill);
        function textSprite(text: string, color: string) {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 64;
          const c = canvas.getContext('2d')!;
          c.fillStyle = 'rgba(16,24,32,0.8)';
          c.beginPath();
          c.arc(32, 32, 30, 0, Math.PI * 2);
          c.fill();
          c.fillStyle = color;
          c.font = 'bold 34px sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText(text, 32, 34);
          const sprite = new THREE.Sprite(
            new THREE.SpriteMaterial({
              map: new THREE.CanvasTexture(canvas),
              depthTest: false,
            }),
          );
          sprite.scale.setScalar(0.014);
          sprite.renderOrder = 10;
          return sprite;
        }
        const pinGroup = new THREE.Group();
        scene.add(pinGroup);
        let pinKey = '[]';
        const meshes: THREE.Mesh<
          THREE.BufferGeometry,
          THREE.MeshStandardMaterial
        >[] = [];
        atlas.parts.forEach((p) => {
          const g = p.path
            ? new THREE.TubeGeometry(
                new THREE.CatmullRomCurve3(
                  p.path.map((v) => new THREE.Vector3(...v)),
                  false,
                  'centripetal',
                ),
                24,
                p.radius,
                8,
                false,
              )
            : new THREE.BufferGeometry();
          if (!p.path) {
            const source = buffers.get(p.binaryPath ?? main) ?? buffer;
            g.setAttribute(
              'position',
              new THREE.BufferAttribute(
                new Float32Array(source, p.vertexOffset, p.vertexCount * 3),
                3,
              ),
            );
            g.setIndex(
              new THREE.BufferAttribute(
                new Uint32Array(source, p.indexOffset, p.indexCount),
                1,
              ),
            );
            g.computeVertexNormals();
          }
          g.computeBoundingBox();
          const color = partColor(p);
          const m = new THREE.Mesh(
            g,
            new THREE.MeshStandardMaterial({
              color,
              roughness: 0.63,
              metalness: 0.02,
              side: THREE.DoubleSide,
            }),
          );
          m.userData.part = p;
          scene.add(m);
          meshes.push(m);
          // Text anchored in 3D (rib numbers), drawn over the model.
          m.userData.labels = (p.labels ?? []).map(({ text, at }) => {
            const sprite = textSprite(text, '#ffe9a8');
            sprite.position.set(at[0], at[1] + 0.012, at[2]);
            scene.add(sprite);
            return sprite;
          });
        });
        const poseMatrices = new Map(
          dogPoses.map((pose) => [
            pose,
            new Map(
              atlas.parts.map((p) => [
                p.id,
                poseMatrix(p, pose, atlas.poseConfig),
              ]),
            ),
          ]),
        );
        const bones = atlas.parts.filter((p) => p.system === 'bone');
        const softGeometry = new Map(
          meshes
            .filter((m) => m.userData.part.system !== 'bone')
            .map((m) => [
              m,
              {
                rest: (
                  m.geometry.getAttribute('position').array as Float32Array
                ).slice(),
                bindings: null as ReturnType<typeof bindSoftVertices> | null,
                poses: new Map<DogPose, Float32Array>(),
                active: 'standing' as string,
              },
            ]),
        );
        const box = new THREE.Box3();
        let previous: SceneState | undefined;
        function frame(view: string) {
          box.makeEmpty();
          const focused =
            latest.current.focusSelected && latest.current.selected;
          const framed = meshes.filter(
            (m) => m.visible && (!focused || m.userData.part.id === focused),
          );
          framed.forEach((m) => box.expandByObject(m));
          if (box.isEmpty()) return;
          const center = box.getCenter(new THREE.Vector3()),
            size = box.getSize(new THREE.Vector3());
          const dir =
            view === 'cranial'
              ? new THREE.Vector3(1, 0, 0)
              : view === 'dorsal'
                ? new THREE.Vector3(0, 1, 0.0001)
                : view === 'right'
                  ? new THREE.Vector3(0, 0, 1)
                  : view === 'three-quarter'
                    ? new THREE.Vector3(0.8, 0.35, -1)
                    : new THREE.Vector3(0, 0.03, -1);
          let fit: number;
          if (atlas.species) {
            // Fit the visible pieces in the chosen direction; a circumscribed
            // sphere leaves long, slender animals small on the canvas.
            const direction = dir.clone().normalize(),
              right = new THREE.Vector3(0, 1, 0).cross(direction).normalize(),
              up = direction.clone().cross(right).normalize(),
              tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)),
              corner = new THREE.Vector3();
            fit = 0;
            for (const mesh of framed) {
              const b = new THREE.Box3().expandByObject(mesh);
              for (const x of [b.min.x, b.max.x])
                for (const y of [b.min.y, b.max.y])
                  for (const z of [b.min.z, b.max.z]) {
                    corner.set(x, y, z).sub(center);
                    fit = Math.max(
                      fit,
                      Math.abs(corner.dot(right)) / (tan * camera.aspect) +
                        corner.dot(direction),
                      Math.abs(corner.dot(up)) / tan + corner.dot(direction),
                    );
                  }
            }
            fit *= 1.12;
          } else {
            const radius = size.length() / 2;
            fit =
              (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) *
              Math.max(1, 1 / camera.aspect) *
              1.05;
          }
          controls.target.copy(center);
          camera.position
            .copy(center)
            .addScaledVector(dir.normalize(), Math.max(fit, 0.08));
          camera.near = Math.max(0.0001, fit / 1000);
          camera.far = Math.max(100, fit * 10);
          camera.updateProjectionMatrix();
          controls.update();
        }
        function update(s: SceneState) {
          let x = 0,
            y = 0,
            row = 0;
          const shown = atlas.parts.filter((p) => isShown(p, s)),
            layout = new Map<string, THREE.Vector3>();
          for (const p of [...shown].sort(
            (a, b) =>
              b.bounds[1][1] -
              b.bounds[0][1] -
              (a.bounds[1][1] - a.bounds[0][1]),
          )) {
            const w = p.bounds[1][0] - p.bounds[0][0] + 0.045,
              h = p.bounds[1][1] - p.bounds[0][1] + 0.045;
            if (x + w > 4.3) {
              x = 0;
              y += row;
              row = 0;
            }
            layout.set(
              p.id,
              new THREE.Vector3(x + w / 2, -y - h / 2, 0).sub(
                new THREE.Vector3(...p.center),
              ),
            );
            x += w;
            row = Math.max(row, h);
          }
          // Section plane: cut away one side of the model at s.section.at (0-1).
          if (s.section) {
            const all = new THREE.Box3();
            meshes.forEach((m) => {
              if (isShown(m.userData.part, s)) all.expandByObject(m);
            });
            const i = { x: 0, y: 1, z: 2 }[s.section.axis];
            const lo = all.isEmpty() ? -1 : all.min.getComponent(i),
              hi = all.isEmpty() ? 1 : all.max.getComponent(i);
            const sign = s.section.axis === 'z' ? 1 : -1;
            const at = lo + (hi - lo) * s.section.at;
            cut.set(new THREE.Vector3().setComponent(i, sign), -sign * at);
          }
          const poseKey = s.motion
            ? `motion:${JSON.stringify(s.motion)}`
            : s.pose || 'standing';
          const motionRig = s.motion
            ? poseRig('standing', atlas.poseConfig, s.motion)
            : null;
          // Instructor pins: numbered markers, rebuilt when they change.
          if (JSON.stringify(s.pins ?? []) !== pinKey) {
            pinKey = JSON.stringify(s.pins ?? []);
            pinGroup.children.forEach((c) => {
              const sp = c as THREE.Sprite;
              sp.material.map?.dispose();
              sp.material.dispose();
            });
            pinGroup.clear();
            (s.pins ?? []).forEach((pin, i) => {
              const sp = textSprite(String(i + 1), '#ffcf4a');
              sp.position.set(pin.at[0], pin.at[1], pin.at[2]);
              pinGroup.add(sp);
            });
          }
          meshes.forEach((m) => {
            const p = m.userData.part;
            m.visible = isShown(p, s);
            const planes = s.section ? cutPlanes : noPlanes;
            if (m.material.clippingPlanes !== planes) {
              m.material.clippingPlanes = planes;
              m.material.needsUpdate = true;
            }
            const selected = p.id === s.selected;
            const lit =
              !selected &&
              p.system === 'muscle' &&
              s.highlight?.some((h) => {
                const [token, side] = h.split('@');
                return p.id.includes(token) && (!side || sideOf(p.id) === side);
              });
            m.material.color.set(
              selected
                ? '#67e0d0'
                : lit
                  ? '#ffb347'
                  : s.contrast
                    ? (contrastColors[p.system] ?? '#ffffff')
                    : partColor(p),
            );
            // Species atlases shade neighbouring muscles slightly differently
            // so individual bellies stay distinguishable.
            if (
              !selected &&
              !lit &&
              !s.contrast &&
              atlas.species &&
              p.system === 'muscle'
            )
              m.material.color.offsetHSL(
                ((tintOf(p.id) % 7) - 3) * 0.006,
                0,
                ((tintOf(p.id) % 5) - 2) * 0.035,
              );
            m.material.emissive.set(
              selected ? '#123d39' : lit ? '#4a2600' : '#000000',
            );
            m.material.opacity = selected
              ? 1
              : s.focusSelected && s.selected
                ? 0.1
                : p.system === 'muscle'
                  ? s.opacity
                  : p.system === 'surface'
                    ? 0.2
                    : 1;
            // X-ray look: glowing bone, faint soft tissue, additive blending.
            const xray = s.xray && !selected;
            if (xray) {
              m.material.color.set(p.system === 'bone' ? '#9fb8d6' : '#2d4058');
              m.material.opacity = p.system === 'bone' ? 0.55 : 0.12;
            }
            const blending = xray
              ? THREE.AdditiveBlending
              : THREE.NormalBlending;
            if (m.material.blending !== blending) {
              m.material.blending = blending;
              m.material.needsUpdate = true;
            }
            m.material.transparent = m.material.opacity < 1;
            m.material.depthWrite = m.material.opacity >= 1;
            const pose = s.pose || 'standing',
              soft = softGeometry.get(m);
            // Joint motion deforms only visible soft tissue, and is not cached.
            if (soft && soft.active !== poseKey && (m.visible || !s.motion)) {
              let positions = s.motion
                ? undefined
                : pose === 'standing'
                  ? soft.rest
                  : soft.poses.get(pose);
              if (!positions) {
                soft.bindings ??= bindSoftVertices(soft.rest, bones);
                positions = deformSoftVertices(
                  soft.rest,
                  soft.bindings,
                  pose,
                  atlas.poseConfig,
                  s.motion,
                );
                if (!s.motion) soft.poses.set(pose, positions);
              }
              const attribute = m.geometry.getAttribute(
                'position',
              ) as THREE.BufferAttribute;
              attribute.set(positions);
              attribute.needsUpdate = true;
              m.geometry.computeVertexNormals();
              m.geometry.computeBoundingBox();
              m.geometry.computeBoundingSphere();
              soft.active = poseKey;
            }
            m.matrixAutoUpdate = false;
            if (soft) m.matrix.identity();
            else if (motionRig) m.matrix.copy(motionRig[segmentKey(p)]);
            else m.matrix.copy(poseMatrices.get(pose)!.get(p.id)!);
            const translation = new THREE.Vector3()
              .setFromMatrixPosition(m.matrix)
              .addScaledVector(
                layout.get(p.id) || new THREE.Vector3(),
                s.explode,
              );
            if (s.displace && s.displace.id === p.id)
              translation.add(new THREE.Vector3(...s.displace.by));
            m.matrix.setPosition(translation);
            m.matrixWorldNeedsUpdate = true;
            // Labels are anchored to the standing, assembled model only.
            for (const sprite of m.userData.labels as THREE.Sprite[])
              sprite.visible =
                m.visible &&
                (s.pose ?? 'standing') === 'standing' &&
                !s.explode;
          });
          controls.autoRotate = s.rotate;
          if (!s.measure && picks.length) clearMeasure();
          if (
            !previous ||
            previous.pose !== s.pose ||
            previous.reset !== s.reset ||
            previous.view !== s.view ||
            previous.isolate !== s.isolate ||
            previous.focusSelected !== s.focusSelected ||
            previous.explode !== s.explode ||
            ((s.isolate || s.focusSelected) && previous.selected !== s.selected)
          )
            frame(s.explode > 0 ? 'lateral' : s.view);
          previous = { ...s };
        }
        let width = 0,
          height = 0;
        const resize = () => {
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height) return;
          camera.aspect = r.width / r.height;
          camera.updateProjectionMatrix();
          renderer.setSize(r.width, r.height);
          if (width !== r.width || height !== r.height) {
            width = r.width;
            height = r.height;
            frame(latest.current.view);
          }
        };
        const observer = new ResizeObserver(resize);
        observer.observe(el);
        resize();
        // Measuring: up to three picked points; distance, or the angle at the middle one.
        const picks: THREE.Vector3[] = [];
        const marks = new THREE.Group();
        scene.add(marks);
        const markMaterial = new THREE.MeshBasicMaterial({
            color: '#ffcf4a',
            depthTest: false,
          }),
          lineMaterial = new THREE.LineBasicMaterial({
            color: '#ffcf4a',
            depthTest: false,
          });
        function clearMeasure() {
          picks.length = 0;
          marks.children.forEach((c) => {
            if (c instanceof THREE.Line || c instanceof THREE.Mesh)
              c.geometry.dispose();
          });
          marks.clear();
          measured.current?.('');
        }
        function addPick(point: THREE.Vector3) {
          if (picks.length === 3) clearMeasure();
          picks.push(point.clone());
          const dot = new THREE.Mesh(
            new THREE.SphereGeometry(0.0035, 10, 8),
            markMaterial,
          );
          dot.position.copy(point);
          dot.renderOrder = 11;
          marks.add(dot);
          if (picks.length > 1) {
            const line = new THREE.Line(
              new THREE.BufferGeometry().setFromPoints(picks.slice(-2)),
              lineMaterial,
            );
            line.renderOrder = 11;
            marks.add(line);
          }
          const mm = (a: THREE.Vector3, b: THREE.Vector3) =>
            Math.round(a.distanceTo(b) * 1000);
          if (picks.length === 2)
            measured.current?.(`${mm(picks[0], picks[1])} mm`);
          if (picks.length === 3) {
            const a = picks[0].clone().sub(picks[1]),
              b = picks[2].clone().sub(picks[1]);
            const deg = Math.round(THREE.MathUtils.radToDeg(a.angleTo(b)));
            measured.current?.(
              `${mm(picks[0], picks[1])} mm, ${mm(picks[1], picks[2])} mm, ${deg}°`,
            );
          }
        }
        update(latest.current);
        const ray = new THREE.Raycaster(),
          pointer = new THREE.Vector2();
        let start = [0, 0],
          drag = false;
        const hit = (e: PointerEvent) => {
          const r = renderer.domElement.getBoundingClientRect();
          pointer.set(
            ((e.clientX - r.left) / r.width) * 2 - 1,
            (-(e.clientY - r.top) / r.height) * 2 + 1,
          );
          ray.setFromCamera(pointer, camera);
          return ray.intersectObjects(
            meshes.filter((m) => m.visible && m.material.opacity > 0.05),
            false,
          )[0];
        };
        const down = (e: PointerEvent) => {
          start = [e.clientX, e.clientY];
          drag = false;
        };
        const move = (e: PointerEvent) => {
          if (Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 5)
            drag = true;
        };
        const up = (e: PointerEvent) => {
          if (drag || e.button !== 0) return;
          const h = hit(e);
          if (h && latest.current.measure) addPick(h.point);
          else if (h && latest.current.annotate)
            picked.current?.(
              h.point.toArray().map((v) => Math.round(v * 1e4) / 1e4),
            );
          else if (h) select.current(h.object.userData.part.id);
        };
        renderer.domElement.addEventListener('pointerdown', down);
        renderer.domElement.addEventListener('pointermove', move);
        renderer.domElement.addEventListener('pointerup', up);
        // Keyboard: arrows step through visible structures, cranial to caudal.
        renderer.domElement.tabIndex = 0;
        const stepKey = (e: KeyboardEvent) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
          e.preventDefault();
          const order = meshes
            .filter((x) => x.visible)
            .map((x) => x.userData.part)
            .sort(
              (a, b) => b.center[0] - a.center[0] || b.center[1] - a.center[1],
            );
          if (!order.length) return;
          const i = order.findIndex((p) => p.id === latest.current.selected);
          const next =
            order[
              (i + (e.key === 'ArrowRight' ? 1 : -1) + order.length) %
                order.length
            ];
          select.current(next.id);
        };
        renderer.domElement.addEventListener('keydown', stepKey);
        renderer.setAnimationLoop(() => {
          controls.update();
          renderer.render(scene, camera);
        });
        cleanup = () => {
          toolsReady.current?.(null);
          observer.disconnect();
          renderer.setAnimationLoop(null);
          controls.dispose();
          meshes.forEach((m) => {
            m.geometry.dispose();
            m.material.dispose();
            for (const sprite of m.userData.labels as THREE.Sprite[]) {
              sprite.material.map?.dispose();
              sprite.material.dispose();
            }
          });
          renderer.dispose();
          renderer.domElement.remove();
        };
        engine.current = { update, destroy: cleanup };
        const pickable = () =>
          meshes.filter((x) => x.visible && x.material.opacity > 0.05);
        toolsReady.current?.({
          // Render now and read the canvas back (the drawing buffer is not
          // preserved), with up to 12 numbered marks on visible structures.
          snapshot(view?: string) {
            if (view) frame(view);
            renderer.render(scene, camera);
            const out: Snapshot['marks'] = [];
            const sized = pickable()
              .map((m) => ({ m, b: new THREE.Box3().setFromObject(m) }))
              .sort(
                (a, b) =>
                  b.b.getSize(new THREE.Vector3()).length() -
                  a.b.getSize(new THREE.Vector3()).length(),
              );
            for (const { m, b } of sized) {
              if (out.length >= 12) break;
              const ndc = b.getCenter(new THREE.Vector3()).project(camera);
              if (Math.abs(ndc.x) > 0.95 || Math.abs(ndc.y) > 0.95) continue;
              ray.setFromCamera(new THREE.Vector2(ndc.x, ndc.y), camera);
              if (ray.intersectObjects(pickable(), false)[0]?.object !== m)
                continue;
              const x = (ndc.x + 1) / 2,
                y = (1 - ndc.y) / 2;
              if (out.some((o) => Math.hypot(o.x - x, o.y - y) < 0.06))
                continue;
              out.push({ id: m.userData.part.id, x, y });
            }
            const image = renderer.domElement.toDataURL('image/png');
            if (view) frame(latest.current.view);
            return { image, marks: out };
          },
        });
        setStatus('');
      } catch (e) {
        if (!dead)
          setError(
            e instanceof Error &&
              [
                'The anatomy file could not be loaded.',
                'The anatomy download is incomplete.',
              ].includes(e.message)
              ? e.message
              : 'Unable to initialize the 3D viewer.',
          );
      }
    }
    void init();
    return () => {
      dead = true;
      abort.abort();
      cleanup();
      engine.current = null;
    };
  }, [atlas]);
  useEffect(() => engine.current?.update(state), [state]);
  useEffect(() => {
    host.current
      ?.querySelector('canvas')
      ?.setAttribute(
        'aria-label',
        translate(
          language,
          'Interactive canine anatomy. Drag to orbit; scroll or pinch to zoom. Select structures using the list for keyboard access.',
        ),
      );
  }, [language]);
  return (
    <>
      <div className="scene" ref={host} />
      {(error || status) && (
        <div className="load-card" role={error ? 'alert' : 'status'}>
          <strong>{t(error ? 'Viewer unavailable' : status)}</strong>
          <p>{t(error || 'Preparing 3D bones and soft tissues.')}</p>
          {error && (
            <button onClick={() => location.reload()}>
              {t('Retry viewer')}
            </button>
          )}
        </div>
      )}
    </>
  );
}
