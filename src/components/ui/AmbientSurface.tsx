'use client';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type AmbientSurfaceProps = Omit<React.ComponentProps<'div'>, 'ref'>;

export function AmbientSurface({ className = '', ...props }: AmbientSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer;
    animationId: number;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const SEPARATION = 120;
    const AMOUNTX = 30;
    const AMOUNTY = 40;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0b0e11, 1800, 9000);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      10000,
    );
    camera.position.set(0, 320, 1400);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);

    const positions: number[] = [];
    const colors: number[] = [];
    const geometry = new THREE.BufferGeometry();

    const R = 255 / 255, G = 255 / 255, B = 255 / 255;

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions.push(
          ix * SEPARATION - (AMOUNTX * SEPARATION) / 2,
          0,
          iy * SEPARATION - (AMOUNTY * SEPARATION) / 2,
        );
        colors.push(R, G, B);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 10,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let count = 0;
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const positionAttribute = geometry.attributes.position;
      const positionsArr = positionAttribute.array as Float32Array;

      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          const index = i * 3;
          positionsArr[index + 1] =
            Math.sin((ix + count) * 0.08) * 35 + Math.sin((iy + count) * 0.12) * 35;
          i++;
        }
      }
      positionAttribute.needsUpdate = true;
      renderer.render(scene, camera);
      count += 0.08;
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    animate();

    stateRef.current = { renderer, animationId: animationId! };

    return () => {
      window.removeEventListener('resize', handleResize);
      if (stateRef.current) {
        cancelAnimationFrame(stateRef.current.animationId);
        scene.traverse((object) => {
          if (object instanceof THREE.Points) {
            object.geometry.dispose();
            (object.material as THREE.Material).dispose();
          }
        });
        stateRef.current.renderer.dispose();
        if (containerRef.current && stateRef.current.renderer.domElement) {
          containerRef.current.removeChild(stateRef.current.renderer.domElement);
        }
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`pointer-events-none fixed inset-0 z-0 ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
}
