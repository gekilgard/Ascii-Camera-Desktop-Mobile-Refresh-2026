import { useCallback, useEffect, useRef, useState } from 'react'
import AsciiView from './components/asciiView'
import Header from './components/header'
import Settings from './components/settings'
import {
    AsciiRendererHandle,
    AsciiSettings,
    CameraFacingMode,
    FILTER_PRESETS,
    ProcessingStats,
} from './types/types'
import CameraControls, { AppMode } from './components/cameraControls'
import { MdCancel } from 'react-icons/md'
import { getSupportedMediaRecorderMimeType } from './utils/mediaRecorder'

function App() {
    const DEFAULT_SETTIGNS: AsciiSettings = {
        resolution: 0.2,
        ...FILTER_PRESETS.ascii,
        characterSet: 'ascii',
    }

    const [stream, setStream] = useState<MediaStream | null>(null)
    const [settings, setSettings] = useState<AsciiSettings>(DEFAULT_SETTIGNS)
    const [facingMode, setFacingMode] = useState<CameraFacingMode>('user')
    const [isRecording, setIsRecording] = useState<boolean>(false)
    const [stats, setStats] = useState<ProcessingStats>({ fps: 0, renderTime: 0 })
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    })

    const [flash, setFlash] = useState<boolean>(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [error, setError] = useState<string | null>(null)
    const [mode, setMode] = useState<AppMode>('photo')
    const [settingsSliderActive, setSettingsSliderActive] = useState(false)
    const [uploadedMedia, setUploadedMedia] = useState<HTMLImageElement | HTMLVideoElement | null>(
        null,
    )
    const uploadedVideoRef = useRef<HTMLVideoElement | null>(null)

    const asciiRendererRef = useRef<AsciiRendererHandle>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const recordedChunksRef = useRef<Blob[]>([])
    const recordingTimerRef = useRef<number | null>(null)

    useEffect(() => {
        if (mode === 'upload') return

        let active = true
        let currentStream: MediaStream | null = null

        const start = async () => {
            try {
                if (currentStream) {
                    currentStream.getTracks().forEach(t => t.stop())
                }

                const constraints: MediaStreamConstraints = {
                    video: {
                        height: { ideal: 1080 },
                        width: { ideal: 1920 },
                        facingMode,
                    },
                    audio: false,
                }

                const video = await navigator.mediaDevices.getUserMedia(constraints)
                if (!active) {
                    video.getTracks().forEach(t => t.stop())
                    return
                }

                currentStream = video
                setStream(video)
            } catch (err) {
                console.error(err)
                setError('Unable to access camera. Please ensure permissions are granted.')
            }
        }

        start()

        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight })
        }
        window.addEventListener('resize', handleResize)

        return () => {
            active = false
            if (currentStream) {
                currentStream.getTracks().forEach(t => t.stop())
            }
            setStream(null)
            window.removeEventListener('resize', handleResize)
        }
    }, [facingMode, mode])

    const handleModeChange = useCallback(
        (newMode: AppMode) => {
            if (newMode !== 'upload') {
                if (uploadedVideoRef.current) {
                    uploadedVideoRef.current.pause()
                    uploadedVideoRef.current.src = ''
                    uploadedVideoRef.current = null
                }
                setUploadedMedia(null)
            }
            if (newMode === 'upload') {
                if (stream) {
                    stream.getTracks().forEach(t => t.stop())
                    setStream(null)
                }
            }
            setMode(newMode)
        },
        [stream],
    )

    const handleFileUpload = useCallback((file: File) => {
        const url = URL.createObjectURL(file)

        if (uploadedVideoRef.current) {
            uploadedVideoRef.current.pause()
            uploadedVideoRef.current.src = ''
            uploadedVideoRef.current = null
        }

        if (file.type.startsWith('image/')) {
            const img = new Image()
            img.onload = () => setUploadedMedia(img)
            img.src = url
        } else if (file.type.startsWith('video/')) {
            const video = document.createElement('video')
            video.playsInline = true
            video.muted = true
            video.loop = true
            video.onloadeddata = () => {
                setUploadedMedia(video)
                video.play()
            }
            video.src = url
            uploadedVideoRef.current = video
        }
    }, [])

    const toggleCamera = useCallback(() => {
        setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'))
    }, [])

    const takeSnapshot = useCallback(async () => {
        if (!asciiRendererRef.current) return
        setFlash(true)
        setTimeout(() => setFlash(false), 200)

        try {
            const imageUrl = await asciiRendererRef.current.captureImage()
            if (!imageUrl) {
                setFlash(false)
                return
            }
            const a = document.createElement('a')
            a.href = imageUrl
            a.download = `ascii-capture-${Date.now()}.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        } catch (error) {
            console.error('Capture failed', error)
        }
    }, [])

    const saveImage = useCallback(async () => {
        if (!asciiRendererRef.current) return
        setFlash(true)
        setTimeout(() => setFlash(false), 150)

        try {
            const imageUrl = await asciiRendererRef.current.captureImage()
            if (!imageUrl) return
            const a = document.createElement('a')
            a.href = imageUrl
            a.download = `ascii-${Date.now()}.png`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
        } catch (err) {
            console.error('Save failed', err)
            setError('Failed to save image. Please try again.')
        }
    }, [])

    const toggleRecording = useCallback(() => {
        if (isRecording) {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop()

                if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
            }
            setIsRecording(false)
        } else {
            const canvas = asciiRendererRef.current?.getCanvas()
            if (!canvas || !canvas.height || !canvas.width)
                throw new Error('Error while start recording')

            const videoBitsPerSecond = 2500000

            const captureStream = canvas.captureStream(30)

            try {
                const mimeType = getSupportedMediaRecorderMimeType()
                if (!mimeType) {
                    throw new Error('No supported video codec found')
                }

                const options: MediaRecorderOptions = {
                    mimeType,
                    videoBitsPerSecond,
                }

                const recorder = new MediaRecorder(captureStream, options)
                recordedChunksRef.current = []

                recorder.ondataavailable = e => {
                    if (e.data.size > 0) recordedChunksRef.current.push(e.data)
                }

                recorder.onstop = () => {
                    const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `ascii-video-${Date.now()}.webm`
                    document.body.appendChild(a)
                    a.click()
                    document.body.removeChild(a)
                    setRecordingTime(0)
                }

                recorder.start()
                mediaRecorderRef.current = recorder
                setIsRecording(true)

                recordingTimerRef.current = window.setInterval(() => {
                    setRecordingTime(t => t + 1)
                }, 1000)
            } catch (error) {
                console.error('Recording failed to start', error)
                setError('Failed to start recording. Browser might not support this format.')
            }
        }
    }, [isRecording])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    const inverted = settings.invert

    return (
        <div
            className={`h-[100dvh] min-h-[100dvh] w-full overflow-hidden transition-colors duration-300 ${inverted ? 'bg-black' : 'bg-white'}`}
        >
            <Header
                fps={stats.fps}
                renderTime={stats.renderTime}
                width={windowSize.width}
                height={windowSize.height}
                inverted={inverted}
                hidden={settingsSliderActive}
            />

            <Settings
                settings={settings}
                onChange={setSettings}
                inverted={inverted}
                onSettingsSliderActiveChange={setSettingsSliderActive}
            />

            {flash && (
                <div
                    className={`fixed inset-0 z-50 animate-out fade-out duration-150 pointer-events-none ${inverted ? 'bg-black' : 'bg-white'}`}
                />
            )}

            {error && (
                <div
                    className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 px-6 py-4 rounded backdrop-blur animate-in zoom-in duration-200 border ${
                        inverted
                            ? 'bg-black/90 border-white/20 text-white'
                            : 'bg-white/90 border-black/10 text-black'
                    }`}
                >
                    <button
                        onClick={() => setError(null)}
                        className={`absolute top-3 right-3 text-xl leading-none ${inverted ? 'text-white/50 hover:text-white' : 'text-black/40 hover:text-black'}`}
                        aria-label="Close error"
                    >
                        <MdCancel />
                    </button>

                    <div>
                        <h1 className="text-xl mb-3 text-[11px] tracking-[0.2em] uppercase font-light">
                            Error
                        </h1>
                        <p
                            className={`text-sm font-light ${inverted ? 'text-white/70' : 'text-black/60'}`}
                        >
                            {error}
                        </p>
                    </div>
                </div>
            )}

            <div className="fixed inset-0 z-0">
                <AsciiView
                    ref={asciiRendererRef}
                    settings={settings}
                    stream={mode !== 'upload' ? stream : null}
                    uploadedMedia={mode === 'upload' ? uploadedMedia : null}
                    onStatsUpdate={setStats}
                    canvasSize={windowSize}
                />
            </div>

            <CameraControls
                hidden={settingsSliderActive}
                mode={mode}
                onModeChange={handleModeChange}
                onFlip={toggleCamera}
                onShot={takeSnapshot}
                onSave={saveImage}
                onToggleRecording={toggleRecording}
                onFileUpload={handleFileUpload}
                isRecording={isRecording}
                formatTime={formatTime}
                recordingTime={recordingTime}
                hasUpload={!!uploadedMedia}
                inverted={inverted}
            />
        </div>
    )
}

export default App
