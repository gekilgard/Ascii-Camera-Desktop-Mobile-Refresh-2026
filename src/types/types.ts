export interface AsciiSettings {
    resolution: number
    fontSize: number
    contrast: number
    brightness: number
    /** 0 = grayscale … 100 = natural … 200 = stronger color (see adjustSaturationRgb). */
    saturation: number
    /** Hue shift in degrees; 0 = unchanged. Only applied when color mode is on. */
    hue: number
    colorMode: boolean
    invert: boolean
    characterSet: 'ascii' | 'dither' | 'solidBlocks' | 'matrix' | 'gek' | 'corporate'
}

/** Slider + toggles applied when picking a filter (Resolution slider = fontSize). */
export type FilterPresetValues = Pick<
    AsciiSettings,
    'fontSize' | 'contrast' | 'brightness' | 'saturation' | 'hue' | 'colorMode' | 'invert'
>

export const FILTER_PRESETS: Record<AsciiSettings['characterSet'], FilterPresetValues> = {
    ascii: {
        fontSize: 12,
        contrast: 1.8,
        brightness: 19,
        saturation: 100,
        hue: 0,
        colorMode: false,
        invert: true,
    },
    dither: {
        fontSize: 17,
        contrast: 1.4,
        brightness: 30,
        saturation: 100,
        hue: 0,
        colorMode: false,
        invert: false,
    },
    solidBlocks: {
        fontSize: 27,
        contrast: 0.5,
        brightness: 89,
        saturation: 100,
        hue: 0,
        colorMode: true,
        invert: false,
    },
    matrix: {
        fontSize: 10,
        contrast: 1.1,
        brightness: -76,
        saturation: 100,
        hue: 0,
        colorMode: true,
        invert: false,
    },
    gek: {
        fontSize: 13,
        contrast: 0.8,
        brightness: 5,
        saturation: 100,
        hue: 0,
        colorMode: true,
        invert: true,
    },
    corporate: {
        fontSize: 20,
        contrast: 0.5,
        brightness: -100,
        saturation: 100,
        hue: 0,
        colorMode: false,
        invert: false,
    },
}

export interface AsciiCharacterMap {
    [key: string]: string
}

/** Ramps for text-based modes (solidBlocks uses fillRect, not this string). */
export const CHAR_SETS: AsciiCharacterMap = {
    ascii: ' .:-=+*#%@MB',
    dither: ' ░▒▓█',
    solidBlocks: ' █',
    matrix: ' 01',
    gek: ' gekGEK',
    corporate: ' ©®™℠℗§¶†‡•…※⌘',
}

export const CHARACTER_SET_OPTIONS: { id: AsciiSettings['characterSet']; label: string }[] = [
    { id: 'ascii', label: 'ASCII' },
    { id: 'dither', label: 'Dither' },
    { id: 'solidBlocks', label: 'Solid blocks' },
    { id: 'matrix', label: 'Matrix' },
    { id: 'gek', label: 'Gek' },
    { id: 'corporate', label: 'Corporate' },
]

export type CameraFacingMode = 'user' | 'environment'

export type ProcessingStats = {
    fps: number
    renderTime: number
}

export interface AsciiRendererHandle {
    captureImage: () => Promise<string>
    getAsciiText: () => string
    getCanvas: () => HTMLCanvasElement | null
}
