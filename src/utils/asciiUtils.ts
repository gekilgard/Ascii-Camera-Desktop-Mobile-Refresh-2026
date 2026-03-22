/**
 * Pre-calculates a lookup table for brightness to character mapping
 */
export const createBrightnessMap = (chars: string): string[] => {
    const map: string[] = []
    const len = chars.length
    for (let i = 0; i < 256; i++) {
        const index = Math.floor((i / 256) * len)
        map[i] = chars[Math.min(index, len - 1)]
    }
    return map
}

/**
 * Adjusts color values based on brightness and contrast settings.
 *
 * formula: factor * (color - 128) + 128 + brightness
 */
export const adjustColor = (val: number, contrast: number, brightness: number): number => {
    const v = contrast * (val - 128) + 128 + brightness
    return Math.max(0, Math.min(255, v))
}

export const getChar = (brightness: number, map: string[], invert: boolean): string => {
    const index = invert ? 255 - brightness : brightness
    // Clamp index just in case
    const safeIndex = Math.max(0, Math.min(255, Math.floor(index)))
    return map[safeIndex]
}

/**
 * Converts RGB to Grayscale Luminance
 */
export const getLuminance = (r: number, g: number, b: number): number => {
    return 0.299 * r + 0.587 * g + 0.114 * b
}

/**
 * Scale chroma relative to luminance. 100 = unchanged, 0 = grayscale, 200 = ~2× saturation.
 */
export const adjustSaturationRgb = (
    r: number,
    g: number,
    b: number,
    saturationPercent: number,
): [number, number, number] => {
    const t = saturationPercent / 100
    const l = getLuminance(r, g, b)
    const blend = (c: number) => l + (c - l) * t
    return [
        Math.max(0, Math.min(255, Math.round(blend(r)))),
        Math.max(0, Math.min(255, Math.round(blend(g)))),
        Math.max(0, Math.min(255, Math.round(blend(b)))),
    ]
}

/** H,S,L each 0–1 */
function rgbToHsl(r255: number, g255: number, b255: number): [number, number, number] {
    const r = r255 / 255
    const g = g255 / 255
    const b = b255 / 255
    const max = Math.max(r, g, b)
    const min = Math.min(r, g, b)
    const l = (max + min) / 2
    let h = 0
    let s = 0

    if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6
                break
            case g:
                h = ((b - r) / d + 2) / 6
                break
            default:
                h = ((r - g) / d + 4) / 6
                break
        }
    }
    return [h, s, l]
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r: number
    let g: number
    let b: number

    if (s === 0) {
        r = g = b = l
    } else {
        const hue2rgb = (p: number, q: number, t: number) => {
            let tt = t
            if (tt < 0) tt += 1
            if (tt > 1) tt -= 1
            if (tt < 1 / 6) return p + (q - p) * 6 * tt
            if (tt < 1 / 2) return q
            if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6
            return p
        }
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s
        const p = 2 * l - q
        r = hue2rgb(p, q, h + 1 / 3)
        g = hue2rgb(p, q, h)
        b = hue2rgb(p, q, h - 1 / 3)
    }
    return [
        Math.max(0, Math.min(255, Math.round(r * 255))),
        Math.max(0, Math.min(255, Math.round(g * 255))),
        Math.max(0, Math.min(255, Math.round(b * 255))),
    ]
}

/** Rotate hue in degrees (-180…180 typical). 0 = no change. */
export const adjustHueRgb = (
    r: number,
    g: number,
    b: number,
    hueShiftDegrees: number,
): [number, number, number] => {
    if (hueShiftDegrees === 0) {
        return [Math.round(r), Math.round(g), Math.round(b)]
    }
    const [h, s, l] = rgbToHsl(r, g, b)
    let nh = h + hueShiftDegrees / 360
    nh -= Math.floor(nh)
    return hslToRgb(nh, s, l)
}

/** Saturation then hue. Used when color mode is on; pass 100 / 0 when off for identity. */
export const applySaturationAndHue = (
    r: number,
    g: number,
    b: number,
    saturationPercent: number,
    hueShiftDegrees: number,
): [number, number, number] => {
    const [rs, gs, bs] = adjustSaturationRgb(r, g, b, saturationPercent)
    return adjustHueRgb(rs, gs, bs, hueShiftDegrees)
}
