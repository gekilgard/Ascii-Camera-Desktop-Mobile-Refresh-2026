import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef } from 'react'
import { AsciiRendererHandle, AsciiSettings, CHAR_SETS, ProcessingStats } from '../types/types'
import { adjustColor, createBrightnessMap, getChar, getLuminance } from '../utils/asciiUtils'

interface AsciiViewProps {
    settings: AsciiSettings
    stream: MediaStream | null
    uploadedMedia: HTMLImageElement | HTMLVideoElement | null
    onStatsUpdate: (status: ProcessingStats) => void
    canvasSize: {
        width: number
        height: number
    }
}

const BAYER_4X4 = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
]

const isDitherMode = (charSet: string) => charSet === 'dither'
const isSolidBlocksMode = (charSet: string) => charSet === 'solidBlocks'

/** Quantize 0–255 into 5 solid levels for mosaic tiles. */
const quantizeBlockLevel = (l: number): number => {
    const step = Math.round((l / 255) * 4)
    return Math.round((step / 4) * 255)
}

/** True square cells that tile the viewport (no skinny rects from W/H mismatch). */
function squareBlockGrid(
    canvasW: number,
    canvasH: number,
    targetCell: number,
): { cols: number; rows: number; cell: number; cssW: number; cssH: number } {
    const cols = Math.max(1, Math.floor(canvasW / targetCell))
    const rows = Math.max(1, Math.floor(canvasH / targetCell))
    const cell = Math.floor(Math.min(canvasW / cols, canvasH / rows))
    return { cols, rows, cell, cssW: cols * cell, cssH: rows * cell }
}

function getMonochromeForeground(
    characterSet: AsciiSettings['characterSet'],
    invert: boolean,
): string {
    if (characterSet === 'matrix') return invert ? '#14532d' : '#00ff00'
    return invert ? '#ffffff' : '#000000'
}

/** Matrix look: characters use green channel only (grayscale luma → G). */
function matrixGreenFromLuma(l: number, invert: boolean): string {
    const v = Math.max(0, Math.min(255, Math.round(l)))
    const g = invert ? Math.round(v * 0.35) : v
    return `rgb(0,${g},0)`
}

