'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import * as THREE from 'three';
import { getSection, NEURON_SECTIONS } from '@/data/sections';
import { NETWORK_CONFIG } from '@/data/network.config';
import { useSceneStore } from '@/stores/sceneStore';
import { HOME_POSE, SECTION_POSE } from '@/scenes/CameraRig/poses';

/**
 * Cinematic neural travel controller.
 *
 * On a 3D neuron selection (`travelRequest`), it flies the camera along a
 * Catmull-Rom curve from its current pose toward the selected neuron
 * (activation → dive), navigates to the section near the end of the dive, then
 * eases into the section's calm arrival pose — all continuous because the
 * canvas persists across routes. GSAP writes the pose into the store; the
 * CameraRig applies it. Interruptible (a new request kills the running
 * timeline) and skipped under reduced motion (instant navigation).
 */
export function NeuralTravel() {
  const camera = useThree((s) => s.camera);
  const router = useRouter();
  const pathname = usePathname();

  const travelRequest = useSceneStore((s) => s.travelRequest);
  const returnRequest = useSceneStore((s) => s.returnRequest);
  const reducedMotion = useSceneStore((s) => s.reducedMotion);
  const setActiveSection = useSceneStore((s) => s.setActiveSection);

  const timeline = useRef<gsap.core.Timeline | null>(null);
  const scratch = useMemo(
    () => ({
      start: new THREE.Vector3(),
      target: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      mid: new THREE.Vector3(),
      diveEnd: new THREE.Vector3(),
      side: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      cur: new THREE.Vector3(),
      aStart: new THREE.Vector3(),
      lookTarget: new THREE.Vector3(),
      sectionPos: new THREE.Vector3(...SECTION_POSE.position),
      homePos: new THREE.Vector3(...HOME_POSE.position),
      origin: new THREE.Vector3(0, 0, 0),
    }),
    [],
  );

  // Clear the active highlight when returning to the network (home).
  useEffect(() => {
    if (pathname === '/') setActiveSection(null);
  }, [pathname, setActiveSection]);

  useEffect(() => {
    if (!travelRequest) return;
    const href = getSection(travelRequest.section)?.href;
    if (!href) return;

    // Reduced motion: no camera journey, just navigate.
    if (reducedMotion) {
      router.push(href);
      return;
    }

    const s = scratch;
    const pose = useSceneStore.getState().travelPose;

    timeline.current?.kill();

    s.start.copy(camera.position);
    s.target.set(...travelRequest.target);
    s.dir.copy(s.target).sub(s.start).normalize();
    const distance = s.start.distanceTo(s.target);

    // Gentle arc: offset the midpoint sideways + up relative to the travel line.
    s.side.copy(s.dir).cross(s.up);
    if (s.side.lengthSq() < 1e-4) s.side.set(1, 0, 0);
    s.side.normalize();
    s.mid
      .copy(s.start)
      .lerp(s.target, 0.5)
      .addScaledVector(s.side, distance * 0.14)
      .addScaledVector(s.up, distance * 0.08);
    // Dive a touch past the neuron so we sweep through the network.
    s.diveEnd.copy(s.target).addScaledVector(s.dir, 0.7);

    const curve = new THREE.CatmullRomCurve3([
      s.start.clone(),
      s.mid.clone(),
      s.target.clone(),
      s.diveEnd.clone(),
    ]);

    const diveDur = THREE.MathUtils.clamp(distance * 0.2, 1.1, 1.9);
    const arriveDur = 0.65;
    const progress = { p: 0 };
    const arrive = { p: 0 };

    pose.active = true;

    const tl = gsap.timeline({
      onComplete: () => {
        pose.active = false;
      },
    });

    // Activation + dive toward the neuron (look at the neuron as we approach).
    tl.to(progress, {
      p: 1,
      duration: diveDur,
      ease: 'power2.in',
      onUpdate: () => {
        curve.getPoint(progress.p, s.cur);
        pose.px = s.cur.x;
        pose.py = s.cur.y;
        pose.pz = s.cur.z;
        pose.tx = s.target.x;
        pose.ty = s.target.y;
        pose.tz = s.target.z;
      },
    });

    // Navigate near the end of the dive; the persistent canvas keeps flowing.
    tl.call(() => router.push(href));

    // Arrival: ease from the dive end to the section's calm resting pose.
    tl.to(arrive, {
      p: 1,
      duration: arriveDur,
      ease: 'power2.out',
      onStart: () => {
        s.aStart.set(pose.px, pose.py, pose.pz);
        s.lookTarget.copy(s.target);
      },
      onUpdate: () => {
        s.cur.copy(s.aStart).lerp(s.sectionPos, arrive.p);
        pose.px = s.cur.x;
        pose.py = s.cur.y;
        pose.pz = s.cur.z;
        s.cur.copy(s.lookTarget).lerp(s.origin, arrive.p);
        pose.tx = s.cur.x;
        pose.ty = s.cur.y;
        pose.tz = s.cur.z;
      },
    });

    timeline.current = tl;
    return () => {
      tl.kill();
    };
  }, [travelRequest, reducedMotion, camera, router, scratch]);

  // Reverse journey: from a section page back to the network overview.
  // Mirrors the forward travel — the camera pulls in toward the section's
  // neuron, then sweeps out along an arc to the home pose, the gaze gliding
  // origin → neuron → origin so both ends stay perfectly continuous.
  useEffect(() => {
    if (!returnRequest) return;

    if (reducedMotion) {
      router.push('/');
      return;
    }

    const index = NEURON_SECTIONS.findIndex((sec) => sec.id === returnRequest.section);
    const navPos = NETWORK_CONFIG.navPositions[index];
    if (!navPos) {
      router.push('/');
      return;
    }

    const s = scratch;
    const pose = useSceneStore.getState().travelPose;

    timeline.current?.kill();

    s.start.copy(camera.position);
    s.target.set(...navPos);
    // Pull-in anchor just in front of the neuron, on the side we approach from.
    s.dir.copy(s.start).sub(s.target).normalize();
    s.diveEnd.copy(s.target).addScaledVector(s.dir, 0.9);
    const distance = s.diveEnd.distanceTo(s.homePos);

    // Arc the way out so the pull-back sweeps through the network.
    s.side.copy(s.dir).cross(s.up);
    if (s.side.lengthSq() < 1e-4) s.side.set(1, 0, 0);
    s.side.normalize();
    s.mid
      .copy(s.diveEnd)
      .lerp(s.homePos, 0.55)
      .addScaledVector(s.side, distance * 0.12)
      .addScaledVector(s.up, distance * 0.06);

    const curve = new THREE.CatmullRomCurve3([
      s.start.clone(),
      s.diveEnd.clone(),
      s.mid.clone(),
      s.homePos.clone(),
    ]);

    const duration = THREE.MathUtils.clamp(distance * 0.22, 1.4, 2.1);
    const progress = { p: 0 };

    pose.active = true;

    const tl = gsap.timeline({
      onComplete: () => {
        pose.active = false;
      },
    });

    tl.to(progress, {
      p: 1,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        curve.getPoint(progress.p, s.cur);
        pose.px = s.cur.x;
        pose.py = s.cur.y;
        pose.pz = s.cur.z;
        // Gaze: origin → neuron (early) → origin (well before arrival), so the
        // hand-over to the CameraRig's resting look is seamless.
        const w = Math.sin(Math.min(1, progress.p * 1.25) * Math.PI);
        s.lookTarget.copy(s.origin).lerp(s.target, w * 0.85);
        pose.tx = s.lookTarget.x;
        pose.ty = s.lookTarget.y;
        pose.tz = s.lookTarget.z;
      },
    });

    // Swap the route early so the landing chrome fades in during the sweep.
    tl.call(() => router.push('/'), [], duration * 0.22);

    timeline.current = tl;
    return () => {
      tl.kill();
    };
  }, [returnRequest, reducedMotion, camera, router, scratch]);

  return null;
}
