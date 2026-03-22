export interface AsciiSettings {
    resolution: number
    fontSize: number
    contrast: number
    brightness: number
    colorMode: boolean
    invert: boolean
    characterSet: 'standard' | 'simple' | 'dither' | 'solidBlocks' | 'matrix' | 'gek' | 'corporate'
}

export interface AsciiCharacterMap {
    [key: string]: string
}

/** Ramps for text-based modes (solidBlocks uses fillRect, not this string). */
export const CHAR_SETS: AsciiCharacterMap = {
    standard: ' .:-=+*#%@MB',
    simple: ' .+#@',
    dither: ' ░▒▓█',
    solidBlocks: ' █',
    matrix: ' 01',
    gek: ' gekGEK',
    corporate: ' ©®™℠℗§¶†‡•…※⌘',
}

export const CHARACTER_SET_OPTIONS: { id: AsciiSettings['characterSet']; label: string }[] = [
    { id: 'standard', label: 'Standard' },
    { id: 'simple', label: 'Simple' },
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
