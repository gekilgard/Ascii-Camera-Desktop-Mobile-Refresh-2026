export interface AsciiSettings {
    resolution: number
    fontSize: number
    contrast: number
    brightness: number
    colorMode: boolean
    invert: boolean
    characterSet: 'standard' | 'simple' | 'blocks' | 'matrix' | 'edges' | 'gek' | 'dither'
}

export interface AsciiCharacterMap {
    [key: string]: string
}

export const CHAR_SETS: AsciiCharacterMap = {
    standard: ' .:-=+*#%@MB',
    simple: ' .+#@',
    blocks: ' ░▒▓█',
    matrix: ' 01',
    edges: '  .,-_~:;=!*#$@',
    gek: ' gekGEK',
    dither: ' ░▒▓█',
}

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
