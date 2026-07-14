import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines multiple class names and resolves conflicting Tailwind CSS classes.
 * Useful for building reusable and customizable UI elements.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Centralized image exports from public folder
 * Add your images to /public folder and export them here
 */
export const images = {
  // Logo
  logo: '/logo-icon.svg',
  logoLight: '/logo-light.svg',
  logoDark: '/logo-dark.svg',

  // Hero Section
  heroImage: '/hero-image.svg',
  heroMobile: '/hero-mobile.png',
  heroImageAlt: 'Puzzroo - Timeless Games. Modern Play. Play For Free.',

  // About Section
  aboutImage: '/about-image.jpg',
  aboutImageAlt: 'About Puzzroo - Next.js Template',

  // Features Icons
  featureIcon1: '/icons/lightning.svg',
  featureIcon2: '/icons/design.svg',
  featureIcon3: '/icons/dark-mode.svg',
  featureIcon4: '/icons/mobile.svg',
  featureIcon5: '/icons/seo.svg',
  featureIcon6: '/icons/typescript.svg',

  // Social/OG Images
  ogImage: '/og-image.jpg',
  twitterImage: '/twitter-image.jpg',

  // Theme Icons
  darkIcon: '/dark.svg',
  starIcon: '/star.svg',
  checkIcon: '/check.svg',
  dropdownIcon: '/dropdown.svg',

  // Feature Section
  featureBackground: '/feature-background.svg',
  featureStars: '/feature-right.svg',
  featureMobile: '/feature-mobile.png',

  // Game Cards
  gameCards: {
    numberNinja: '/number-ninja.svg',
    numberNinjaWhite: '/number-ninja-white.svg',
    crossWord: '/cross-world.svg',
    crossWordIcon: '/cross-icon.svg',
    sudoku: '/soduko.svg',
    kakuro: '/kakuro.svg',
    dotsMatch: '/dots-match.svg',
    nonogram: '/nonogram.svg',
    nonogramWhite: '/nonogram-white.svg',
    tangram: '/kakuro.svg',
  },

  // Placeholders
  placeholder: '/placeholder.jpg',

  // Icons
  icons: {
    sun: '/icons/sun.svg',
    moon: '/icons/moon.svg',
    menu: '/icons/menu.svg',
    close: '/icons/close.svg',
    arrow: '/icons/arrow.svg',
  },
  
  // Game Icons
  bulb: '/Bulb.svg',
  eraser: '/Eraser.svg',
  edit: '/Edit.svg',
  arrowCounterClockwise: '/Arrow Counter Clockwise.svg',
} as const

// Image dimensions for optimization
export const imageDimensions = {
  hero: { width: 1322, height: 352 },
  heroMobile: { width: 382, height: 167 },
  about: { width: 800, height: 800 },
  og: { width: 1200, height: 630 },
  twitter: { width: 1200, height: 630 },
  icon: { width: 64, height: 64 },
  logo: { width: 32, height: 32 },
  themeIcon: { width: 20, height: 20 },
  starIcon: { width: 24, height: 24 },
  gameCard: { width: 337, height: 337 },
  checkIcon: { width: 32, height: 32 },
  featureImage: { width: 359, height: 559 },
  featureMobile: { width: 395, height: 152 },
} as const

/**
 * Only allow keys whose values are strings.
 * This excludes nested objects like `gameCards` and `icons`.
 */
type ImageKey = {
  [K in keyof typeof images]: typeof images[K] extends string ? K : never
}[keyof typeof images]

/**
 * Helper function to get image with fallback
 */
export function getImage(
  key: ImageKey,
  fallback: string = images.placeholder
): string {
  return images[key] || fallback
}