import * as THREE from "three";
import { resolveHero3DSettings, type Hero3DInteraction, type Hero3DQuality } from "../lib/hero3d";
import { buildExtrudedLogoGeometry } from "../lib/logo-geometry";

interface HeroLogo3DHandle {
  destroy: () => void;
}

interface CroppedTexture {
  texture: THREE.CanvasTexture;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

function supportsWebGL(): boolean {
  try {
    const testCanvas = document.createElement("canvas");
    return Boolean(testCanvas.getContext("webgl2") || testCanvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseQuality(value: string | undefined): Hero3DQuality {
  return value === "max" || value === "light" ? value : "balanced";
}

function parseInteraction(value: string | undefined): Hero3DInteraction {
  return value === "mouse" ? value : "mouse";
}

function loadTexture(loader: THREE.TextureLoader, src: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    loader.load(
      src,
      (texture) => resolve(texture),
      undefined,
      (error) => reject(error)
    );
  });
}

function cropTextureToLogo(sourceTexture: THREE.Texture): CroppedTexture | null {
  const image = sourceTexture.image;
  const sourceWidth = typeof image?.width === "number" ? image.width : 0;
  const sourceHeight = typeof image?.height === "number" ? image.height : 0;

  if (sourceWidth < 4 || sourceHeight < 4) {
    return null;
  }

  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });

  if (!sourceContext) {
    return null;
  }

  sourceContext.drawImage(image as CanvasImageSource, 0, 0, sourceWidth, sourceHeight);
  const imageData = sourceContext.getImageData(0, 0, sourceWidth, sourceHeight).data;

