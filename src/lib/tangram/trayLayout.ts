/**
 * Tangram Tray Layout Configuration
 * Defines absolute positions for pieces in the tray
 * 
 * Layout uses 2 rows with curated spacing
 * Designed to prevent overlaps, collapse, and scrollbars
 * 
 * Pieces are scaled appropriately for 749px tray width
 */

import { UNIT } from './pieceConfig'
import { TangramPieceType } from '@/types/tangram'
import {
  BOARD_VIRTUAL_WIDTH,
  BOARD_VIRTUAL_HEIGHT,
  LEGACY_Y_SCALE,
  TRAY_HEIGHT,
} from './boardConfig'

/**
 * Tray dimensions
 */
export const TRAY_CONFIG = {
  desktop: {
    width: BOARD_VIRTUAL_WIDTH,
    height: TRAY_HEIGHT,
  },
  mobile: {
    maxWidth: 350,
    aspectRatio: BOARD_VIRTUAL_WIDTH / TRAY_HEIGHT,
  },
}

/**
 * Absolute tray positions for each piece
 * Coordinates are relative to the full 750×493 virtual board container.
 * The tray occupies the bottom part (y: 282 to 493).
 */
export const TRAY_LAYOUT: Record<TangramPieceType, { x: number; y: number; rotation: number }> = {
  // ── ROW 1 ── space-between across 750px (40px outer margins, 144px inner gaps) ──
  // LT1[141] x=40…181 | gap=144 | MT[100] x=325…425 | gap=144 | PAR[141] x=569…710 | right=40
  'large-triangle-1': {
    x: 40,
    y: Math.round(440 * LEGACY_Y_SCALE),
    rotation: 45,
  },
  'medium-triangle': {
    x: 325,   // 40 + 141 + 144
    y: Math.round(450 * LEGACY_Y_SCALE),
    rotation: 45,
  },
  'parallelogram': {
    x: 569,   // 325 + 100 + 144
    y: Math.round(440 * LEGACY_Y_SCALE),
    rotation: 0,
  },

  // ── ROW 2 ── space-between across 750px (40px outer margins, 105px inner gaps) ──
  // ST1[71] x=40…111 | gap=105 | ST2[71] x=216…287 | gap=105 | SQ[71] x=392…463 | gap=105 | LT2[141] x=568…709 | right=41
  'small-triangle-1': {
    x: 40,
    y: Math.round(592 * LEGACY_Y_SCALE),
    rotation: 45,
  },
  'small-triangle-2': {
    x: 216,   // 40 + 71 + 105
    y: Math.round(592 * LEGACY_Y_SCALE),
    rotation: 45,
  },
  'square': {
    x: 392,   // 216 + 71 + 105
    y: Math.round(597 * LEGACY_Y_SCALE),
    rotation: 0,
  },
  'large-triangle-2': {
    x: 568,   // 392 + 71 + 105
    y: Math.round(582 * LEGACY_Y_SCALE),
    rotation: 45,
  },
}

/**
 * Get tray position for a piece
 */
export function getTrayPosition(pieceType: TangramPieceType) {
  return TRAY_LAYOUT[pieceType]
}

/**
 * Get scaled tray positions for mobile
 * Maintains same arrangement, scales proportionally
 */
export function getScaledTrayPosition(pieceType: TangramPieceType, containerWidth: number) {
  const scale = containerWidth / TRAY_CONFIG.desktop.width
  const pos = TRAY_LAYOUT[pieceType]

  return {
    x: pos.x * scale,
    y: pos.y * scale,
    rotation: pos.rotation,
  }
}
