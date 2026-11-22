// Utilitas NPC: memuat Michelle, retarget animasi Xbot, dan IK dua-tulang untuk lengan.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SU from 'three/addons/utils/SkeletonUtils.js';

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
const wp = o => o.getWorldPosition(new THREE.Vector3());
export function rotateBoneWorld(bone, qWorld) {
  const bw = bone.getWorldQuaternion(new THREE.Quaternion()), pw = bone.parent.getWorldQuaternion(new THREE.Quaternion());
  bone.quaternion.copy(pw.invert().multiply(qWorld.clone().multiply(bw))); bone.updateMatrixWorld(true);
}
// IK dua tulang: upper (bahu) -> lower (siku) -> end (tangan) menuju target, siku diarahkan ke pole.
export function twoBoneIK(upper, lower, end, target, pole, weight = 1) {
  if (weight <= 0) return;
  const u0 = upper.quaternion.clone(), l0 = lower.quaternion.clone();
  upper.updateMatrixWorld(true);
  let S = wp(upper), E = wp(lower), H = wp(end);
  const a = S.distanceTo(E), b = E.distanceTo(H);
  const d = Math.min(Math.max(S.distanceTo(target), Math.abs(a - b) + 1e-4), a + b - 1e-4);
  const v1 = S.clone().sub(E).normalize(), v2 = H.clone().sub(E).normalize();
  let n = new THREE.Vector3().crossVectors(v1, v2);
  if (n.lengthSq() < 1e-8) n = new THREE.Vector3().crossVectors(v1, pole.clone().sub(E)).normalize(); else n.normalize();
  const cur = Math.acos(THREE.MathUtils.clamp(v1.dot(v2), -1, 1));
  const want = Math.acos(THREE.MathUtils.clamp((a * a + b * b - d * d) / (2 * a * b), -1, 1));
  rotateBoneWorld(lower, _q.setFromAxisAngle(n, want - cur));
  H = wp(end);
  rotateBoneWorld(upper, _q.setFromUnitVectors(H.clone().sub(S).normalize(), target.clone().sub(S).normalize()));
  // arahkan siku ke pole (putar di sekitar sumbu bahu->target)
  E = wp(lower); const ax = target.clone().sub(S).normalize();
  const pe = E.clone().sub(S).projectOnPlane(ax), pp = pole.clone().sub(S).projectOnPlane(ax);
  if (pe.lengthSq() > 1e-8 && pp.lengthSq() > 1e-8) {
    let ang = pe.angleTo(pp); if (new THREE.Vector3().crossVectors(pe, pp).dot(ax) < 0) ang = -ang;
    rotateBoneWorld(upper, _q.setFromAxisAngle(ax, ang));
  }
  if (weight < 1) { upper.quaternion.copy(u0.slerp(upper.quaternion.clone(), weight)); lower.quaternion.copy(l0.slerp(lower.quaternion.clone(), weight)); upper.updateMatrixWorld(true); }
}
export async function loadNPC(base = 'models/') {
  const L = new GLTFLoader();
  const [mi, xb] = await Promise.all([L.loadAsync(base + 'Michelle.glb'), L.loadAsync(base + 'Xbot.glb')]);
  const findSkinned = root => { let m; root.traverse(o => { if (o.isSkinnedMesh && !m) m = o; }); return m; };
  const char = mi.scene; const mesh = findSkinned(char); const src = findSkinned(xb.scene);
  char.updateMatrixWorld(true); xb.scene.updateMatrixWorld(true);
  const clips = {};
  for (const a of xb.animations) clips[a.name] = SU.retargetClip(mesh, src, a, { hip: 'mixamorigHips', useFirstFramePosition: true, fps: 30 });
  const bone = n => mesh.skeleton.bones.find(b => b.name === 'mixamorig' + n);
  const mixer = new THREE.AnimationMixer(mesh);
  const actions = {}; for (const k in clips) { actions[k] = mixer.clipAction(clips[k]); actions[k].play(); actions[k].setEffectiveWeight(0); }
  char.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; o.material = o.material.clone(); } });
  // pose: atur bobot tiap animasi lalu set waktu absolut (deterministik per frame)
  function pose(weights, time) {
    for (const k in actions) { actions[k].setEffectiveWeight(weights[k] || 0); actions[k].time = time % clips[k].duration; }
    mixer.update(0); char.updateMatrixWorld(true);
    // tapakkan kaki ke tanah (y = 0)
    const fy = Math.min(bone('LeftToeBase').getWorldPosition(new THREE.Vector3()).y, bone('RightToeBase').getWorldPosition(new THREE.Vector3()).y);
    char.position.y -= fy - 0.03; char.updateMatrixWorld(true);
  }
  return { char, mesh, bone, pose, clips };
}
