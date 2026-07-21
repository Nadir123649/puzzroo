export type BoardThemeId = 'classic' | 'green' | 'brown' | 'dark'

export interface BoardThemeConfig {
  id: BoardThemeId
  name: string
  lightSquareHex: string
  darkSquareHex: string
  boardBorderColor: string
  coordinateColorLightHex: string
  coordinateColorDarkHex: string
  accent: string
  previewLight: string
  previewDark: string
}

export const BOARD_THEMES: Record<BoardThemeId, BoardThemeConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic Wood',
    lightSquareHex: '#F0D9B5',
    darkSquareHex: '#B58863',
    boardBorderColor: '#8B5A2B',
    coordinateColorLightHex: '#B58863',
    coordinateColorDarkHex: '#F0D9B5',
    accent: '#8B5A2B',
    previewLight: '#F0D9B5',
    previewDark: '#B58863',
  },
  green: {
    id: 'green',
    name: 'Tournament Green',
    lightSquareHex: '#EEEED2',
    darkSquareHex: '#769656',
    boardBorderColor: '#4E6738',
    coordinateColorLightHex: '#769656',
    coordinateColorDarkHex: '#EEEED2',
    accent: '#769656',
    previewLight: '#EEEED2',
    previewDark: '#769656',
  },
  brown: {
    id: 'brown',
    name: 'Warm Hazel',
    lightSquareHex: '#EAE0D5',
    darkSquareHex: '#C0A080',
    boardBorderColor: '#7F5539',
    coordinateColorLightHex: '#C0A080',
    coordinateColorDarkHex: '#EAE0D5',
    accent: '#C0A080',
    previewLight: '#EAE0D5',
    previewDark: '#C0A080',
  },
  dark: {
    id: 'dark',
    name: 'Puzzroo Dark',
    lightSquareHex: '#4A4E5A',
    darkSquareHex: '#262A34',
    boardBorderColor: '#6949FF',
    coordinateColorLightHex: '#8F94A0',
    coordinateColorDarkHex: '#D0D3DA',
    accent: '#6949FF',
    previewLight: '#4A4E5A',
    previewDark: '#262A34',
  },
}

export function getBoardTheme(themeId: BoardThemeId = 'classic'): BoardThemeConfig {
  return BOARD_THEMES[themeId] || BOARD_THEMES.classic
}