  let minX = sourceWidth;
  let minY = sourceHeight;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < sourceHeight; y += 1) {
    for (let x = 0; x < sourceWidth; x += 1) {
      const index = (y * sourceWidth + x) * 4;
      if (imageData[index + 3] > 20) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return null;
  }

  const pad = Math.max(8, Math.floor(Math.max(sourceWidth, sourceHeight) * 0.02));
  const cropX = Math.max(0, minX - pad);
  const cropY = Math.max(0, minY - pad);
  const cropWidth = Math.min(sourceWidth - cropX, maxX - minX + 1 + pad * 2);
  const cropHeight = Math.min(sourceHeight - cropY, maxY - minY + 1 + pad * 2);

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = cropWidth;
  cropCanvas.height = cropHeight;
  const cropContext = cropCanvas.getContext("2d");

  if (!cropContext) {
    return null;
  }

  cropContext.drawImage(sourceCanvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  const texture = new THREE.CanvasTexture(cropCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;

  return {
    texture,
    canvas: cropCanvas,
    width: cropWidth,
    height: cropHeight,
  };
}

export function initHeroLogo3D(root: HTMLElement): HeroLogo3DHandle | null {
  const canvas = root.querySelector("[data-hero-logo-3d-canvas]");
  const fallback = root.querySelector("[data-hero-logo-3d-fallback]");
  const textureSrc = root.dataset.textureSrc;

  if (!(canvas instanceof HTMLCanvasElement) || !(fallback instanceof HTMLImageElement) || !textureSrc) {
    root.classList.add("hero-logo-3d--fallback-only");
    return null;
  }

  if (!supportsWebGL()) {
    root.classList.add("hero-logo-3d--fallback-only");
    return null;
  }

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reducedMotion = reducedMotionQuery.matches;
  const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches || navigator.maxTouchPoints > 0;
  const settings = resolveHero3DSettings({
    quality: parseQuality(root.dataset.quality),
    interaction: parseInteraction(root.dataset.interaction),
    reducedMotion,
    isTouchDevice,
    devicePixelRatio: window.devicePixelRatio || 1,
  });

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: settings.antialias,
      powerPreference: "high-performance",
    });
  } catch {
    root.classList.add("hero-logo-3d--fallback-only");
    return null;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.18;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 80);
  camera.position.set(0.05, 0.03, 7.1);
  scene.add(camera);

  const logoRoot = new THREE.Group();
  logoRoot.rotation.set(-0.04, -0.05, -0.01);
  logoRoot.scale.setScalar(0.78);
  scene.add(logoRoot);

  const ambient = new THREE.AmbientLight(0xffffff, 0.48);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xf5f7fa, 1.24);
  keyLight.position.set(2.5, 2.25, 3.2);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x9eb0bf, 0.52);
  fillLight.position.set(-2.2, -0.9, 2.4);
  scene.add(fillLight);

  const rimLight = new THREE.DirectionalLight(0x7f909e, 0.66);
  rimLight.position.set(0.1, 1.3, -2.9);
  scene.add(rimLight);

  const topLight = new THREE.DirectionalLight(0xffffff, 0.42);
  topLight.position.set(0, 3.4, 0.9);
  scene.add(topLight);

  let logoTexture: THREE.Texture | null = null;
  let croppedTexture: THREE.CanvasTexture | null = null;
  let logoGeometry: THREE.ExtrudeGeometry | null = null;
  let logoMaterials: THREE.MeshPhysicalMaterial[] = [];
  let logoMesh: THREE.Mesh<THREE.ExtrudeGeometry, THREE.MeshPhysicalMaterial | THREE.MeshPhysicalMaterial[]> | null = null;

  let resizeTimer = 0;
  let rafId = 0;
  let running = false;
  let destroyed = false;
  let inView = true;
  let pageVisible = !document.hidden;
  let idleRotation = 0;
  let lastTimestamp = performance.now();
  const pointer = { x: 0, y: 0 };

  const resize = () => {
    const widthPx = Math.max(canvas.clientWidth, 1);
    const heightPx = Math.max(canvas.clientHeight, 1);

    camera.aspect = widthPx / heightPx;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, settings.dprCap));
    renderer.setSize(widthPx, heightPx, false);
  };

  const onResize = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, settings.resizeDebounceMs);
  };

  const updatePointer = (clientX: number, clientY: number) => {
    if (!settings.pointerTracking) {
      return;
    }

    const rect = root.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const relativeX = (clientX - rect.left) / rect.width;
    const relativeY = (clientY - rect.top) / rect.height;
    pointer.x = clamp(relativeX * 2 - 1, -1, 1);
    pointer.y = clamp(relativeY * 2 - 1, -1, 1);
  };

  const onPointerMove = (event: PointerEvent) => updatePointer(event.clientX, event.clientY);

  const onPointerLeave = () => {
    pointer.x = 0;
    pointer.y = 0;
  };

  const onVisibilityChange = () => {
    pageVisible = !document.hidden;
    if (pageVisible && inView) {
      start();
      return;
    }
    stop();
  };

  const observer = new IntersectionObserver(
    (entries) => {
      const [entry] = entries;
      inView = entry?.isIntersecting ?? false;
      if (inView && pageVisible) {
        start();
        return;
      }
      stop();
    },
    { threshold: settings.pauseThreshold }
  );

  const frame = (timestamp: number) => {
    if (!running || destroyed) {
      return;
    }

    const deltaSeconds = clamp((timestamp - lastTimestamp) / 1000, 0, 0.05);
    lastTimestamp = timestamp;

    idleRotation += settings.idleSpeed * deltaSeconds;

    const pointerYaw = pointer.x * settings.maxYaw * 0.28;
    const targetYaw = clamp(idleRotation * 0.18 + pointerYaw, -0.36, 0.36);
    const targetPitch = clamp(-0.04 - pointer.y * settings.maxTilt * 0.34, -0.22, 0.2);
    const targetRoll = clamp(-0.01 - pointer.x * 0.025, -0.08, 0.08);

    logoRoot.rotation.y = THREE.MathUtils.lerp(logoRoot.rotation.y, targetYaw, settings.smoothing);
    logoRoot.rotation.x = THREE.MathUtils.lerp(logoRoot.rotation.x, targetPitch, settings.smoothing);
    logoRoot.rotation.z = THREE.MathUtils.lerp(logoRoot.rotation.z, targetRoll, settings.smoothing * 0.88);

    renderer.render(scene, camera);
    rafId = window.requestAnimationFrame(frame);
  };

  const start = () => {
    if (running || destroyed) {
      return;
    }
    running = true;
    lastTimestamp = performance.now();
    rafId = window.requestAnimationFrame(frame);
  };

  const stop = () => {
    if (!running) {
      return;
    }
    running = false;
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };

  const cleanup = () => {
    if (destroyed) {
      return;
    }

    destroyed = true;
    stop();

    window.clearTimeout(resizeTimer);
    observer.disconnect();

    window.removeEventListener("resize", onResize);
    window.removeEventListener("pointermove", onPointerMove);
    root.removeEventListener("pointerleave", onPointerLeave);
    document.removeEventListener("visibilitychange", onVisibilityChange);

    if (logoMesh) {
      logoRoot.remove(logoMesh);
    }

    if (logoGeometry) {
      logoGeometry.dispose();
    }

    for (const material of logoMaterials) {
      material.dispose();
    }

    if (logoTexture) {
      logoTexture.dispose();
    }
    if (croppedTexture) {
      croppedTexture.dispose();
    }

    renderer.dispose();
  };

  const loader = new THREE.TextureLoader();
  void loadTexture(loader, textureSrc)
    .then((texture) => {
      if (destroyed) {
        texture.dispose();
        return;
      }

      logoTexture = texture;
      logoTexture.colorSpace = THREE.SRGBColorSpace;
      logoTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

      const cropped = cropTextureToLogo(logoTexture);
      if (!cropped) {
        root.classList.add("hero-logo-3d--fallback-only");
        cleanup();
        return;
      }

      croppedTexture = cropped.texture;
      croppedTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

      logoGeometry = buildExtrudedLogoGeometry(cropped.canvas, 2.55);
      if (!logoGeometry) {
        root.classList.add("hero-logo-3d--fallback-only");
        cleanup();
        return;
      }

      const frontMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#36454f"),
        emissive: new THREE.Color("#202a31"),
        emissiveIntensity: 0.05,
        metalness: 0.86,
        roughness: 0.28,
        clearcoat: 0.88,
        clearcoatRoughness: 0.22,
      });

      const sideMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#708090"),
        emissive: new THREE.Color("#34424d"),
        emissiveIntensity: 0.08,
        metalness: 0.72,
        roughness: 0.44,
        clearcoat: 0.55,
        clearcoatRoughness: 0.3,
      });

      logoMaterials = [frontMaterial, sideMaterial];
      logoMesh = new THREE.Mesh(logoGeometry, logoMaterials);
      logoMesh.position.set(0.16, -0.03, 0);
      logoRoot.add(logoMesh);

      root.classList.add("hero-logo-3d--ready");
      start();
    })
    .catch(() => {
      root.classList.add("hero-logo-3d--fallback-only");
      cleanup();
    });

  resize();
  window.addEventListener("resize", onResize, { passive: true });
  window.addEventListener("pointermove", onPointerMove, { passive: true });
  root.addEventListener("pointerleave", onPointerLeave, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  observer.observe(root);

  if (!settings.pauseOutOfView) {
    inView = true;
    start();
  }

  return { destroy: cleanup };
}
