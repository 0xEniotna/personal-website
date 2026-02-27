import * as THREE from "three";

interface RasterMask {
  width: number;
  height: number;
  pixels: Uint8Array;
}

interface Point {
  x: number;
  y: number;
}

interface LoopMeta {
  index: number;
  points: Point[];
  area: number;
  absArea: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function keyOf(point: Point): string {
  return `${point.x},${point.y}`;
}

function parseKey(key: string): Point {
  const [x, y] = key.split(",");
  return {
    x: Number.parseFloat(x),
    y: Number.parseFloat(y),
  };
}

function signedArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersects = yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + Number.EPSILON) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function removeCollinear(points: Point[]): Point[] {
  if (points.length < 3) {
    return points;
  }

  const deduped: Point[] = [];
  for (const point of points) {
    const prev = deduped[deduped.length - 1];
    if (!prev || prev.x !== point.x || prev.y !== point.y) {
      deduped.push(point);
    }
  }

  if (deduped.length > 1) {
    const first = deduped[0];
    const last = deduped[deduped.length - 1];
    if (first.x === last.x && first.y === last.y) {
      deduped.pop();
    }
  }

  if (deduped.length < 3) {
    return deduped;
  }

  const cleaned: Point[] = [];
  for (let i = 0; i < deduped.length; i += 1) {
    const prev = deduped[(i - 1 + deduped.length) % deduped.length];
    const current = deduped[i];
    const next = deduped[(i + 1) % deduped.length];

    const dx1 = current.x - prev.x;
    const dy1 = current.y - prev.y;
    const dx2 = next.x - current.x;
    const dy2 = next.y - current.y;
    const collinear = Math.abs(dx1 * dy2 - dy1 * dx2) < 1e-8;

    if (!collinear) {
      cleaned.push(current);
    }
  }

  return cleaned.length >= 3 ? cleaned : deduped;
}

function distanceToSegment(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) {
    return Math.hypot(point.x - start.x, point.y - start.y);
  }

  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
  const projection = {
    x: start.x + dx * t,
    y: start.y + dy * t,
  };

  return Math.hypot(point.x - projection.x, point.y - projection.y);
}

function simplifyRdpOpen(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) {
    return points;
  }

  let maxDistance = 0;
  let maxIndex = -1;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = distanceToSegment(points[i], first, last);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  if (maxDistance <= epsilon || maxIndex < 0) {
    return [first, last];
  }

  const left = simplifyRdpOpen(points.slice(0, maxIndex + 1), epsilon);
  const right = simplifyRdpOpen(points.slice(maxIndex), epsilon);
  return [...left.slice(0, -1), ...right];
}

function simplifyClosedLoop(points: Point[], epsilon: number): Point[] {
  if (points.length <= 4) {
    return points;
  }

  const closed = [...points, points[0]];
  const simplified = simplifyRdpOpen(closed, epsilon);
  if (simplified.length <= 4) {
    return points;
  }

  simplified.pop();
  return removeCollinear(simplified);
}

function rasterizeAlpha(source: HTMLCanvasElement): RasterMask | null {
  const sourceWidth = source.width;
  const sourceHeight = source.height;

  if (sourceWidth < 6 || sourceHeight < 6) {
    return null;
  }

  const maxDimension = 520;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(36, Math.round(sourceWidth * scale));
  const height = Math.max(36, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return null;
  }

  context.clearRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.drawImage(source, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height).data;
  const pixels = new Uint8Array(width * height);

  for (let i = 0; i < pixels.length; i += 1) {
    pixels[i] = imageData[i * 4 + 3] > 24 ? 1 : 0;
  }

  return { width, height, pixels };
}

function isFilled(mask: RasterMask, x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= mask.width || y >= mask.height) {
    return false;
  }
  return mask.pixels[y * mask.width + x] === 1;
}

function traceLoops(mask: RasterMask): Point[][] {
  const adjacency = new Map<string, string[]>();

  const pushEdge = (start: Point, end: Point) => {
    const startKey = keyOf(start);
    const endKey = keyOf(end);
    const list = adjacency.get(startKey);
    if (list) {
      list.push(endKey);
      return;
    }
    adjacency.set(startKey, [endKey]);
  };

  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if (!isFilled(mask, x, y)) {
        continue;
      }

      if (!isFilled(mask, x, y - 1)) {
        pushEdge({ x, y }, { x: x + 1, y });
      }
      if (!isFilled(mask, x + 1, y)) {
        pushEdge({ x: x + 1, y }, { x: x + 1, y: y + 1 });
      }
      if (!isFilled(mask, x, y + 1)) {
        pushEdge({ x: x + 1, y: y + 1 }, { x, y: y + 1 });
      }
      if (!isFilled(mask, x - 1, y)) {
        pushEdge({ x, y: y + 1 }, { x, y });
      }
    }
  }

  const loops: Point[][] = [];

  const takeNext = (startKey: string): string | null => {
    const list = adjacency.get(startKey);
    if (!list || list.length === 0) {
      return null;
    }

    const next = list.pop() ?? null;
    if (list.length === 0) {
      adjacency.delete(startKey);
    }
    return next;
  };

  while (adjacency.size > 0) {
    const iterator = adjacency.keys().next();
    if (iterator.done || typeof iterator.value !== "string") {
      break;
    }

    const startKey = iterator.value;
    let currentKey = startKey;
    const loop: Point[] = [parseKey(startKey)];
    let guard = 0;
    const guardLimit = mask.width * mask.height * 8;

    while (guard < guardLimit) {
      guard += 1;
      const nextKey = takeNext(currentKey);
      if (!nextKey) {
        break;
      }

      loop.push(parseKey(nextKey));
      currentKey = nextKey;

      if (currentKey === startKey) {
        break;
      }
    }

    const cleaned = removeCollinear(loop);
    const simplified = simplifyClosedLoop(cleaned, 2.6);
    if (simplified.length >= 3 && Math.abs(signedArea(simplified)) > 4) {
      loops.push(simplified);
    }
  }

  return loops;
}

