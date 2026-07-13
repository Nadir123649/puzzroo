import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Puzzroo',
    short_name: 'Puzzroo',
    description: 'Solve premium daily Sudoku, Nonogram, CrossMath, and Tangram puzzles.',
    start_url: '/',
    display: 'standalone',
    background_color: '#181A20',
    theme_color: '#6949FF',
    icons: [
      {
        src: '/logo-icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  }
}