const AsciiView = forwardRef<AsciiRendererHandle, AsciiViewProps>(
    ({ settings, stream, uploadedMedia, onStatsUpdate, canvasSize }, ref) => {
        const videoRef = useRef<HTMLVideoElement>(null)
        const canvasRef = useRef<HTMLCanvasElement>(null)
        const hiddenCanvasRef = useRef<HTMLCanvasElement>(null)
        const lastTimeRef = useRef<number>(0)
        const animationIdRef = useRef<number | null>(null)
        const prevFrameRef = useRef<Float32Array | null>(null)
        const frameCountRef = useRef(0)

        const ramp = CHAR_SETS[settings.characterSet]

        const DITHER_CHARS = [' ', '·', ':', '░', '▒', '▓', '█']
        const TRAIL_BLEND = 0.25

        const getDrawSource = useCallback((): HTMLImageElement | HTMLVideoElement | null => {
            if (uploadedMedia) return uploadedMedia
            return videoRef.current
        }, [uploadedMedia])

        const isSourceReady = useCallback(
            (src: HTMLImageElement | HTMLVideoElement | null): boolean => {
                if (!src) return false
                if (src instanceof HTMLImageElement) return src.complete && src.naturalWidth > 0
                return src.readyState >= 2
            },
            [],
        )

        useImperativeHandle(ref, () => ({
            getCanvas: () => canvasRef.current,

            captureImage: async () => {
                const source = getDrawSource()
                if (!source || !isSourceReady(source)) throw new Error('Source not ready')

                const scaleFactor = 4
                const imageSpecs = {
                    height: canvasSize.height * scaleFactor,
                    wdith: canvasSize.width * scaleFactor,
                    fontSize: settings.fontSize * scaleFactor,
                }

                if (imageSpecs.height <= 0 || imageSpecs.wdith <= 0)
                    throw new Error('Invalid capture dimensions')

                const solidBlocks = isSolidBlocksMode(settings.characterSet)
                const grid = solidBlocks
                    ? squareBlockGrid(canvasSize.width, canvasSize.height, settings.fontSize)
                    : null

                const charsX = solidBlocks
                    ? grid!.cols
                    : Math.floor(canvasSize.width / settings.fontSize)
                const charsY = solidBlocks
                    ? grid!.rows
                    : Math.floor(canvasSize.height / settings.fontSize)

                if (charsX <= 0 || charsY <= 0) throw new Error('Invalid character dimensions')

                const exportCell = solidBlocks ? grid!.cell * scaleFactor : imageSpecs.fontSize

                const tempCanvas = document.createElement('canvas')
                tempCanvas.width = solidBlocks ? charsX * exportCell : imageSpecs.wdith
                tempCanvas.height = solidBlocks ? charsY * exportCell : imageSpecs.height

                const tempCtx = tempCanvas.getContext('2d', { alpha: false })

                const analysisCanvas = document.createElement('canvas')
                analysisCanvas.height = charsY
                analysisCanvas.width = charsX
                const analysisCtx = analysisCanvas.getContext('2d')

                if (!tempCtx || !analysisCtx) throw new Error('Canvas initialization failed')

                analysisCtx.drawImage(source, 0, 0, charsX, charsY)

                const imageData = analysisCtx.getImageData(0, 0, charsX, charsY)
                const pixels = imageData.data

                tempCtx.imageSmoothingEnabled = false
                tempCtx.fillStyle = settings.invert ? '#000000' : '#ffffff'
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
                tempCtx.font = `${imageSpecs.fontSize}px monospace`
                tempCtx.textBaseline = 'top'

                const brightnessMap = createBrightnessMap(ramp)
                const dither = isDitherMode(settings.characterSet)

                for (let i = 0; i < charsX * charsY; i++) {
                    const xPos = (i % charsX) * exportCell
                    const yPos = Math.floor(i / charsX) * exportCell

                    const r = pixels[i * 4]
                    const g = pixels[i * 4 + 1]
                    const b = pixels[i * 4 + 2]

                    let l = getLuminance(r, g, b)
                    l = adjustColor(l, settings.contrast, settings.brightness)

                    if (solidBlocks) {
                        if (settings.colorMode) {
                            const ra = adjustColor(r, settings.contrast, settings.brightness)
                            const ga = adjustColor(g, settings.contrast, settings.brightness)
                            const ba = adjustColor(b, settings.contrast, settings.brightness)
                            tempCtx.fillStyle = `rgb(${Math.round(ra)},${Math.round(ga)},${Math.round(ba)})`
                        } else {
                            const q = quantizeBlockLevel(settings.invert ? 255 - l : l)
                            tempCtx.fillStyle = `rgb(${q},${q},${q})`
                        }
                        tempCtx.fillRect(xPos, yPos, exportCell, exportCell)
                        continue
                    }

                    let char: string
                    if (dither) {
                        const bx = (i % charsX) % 4
                        const by = Math.floor(i / charsX) % 4
                        const threshold = (BAYER_4X4[by][bx] / 16) * 255
                        const val = settings.invert ? 255 - l : l
                        const dithered = val > threshold ? l : 0
                        const idx = Math.floor((dithered / 255) * (DITHER_CHARS.length - 1))
                        char = DITHER_CHARS[Math.min(idx, DITHER_CHARS.length - 1)]
                    } else {
                        char = getChar(l, brightnessMap, settings.invert)
                    }

                    if (settings.colorMode) {
                        tempCtx.fillStyle =
                            settings.characterSet === 'matrix'
                                ? matrixGreenFromLuma(l, settings.invert)
                                : `rgb(${r},${g},${b})`
                    } else {
                        tempCtx.fillStyle = getMonochromeForeground(
                            settings.characterSet,
                            settings.invert,
                        )
                    }

                    tempCtx.fillText(char, xPos, yPos)
                }

                return tempCanvas.toDataURL('image/png')
            },

            getAsciiText: () => {
                const source = getDrawSource()
                if (!source || !isSourceReady(source)) return ''

                const tempCanvas = document.createElement('canvas')
                const standardWidth = 150
                const sw =
                    source instanceof HTMLImageElement ? source.naturalWidth : source.videoWidth
                const sh =
                    source instanceof HTMLImageElement ? source.naturalHeight : source.videoHeight
                if (!sw || !sh) return ''
                const aspectRatio = sh / sw
                const standardHeight = Math.max(1, Math.floor(standardWidth * aspectRatio * 0.55))

                tempCanvas.width = standardWidth
                tempCanvas.height = standardHeight

                const tempCtx = tempCanvas.getContext('2d')
                if (!tempCtx) return ''

                tempCtx.drawImage(source, 0, 0, standardWidth, standardHeight)
                const imageData = tempCtx.getImageData(0, 0, standardWidth, standardHeight)
                const pixels = imageData.data

                const brightnessMap = createBrightnessMap(ramp)

                let copyContent = ''

                for (let y = 0; y < standardHeight; y++) {
                    for (let x = 0; x < standardWidth; x++) {
                        const idx = (y * standardWidth + x) * 4
                        const l = getLuminance(pixels[idx], pixels[idx + 1], pixels[idx + 2])
                        const adjL = adjustColor(l, settings.contrast, settings.brightness)
                        const char = getChar(adjL, brightnessMap, settings.invert)

                        copyContent += char
                    }
                    copyContent += '\n'
                }
                return copyContent
            },
        }))

        const renderCanvas = useCallback(
            (time: number) => {
                const startRender = performance.now()
                const delta = time - lastTimeRef.current
                lastTimeRef.current = time
                const fps = 1000 / delta

                const source = getDrawSource()
                const canvas = canvasRef.current
                if (!canvas || !source || !isSourceReady(source)) {
                    animationIdRef.current = requestAnimationFrame(t => renderCanvas(t))
                    return
                }

                const dpr = window.devicePixelRatio || 1
                const fontScale = settings.fontSize || 10
                const solidBlocks = isSolidBlocksMode(settings.characterSet)
                const blockGrid = solidBlocks
                    ? squareBlockGrid(canvasSize.width, canvasSize.height, fontScale)
                    : null

                const srcW = solidBlocks
                    ? blockGrid!.cols
                    : Math.floor(canvasSize.width / fontScale)
                const srcH = solidBlocks
                    ? blockGrid!.rows
                    : Math.floor(canvasSize.height / fontScale)
                const cellSize = solidBlocks ? blockGrid!.cell : fontScale

                if (srcW <= 0 || srcH <= 0) {
                    animationIdRef.current = requestAnimationFrame(t => renderCanvas(t))
                    return
                }

                if (!hiddenCanvasRef.current) {
                    animationIdRef.current = requestAnimationFrame(t => renderCanvas(t))
                    return
                }

                if (hiddenCanvasRef.current) {
                    if (
                        hiddenCanvasRef.current.width !== srcW ||
                        hiddenCanvasRef.current.height !== srcH
                    ) {
                        hiddenCanvasRef.current.width = srcW
                        hiddenCanvasRef.current.height = srcH
                    }
                }

                const hiddenCanvas = hiddenCanvasRef.current
                const hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true })

                if (!hiddenCtx) {
                    animationIdRef.current = requestAnimationFrame(t => renderCanvas(t))
                    return
                }

                try {
                    hiddenCtx.drawImage(source, 0, 0, srcW, srcH)
                } catch {
                    animationIdRef.current = requestAnimationFrame(t => renderCanvas(t))
                    return
                }

                const pixels = hiddenCtx.getImageData(0, 0, srcW, srcH).data

                const brightnessMap = createBrightnessMap(ramp)
                const { contrast, brightness: brightnessOffset, colorMode, invert } = settings
                const dither = isDitherMode(settings.characterSet)

                const cssW = solidBlocks ? blockGrid!.cssW : srcW * fontScale
                const cssH = solidBlocks ? blockGrid!.cssH : srcH * fontScale
                const dispW = canvasSize.width
                const dispH = canvasSize.height

                canvas.width = dispW * dpr
                canvas.height = dispH * dpr
                canvas.style.width = `${dispW}px`
                canvas.style.height = `${dispH}px`

                const ctx = canvas.getContext('2d', { alpha: false })
                if (!ctx) {
                    animationIdRef.current = requestAnimationFrame(t => renderCanvas(t))
                    return
                }

                // Scale ASCII grid to fill viewport (removes letterboxing from fractional cells).
                const sx = (dpr * dispW) / cssW
                const sy = (dpr * dispH) / cssH
                ctx.setTransform(sx, 0, 0, sy, 0, 0)
                ctx.imageSmoothingEnabled = false

                ctx.fillStyle = invert ? '#000000' : '#ffffff'
                ctx.fillRect(0, 0, cssW, cssH)
                ctx.font = `${fontScale}px monospace`
                ctx.textBaseline = 'top'

                const pixelCount = srcW * srcH
                frameCountRef.current++

                if (dither) {
                    const needNewBuffer =
                        !prevFrameRef.current || prevFrameRef.current.length !== pixelCount
                    if (needNewBuffer) {
                        prevFrameRef.current = new Float32Array(pixelCount)
                    }
                    const prevFrame = prevFrameRef.current!

                    for (let i = 0; i < pixelCount; i++) {
                        const r = pixels[i * 4]
                        const g = pixels[i * 4 + 1]
                        const b = pixels[i * 4 + 2]

                        let l = 0.299 * r + 0.587 * g + 0.114 * b
                        if (contrast !== 1.0 || brightnessOffset !== 0) {
                            l = adjustColor(l, contrast, brightnessOffset)
                        }

                        const blended = prevFrame[i] * TRAIL_BLEND + l * (1 - TRAIL_BLEND)
                        prevFrame[i] = blended

                        const bx = (i % srcW) % 4
                        const by = Math.floor(i / srcW) % 4
                        const threshold = (BAYER_4X4[by][bx] / 16) * 255
                        const val = invert ? 255 - blended : blended
                        const dithered = val > threshold ? blended : 0
                        const idx = Math.floor((dithered / 255) * (DITHER_CHARS.length - 1))
                        const char = DITHER_CHARS[Math.min(idx, DITHER_CHARS.length - 1)]

                        const x = (i % srcW) * fontScale
                        const y = Math.floor(i / srcW) * fontScale

                        if (colorMode) {
                            ctx.fillStyle =
                                settings.characterSet === 'matrix'
                                    ? matrixGreenFromLuma(blended, invert)
                                    : `rgb(${r},${g},${b})`
                        } else {
                            ctx.fillStyle = getMonochromeForeground(settings.characterSet, invert)
                        }

                        ctx.fillText(char, x, y)
                    }
                } else if (solidBlocks) {
                    if (prevFrameRef.current) prevFrameRef.current = null

                    for (let i = 0; i < pixelCount; i++) {
                        const r = pixels[i * 4]
                        const g = pixels[i * 4 + 1]
                        const b = pixels[i * 4 + 2]

                        let l = 0.299 * r + 0.587 * g + 0.114 * b
                        if (contrast !== 1.0 || brightnessOffset !== 0) {
                            l = adjustColor(l, contrast, brightnessOffset)
                        }

                        const x = (i % srcW) * cellSize
                        const y = Math.floor(i / srcW) * cellSize

                        if (colorMode) {
                            const ra = adjustColor(r, contrast, brightnessOffset)
                            const ga = adjustColor(g, contrast, brightnessOffset)
                            const ba = adjustColor(b, contrast, brightnessOffset)
                            ctx.fillStyle = `rgb(${Math.round(ra)},${Math.round(ga)},${Math.round(ba)})`
                        } else {
                            const q = quantizeBlockLevel(invert ? 255 - l : l)
                            ctx.fillStyle = `rgb(${q},${q},${q})`
                        }
                        ctx.fillRect(x, y, cellSize, cellSize)
                    }
                } else {
                    if (prevFrameRef.current) prevFrameRef.current = null

                    for (let i = 0; i < pixelCount; i++) {
                        const r = pixels[i * 4]
                        const g = pixels[i * 4 + 1]
                        const b = pixels[i * 4 + 2]

                        let l = 0.299 * r + 0.587 * g + 0.114 * b

                        if (contrast !== 1.0 || brightnessOffset !== 0) {
                            l = adjustColor(l, contrast, brightnessOffset)
                        }

                        const char = getChar(l, brightnessMap, invert)

                        const x = (i % srcW) * fontScale
                        const y = Math.floor(i / srcW) * fontScale

                        if (colorMode) {
                            ctx.fillStyle =
                                settings.characterSet === 'matrix'
                                    ? matrixGreenFromLuma(l, invert)
                                    : `rgb(${r},${g},${b})`
                        } else {
                            ctx.fillStyle = getMonochromeForeground(settings.characterSet, invert)
                        }

                        ctx.fillText(char, x, y)
                    }
                }

                const endRender = performance.now()

                if (Math.random() > 0.95) {
                    onStatsUpdate({ fps, renderTime: endRender - startRender })
                }

                const isStaticImage = uploadedMedia instanceof HTMLImageElement
                if (!isStaticImage) {
                    animationIdRef.current = requestAnimationFrame(t => renderCanvas(t))
                }
            },
            [
                settings,
                canvasSize.height,
                canvasSize.width,
                onStatsUpdate,
                ramp,
                getDrawSource,
                isSourceReady,
                uploadedMedia,
            ],
        )

        useEffect(() => {
            if (uploadedMedia) {
                if (uploadedMedia instanceof HTMLVideoElement) {
                    uploadedMedia.play()
                }
                animationIdRef.current = requestAnimationFrame(t => renderCanvas(t))
                return () => {
                    if (animationIdRef.current !== null) {
                        cancelAnimationFrame(animationIdRef.current)
                    }
                }
            }

            if (!stream) return

            const video = videoRef.current
            if (!video) return

            video.srcObject = stream
            video.play()

            animationIdRef.current = requestAnimationFrame(t => renderCanvas(t))

            return () => {
                if (animationIdRef.current !== null) {
                    cancelAnimationFrame(animationIdRef.current)
                }
            }
        }, [renderCanvas, stream, uploadedMedia])

        // Re-render static images when settings change
        useEffect(() => {
            if (uploadedMedia instanceof HTMLImageElement && isSourceReady(uploadedMedia)) {
                renderCanvas(performance.now())
            }
        }, [settings, uploadedMedia, renderCanvas, isSourceReady])

        return (
            <>
                <div className="pointer-events-none fixed inset-0 -z-10 block h-full w-full min-h-0 min-w-0">
                    <video
                        ref={videoRef}
                        height={'screen'}
                        width={'screen'}
                        style={{ display: 'none' }}
                        playsInline
                        muted
                    />
                    <canvas ref={hiddenCanvasRef} className="hidden -z-10" />
                    <canvas
                        ref={canvasRef}
                        width={canvasSize.width}
                        height={canvasSize.height}
                        className="bg-transparent -z-10 block h-full w-full"
                    />
                </div>
            </>
        )
    },
)

export default memo(AsciiView)
