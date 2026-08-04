import { TOLERANCE, ALLOWED_ROTATIONS } from './tolerance';
import type { VerificationRequest, VerificationResult, PieceVerificationResult } from '../types';
import TangramPuzzle from '../../models/TangramPuzzle';

function pointToKey(p: number[]): string {
  return `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`;
}

function edgeLength(a: number[], b: number[]): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

function signedArea(polygon: number[][]): number {
  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function polygonArea(polygon: number[][]): number {
  return Math.abs(signedArea(polygon));
}

function polygonCentroid(polygon: number[][]): { x: number; y: number } {
  let cx = 0;
  let cy = 0;
  for (const [x, y] of polygon) {
    cx += x;
    cy += y;
  }
  return { x: cx / polygon.length, y: cy / polygon.length };
}

export function transformPolygon(
  polygon: number[][],
  position: { x: number; y: number },
  rotation: number,
  flipped: boolean
): number[][] {
  let result = polygon.map(([x, y]) => [x, y] as [number, number]);

  if (flipped) {
    result = result.map(([x, y]) => [-x, y]);
  }

  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  result = result.map(([x, y]) => [
    x * cos - y * sin,
    x * sin + y * cos,
  ]);

  result = result.map(([x, y]) => [x + position.x, y + position.y]);

  return result;
}

function isInBoundsRelative(
  polygon: number[][],
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): boolean {
  for (const [x, y] of polygon) {
    if (x < minX || y < minY || x > maxX || y > maxY) return false;
  }
  return true;
}

export function isRotationValid(rotation: number): boolean {
  const normalized = ((rotation % 360) + 360) % 360;
  return ALLOWED_ROTATIONS.some(
    (allowed) => Math.abs(normalized - allowed) <= TOLERANCE.ROTATION
  );
}

function orient(a: number[], b: number[], c: number[]): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

export function polygonsOverlap(
  poly1: number[][],
  poly2: number[][]
): boolean {
  // Containment: a vertex strictly inside the other polygon means overlap.
  for (const v of poly1) if (isPointInPolygon(v, poly2)) return true;
  for (const v of poly2) if (isPointInPolygon(v, poly1)) return true;

  // Proper crossings: an edge of one polygon strictly crosses an edge of the
  // other. Touching (shared vertex, shared edge, T-junction where a vertex
  // rests on an edge) is NOT an overlap — every valid tiling relies on it.
  for (let i = 0; i < poly1.length; i++) {
    const a = poly1[i];
    const b = poly1[(i + 1) % poly1.length];
    for (let j = 0; j < poly2.length; j++) {
      const c = poly2[j];
      const d = poly2[(j + 1) % poly2.length];
      if (segmentsProperlyCross(a, b, c, d)) return true;
    }
  }
  return false;
}

function isPointInPolygon(point: number[], polygon: number[][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const onBoundary =
      Math.abs(pointSegDistance(point, polygon[i], polygon[j])) <= TOLERANCE.EDGE_MATCH &&
      pointWithinBBox(point, polygon[i], polygon[j]);
    if (onBoundary) return false; // resting on the boundary is touching, not containment
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function pointWithinBBox(p: number[], a: number[], b: number[]): boolean {
  return (
    p[0] >= Math.min(a[0], b[0]) - TOLERANCE.EDGE_MATCH &&
    p[0] <= Math.max(a[0], b[0]) + TOLERANCE.EDGE_MATCH &&
    p[1] >= Math.min(a[1], b[1]) - TOLERANCE.EDGE_MATCH &&
    p[1] <= Math.max(a[1], b[1]) + TOLERANCE.EDGE_MATCH
  );
}

function pointSegDistance(p: number[], a: number[], b: number[]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function segmentsProperlyCross(
  a: number[],
  b: number[],
  c: number[],
  d: number[]
): boolean {
  // Dataset vertices are float-sloppy (~1e-3): pieces that share an edge do not
  // store identical coordinates. Any touching — shared vertex, shared edge, or
  // T-junction where a vertex rests on an edge — is legitimate in a tiling and
  // must not count as a crossing. Only edges whose endpoints stay clear of the
  // other segment can genuinely cross.
  if (
    pointSegDistance(a, c, d) <= TOLERANCE.EDGE_MATCH ||
    pointSegDistance(b, c, d) <= TOLERANCE.EDGE_MATCH ||
    pointSegDistance(c, a, b) <= TOLERANCE.EDGE_MATCH ||
    pointSegDistance(d, a, b) <= TOLERANCE.EDGE_MATCH
  ) {
    return false;
  }
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  const strad1 = (o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0);
  const strad2 = (o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0);
  return strad1 && strad2;
}

export function verticesMatch(
  poly1: number[][],
  poly2: number[][],
  tolerance: number = TOLERANCE.POSITION
): boolean {
  if (poly1.length !== poly2.length) return false;

  for (const [x1, y1] of poly1) {
    let found = false;
    for (const [x2, y2] of poly2) {
      const dist = Math.hypot(x2 - x1, y2 - y1);
      if (dist <= tolerance) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

export function getInterchangeableGroups(): string[][] {
  return [
    ['baseTriangle1', 'baseTriangle2'],
    ['smallTriangle1', 'smallTriangle2'],
  ];
}

export function areInterchangeable(id1: string, id2: string): boolean {
  const groups = getInterchangeableGroups();
  return groups.some((g) => g.includes(id1) && g.includes(id2));
}

export function checkCoverage(
  piecePolygons: number[][][],
  targetPolygon: number[][]
): { covered: boolean; coverageRatio: number; errors: string[] } {
  const errors: string[] = [];

  const targetArea = polygonArea(targetPolygon);
  let unionArea = 0;
  for (const poly of piecePolygons) {
    unionArea += polygonArea(poly);
  }

  const coverageRatio = targetArea > 0 ? unionArea / targetArea : 0;

  if (Math.abs(coverageRatio - 1) > TOLERANCE.COVERAGE) {
    errors.push(
      `Piece area sum ${unionArea.toFixed(2)} != target area ${targetArea.toFixed(2)} (ratio: ${coverageRatio.toFixed(4)})`
    );
  }

  return {
    covered: errors.length === 0,
    coverageRatio,
    errors,
  };
}

export async function verifyPuzzleSolution(
  request: VerificationRequest
): Promise<VerificationResult> {
  const errors: string[] = [];
  const pieceResults: PieceVerificationResult[] = [];

  const puzzle = await TangramPuzzle.findOne({ puzzleId: request.puzzleId }).lean();
  if (!puzzle) {
    return {
      valid: false,
      accuracy: 0,
      piecesCorrect: 0,
      totalPieces: 7,
      pieceResults: [],
      errors: ['Puzzle not found'],
    };
  }

  const targetPolygons = puzzle.individualPiecePolygons as number[][][];
  const targetIds = puzzle.pieceShapeIds as string[];

  // Puzzles are stored in their own local coordinate frame — dataset tilings
  // live in different quadrants (some around [0,10], others around [-20,0]) —
  // so bounds are relative to the puzzle's own tiling, not a fixed canvas.
  const fullPolygon = puzzle.fullPolygon as number[][] | undefined;
  let bboxMinX = -Infinity;
  let bboxMinY = -Infinity;
  let bboxMaxX = Infinity;
  let bboxMaxY = Infinity;
  if (fullPolygon && fullPolygon.length > 0) {
    bboxMinX = Math.min(...fullPolygon.map((v) => v[0])) - TOLERANCE.POSITION;
    bboxMinY = Math.min(...fullPolygon.map((v) => v[1])) - TOLERANCE.POSITION;
    bboxMaxX = Math.max(...fullPolygon.map((v) => v[0])) + TOLERANCE.POSITION;
    bboxMaxY = Math.max(...fullPolygon.map((v) => v[1])) + TOLERANCE.POSITION;
  }

  const claimedSlots = new Set<number>();
  let correctCount = 0;

  const allTransformed = request.pieceStates.map((state) => {
    const idx = targetIds.indexOf(state.pieceId);
    const originalPolygon = idx >= 0 ? targetPolygons[idx] : [];
    return transformPolygon(originalPolygon, state.position, state.rotation, state.flipped);
  });

  for (let pi = 0; pi < request.pieceStates.length; pi++) {
    const state = request.pieceStates[pi];
    const transformedPolygon = allTransformed[pi];

    const validIndices = targetIds
      .map((id: string, idx: number) => {
        if (id === state.pieceId) return idx;
        if (areInterchangeable(id, state.pieceId)) return idx;
        return -1;
      })
      .filter((idx: number) => idx !== -1);

    let pieceCorrect = false;
    for (const targetIdx of validIndices) {
      if (claimedSlots.has(targetIdx)) continue;
      const target = targetPolygons[targetIdx];
      if (verticesMatch(transformedPolygon, target)) {
        pieceCorrect = true;
        claimedSlots.add(targetIdx);
        break;
      }
    }

    if (pieceCorrect) correctCount++;

    const inBounds = isInBoundsRelative(transformedPolygon, bboxMinX, bboxMinY, bboxMaxX, bboxMaxY);
    const correctRotation = isRotationValid(state.rotation);

    let overlaps = false;
    for (let j = 0; j < allTransformed.length; j++) {
      if (j === pi) continue;
      if (polygonsOverlap(transformedPolygon, allTransformed[j])) {
        overlaps = true;
        break;
      }
    }

    pieceResults.push({
      pieceId: state.pieceId,
      correct: pieceCorrect,
      positionMatch: pieceCorrect,
      rotationMatch: correctRotation,
      error: pieceCorrect ? undefined : 'Position/rotation mismatch',
    });

    if (!inBounds) errors.push(`${state.pieceId}: out of bounds`);
    if (!correctRotation) errors.push(`${state.pieceId}: invalid rotation`);
    if (overlaps) errors.push(`${state.pieceId}: overlaps another piece`);
  }

  const coverageCheck = checkCoverage(allTransformed, puzzle.fullPolygon as number[][]);
  if (!coverageCheck.covered) errors.push(...coverageCheck.errors);

  const accuracy = Math.round((correctCount / request.pieceStates.length) * 100);

  return {
    valid: correctCount === request.pieceStates.length && errors.length === 0,
    accuracy,
    piecesCorrect: correctCount,
    totalPieces: request.pieceStates.length,
    pieceResults,
    errors,
  };
}