function normalizeLoop(loop: Point[], maskWidth: number, maskHeight: number, targetHeight: number): Point[] {
  const aspect = clamp(maskWidth / maskHeight, 0.32, 2.8);
  const targetWidth = targetHeight * aspect;

  return loop.map((point) => ({
    x: (point.x / maskWidth - 0.5) * targetWidth,
    y: (0.5 - point.y / maskHeight) * targetHeight,
  }));
}

function buildShapesFromLoops(loops: Point[][]): THREE.Shape[] {
  const metas: LoopMeta[] = loops
    .map((points, index) => {
      const area = signedArea(points);
      return {
        index,
        points,
        area,
        absArea: Math.abs(area),
      };
    })
    .filter((meta) => meta.absArea > 0.0004)
    .sort((a, b) => b.absArea - a.absArea);

  if (metas.length === 0) {
    return [];
  }

  const largestArea = metas[0].absArea;
  const significantMetas = metas.filter((meta) => meta.absArea >= largestArea * 0.006);

  const outerShapes = new Map<number, THREE.Shape>();
  const outerAreas = new Map<number, number>();

  for (const meta of significantMetas) {
    let depth = 0;
    let parentOuterIndex: number | null = null;
    let parentArea = Number.POSITIVE_INFINITY;

    for (const candidate of significantMetas) {
      if (candidate.index === meta.index || candidate.absArea <= meta.absArea) {
        continue;
      }

      if (pointInPolygon(meta.points[0], candidate.points)) {
        depth += 1;
        if (candidate.absArea < parentArea) {
          parentArea = candidate.absArea;
          parentOuterIndex = candidate.index;
        }
      }
    }

    const orientedPoints = [...meta.points];
    const wantsOuter = depth % 2 === 0;

    if (wantsOuter) {
      if (meta.area < 0) {
        orientedPoints.reverse();
      }
      const vectors = orientedPoints.map((point) => new THREE.Vector2(point.x, point.y));
      const shape = new THREE.Shape(vectors);
      outerShapes.set(meta.index, shape);
      outerAreas.set(meta.index, meta.absArea);
      continue;
    }

    if (meta.area > 0) {
      orientedPoints.reverse();
    }

    let holeOwner = parentOuterIndex;
    if (holeOwner === null) {
      for (const [outerIndex, shape] of outerShapes) {
        const test = shape.getPoints(1).map((point) => ({ x: point.x, y: point.y }));
        if (pointInPolygon(orientedPoints[0], test)) {
          const area = outerAreas.get(outerIndex) ?? Number.POSITIVE_INFINITY;
          if (area < parentArea) {
            parentArea = area;
            holeOwner = outerIndex;
          }
        }
      }
    }

    if (holeOwner === null) {
      continue;
    }

    const owner = outerShapes.get(holeOwner);
    if (!owner) {
      continue;
    }

    const holeVectors = orientedPoints.map((point) => new THREE.Vector2(point.x, point.y));
    owner.holes.push(new THREE.Path(holeVectors));
  }

  return [...outerShapes.values()];
}

export function buildExtrudedLogoGeometry(sourceCanvas: HTMLCanvasElement, targetHeight = 2.6): THREE.ExtrudeGeometry | null {
  const mask = rasterizeAlpha(sourceCanvas);
  if (!mask) {
    return null;
  }

  const tracedLoops = traceLoops(mask);
  if (tracedLoops.length === 0) {
    return null;
  }

  const normalizedLoops = tracedLoops.map((loop) => normalizeLoop(loop, mask.width, mask.height, targetHeight));
  const shapes = buildShapesFromLoops(normalizedLoops);
  if (shapes.length === 0) {
    return null;
  }

  const depth = clamp(targetHeight * 0.18, 0.22, 0.46);
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth,
    steps: 1,
    curveSegments: 4,
    bevelEnabled: true,
    bevelThickness: depth * 0.16,
    bevelSize: depth * 0.1,
    bevelOffset: 0,
    bevelSegments: 2,
  });

  geometry.center();
  geometry.computeVertexNormals();

  return geometry;
}
