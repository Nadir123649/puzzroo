import type { PieceValidationInput, PieceValidationOutput, Bounds } from './types';
import { TOLERANCE, ALLOWED_ROTATIONS, BOARD } from './tolerance';
import TangramPuzzle from '../../models/TangramPuzzle';
import type { VerificationRequest, VerificationResult, PieceVerificationResult } from '../types';

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

export function getBounds(polygon: number[][]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of polygon) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

export function isInBounds(
  polygon: number[][],
  canvasWidth: number,
  canvasHeight: number
): boolean {
  for (const [x, y] of polygon) {
    if (
      x < -TOLERANCE.POSITION ||
      y < -TOLERANCE.POSITION ||
      x > canvasWidth + TOLERANCE.POSITION ||
      y > canvasHeight + TOLERANCE.POSITION
    ) {
      return false;
    }
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
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - b[0]);
}

function onSegment(a: number[], b: number[], c: number[]): boolean {
  return (
    Math.min(a[0], b[0]) <= c[0] &&
    c[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= c[1] &&
    c[1] <= Math.max(a[1], b[1])
  );
}

function segmentsIntersect(
  a: number[],
  b: number[],
  c: number[],
  d: number[]
): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);

  if (o1 === 0 && onSegment(a, b, c)) return true;
  if (o2 === 0 && onSegment(a, b, d)) return true;
  if (o3 === 0 && onSegment(c, d, a)) return true;
  if (o4 === 0 && onSegment(c, d, b)) return true;

  return o1 > 0 !== o2 > 0 && o3 > 0 !== o4 > 0;
}

export function polygonsOverlap(
  poly1: number[][],
  poly2: number[][]
): boolean {
  for (let i = 0; i < poly1.length; i++) {
    const a = poly1[i];
    const b = poly1[(i + 1) % poly1.length];
    for (let j = 0; j < poly2.length; j++) {
      const c = poly2[j];
      const d = poly2[(j + 1) % poly2.length];
      if (segmentsIntersect(a, b, c, d)) {
        const sharedEdge =
          (Math.abs(a[0] - c[0]) < TOLERANCE.VERTEX_MATCH &&
            Math.abs(a[1] - c[1]) < TOLERANCE.VERTEX_MATCH &&
            Math.abs(b[0] - d[0]) < TOLERANCE.VERTEX_MATCH &&
            Math.abs(b[1] - d[1]) < TOLERANCE.VERTEX_MATCH) ||
          (Math.abs(a[0] - d[0]) < TOLERANCE.VERTEX_MATCH &&
            Math.abs(a[1] - d[1]) < TOLERANCE.VERTEX_MATCH &&
            Math.abs(b[0] - c[0]) < TOLERANCE.VERTEX_MATCH &&
            Math.abs(b[1] - c[1]) < TOLERANCE.VERTEX_MATCH);
        if (!sharedEdge) return true;
      }
    }
  }
  return false;
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

export function validatePiece(
  input: PieceValidationInput,
  targetPolygons: number[][][],
  canvasWidth: number,
  canvasHeight: number,
  allTransformedPolygons: number[][][]
): PieceValidationOutput {
  const errors: string[] = [];
  const transformed = input.transformedPolygon;

  const inBounds = isInBounds(transformed, canvasWidth, canvasHeight);
  if (!inBounds) errors.push('Piece out of bounds');

  const correctRotation = isRotationValid(input.rotation);
  if (!correctRotation) errors.push(`Invalid rotation: ${input.rotation}`);

  let overlaps = false;
  for (let i = 0; i < allTransformedPolygons.length; i++) {
    const other = allTransformedPolygons[i];
    if (other === transformed) continue;
    if (polygonsOverlap(transformed, other)) {
      overlaps = true;
      errors.push('Piece overlaps with another piece');
      break;
    }
  }

  let positionMatch = false;
  for (const target of targetPolygons) {
    if (verticesMatch(transformed, target)) {
      positionMatch = true;
      break;
    }
  }

  return {
    pieceId: input.pieceId,
    valid: inBounds && correctRotation && !overlaps && positionMatch,
    inBounds,
    correctRotation,
    overlaps,
    positionMatch,
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
  const canvasMeta = puzzle.metadata as { canvasSize?: { width: number; height: number } } | undefined;
  const canvasWidth = canvasMeta?.canvasSize?.width || BOARD.SIZE;
  const canvasHeight = canvasMeta?.canvasSize?.height || BOARD.SIZE;

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

    const inBounds = isInBounds(transformedPolygon, canvasWidth, canvasHeight);
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
