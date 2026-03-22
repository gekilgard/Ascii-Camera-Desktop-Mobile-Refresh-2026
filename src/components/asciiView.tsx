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

                const tempCanvas = document.createElement('canvas')
                tempCanvas.width = imageSpecs.wdith
                tempCanvas.height = imageSpecs.height

                const tempCtx = tempCanvas.getContext('2d', { alpha: false })

                const charsX = Math.floor(canvasSize.width / settings.fontSize)
                const charsY = Math.floor(canvasSize.height / settings.fontSize)

                if (charsX <= 0 || charsY <= 0) throw new Error('Invalid character dimensions')

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
                tempCtx.fillRect(0, 0, imageSpecs.wdith, imageSpecs.height)
                tempCtx.font = `${imageSpecs.fontSize}px monospace`
                tempCtx.textBaseline = 'top'

                const brightnessMap = createBrightnessMap(ramp)
                const dither = isDitherMode(settings.characterSet)

                for (let i = 0; i < charsX * charsY; i++) {
                    const xPos = (i % charsX) * imageSpecs.fontSize
                    const yPos = Math.floor(i / charsX) * imageSpecs.fontSize

                    const r = pixels[i * 4]
                    const g = pixels[i * 4 + 1]
                    const b = pixels[i * 4 + 2]

                    let l = getLuminance(r, g, b)
                    l = adjustColor(l, settings.contrast, settings.brightness)

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
                        tempCtx.fillStyle = `rgb(${r},${g},${b})`
                    } else {
                        tempCtx.fillStyle = settings.invert ? '#ffffff' : '#000000'
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

                const srcW = Math.floor(canvasSize.width / fontScale)
                const srcH = Math.floor(canvasSize.height / fontScale)

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

                const cssW = srcW * fontScale
                const cssH = srcH * fontScale
                canvas.width = cssW * dpr
                canvas.height = cssH * dpr
                canvas.style.width = `${cssW}px`
                canvas.style.height = `${cssH}px`

                const ctx = canvas.getContext('2d', { alpha: false })
                if (!ctx) {
                    animationIdRef.current = requestAnimationFrame(t => renderCanvas(t))
                    return
                }

                ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
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
                            ctx.fillStyle = `rgb(${r},${g},${b})`
                        } else {
                            ctx.fillStyle = invert ? '#ffffff' : '#000000'
                        }

                        ctx.fillText(char, x, y)
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
                            ctx.fillStyle = `rgb(${r},${g},${b})`
                        } else {
                            ctx.fillStyle = invert ? '#ffffff' : '#000000'
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
                <div className="h-screen w-screen -z-10 flex justify-center items-center">
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
                        className="bg-transparent -z-10"
                    />
                </div>
            </>
        )
    },
)

export default memo(AsciiView)
