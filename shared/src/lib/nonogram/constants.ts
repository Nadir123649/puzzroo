// Nonogram Constants
// Centralized values for colors, sizes, and visual styling

// Grid Colors (matching Puzzroo design system)
export const COLORS = {
  // Cell states
  cellDefault: '#FFFFFF',
  cellHover: '#E8F0FF',
  cellFilled: '#2F6FED',
  cellCrossed: '#A0A4B8',
  
  // Grid lines
  thinGridLine: '#D0D3DC',
  thickGridLine: '#2B2F3A',
  
  // Background
  background: '#F5F6FA',
  
  // Clues
  clueDefault: '#2B2F3A',
  clueActive: '#2F6FED',
  clueCompleted: '#2F6FED',
} as const

// Grid sizing
export const GRID_CONFIG = {
  // Cell size in pixels
  cellSize: 32,
  cellSizeMobile: 24,
  
  // Border widths
  thinBorder: 1,
  thickBorder: 3,
  
  // 5x5 grouping for visual clarity
  groupSize: 5,
  
  // Padding and spacing
  gridPadding: 16,
  cluePadding: 8,
} as const

// Supported grid sizes
export const VALID_GRID_SIZES = [10, 15, 20] as const
