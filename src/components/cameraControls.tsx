import { RefreshCw, Download, Check, Upload } from 'lucide-react'
import { memo, useRef, useState } from 'react'

export type AppMode = 'photo' | 'video' | 'upload'

type CameraControlsProps = {
    mode: AppMode
    onModeChange: (mode: AppMode) => void
    onFlip: () => void
    onShot: () => void
    onSave: () => void
    onToggleRecording: () => void
    onFileUpload: (file: File) => void
    isRecording: boolean
    formatTime: (seconds: number) => string
    recordingTime: number
    hasUpload: boolean
    inverted: boolean
}

const CameraControls = ({
    mode,
    onModeChange,
    onFlip,
    onShot,
    onSave,
    onToggleRecording,
    onFileUpload,
    isRecording,
    formatTime,
    recordingTime,
    hasUpload,
}: CameraControlsProps) => {
    const [isFlipping, setIsFlipping] = useState(false)
    const [isSaved, setIsSaved] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFlip = () => {
        setIsFlipping(prev => !prev)
        onFlip()
        setTimeout(() => setIsFlipping(prev => !prev), 600)
    }

    const handleSave = () => {
        setIsSaved(true)
        onSave()
        setTimeout(() => setIsSaved(false), 1200)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) onFileUpload(file)
        e.target.value = ''
    }

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 flex flex-col items-center pb-8 md:pb-10 gap-4">
            {isRecording && (
                <div className="pointer-events-none text-[10px] tracking-[0.2em] uppercase font-light tabular-nums text-white bg-black/60 backdrop-blur-sm px-3 py-1 rounded">
                    {formatTime(recordingTime)}
                </div>
            )}

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileChange}
            />

            <div className="pointer-events-auto flex items-center gap-6 md:gap-8">
                {mode !== 'upload' && (
                    <button
                        onClick={handleFlip}
                        className="group flex items-center justify-center w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm focus:outline-none"
                        aria-label="Flip camera"
                    >
                        <RefreshCw
                            size={16}
                            strokeWidth={1.5}
                            className={`text-white/70 group-hover:text-white transition-all duration-300 ${isFlipping ? 'rotate-180' : ''}`}
                        />
                    </button>
                )}

                {mode === 'upload' && (
                    <button
                        onClick={handleSave}
                        className="group flex items-center justify-center w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm focus:outline-none"
                        aria-label="Save image"
                    >
                        {isSaved ? (
                            <Check size={16} strokeWidth={1.5} className="text-white" />
                        ) : (
                            <Download
                                size={16}
                                strokeWidth={1.5}
                                className="text-white/70 group-hover:text-white transition-colors"
                            />
                        )}
                    </button>
                )}

                {mode === 'photo' ? (
                    <button
                        onClick={onShot}
                        className="group flex items-center justify-center focus:outline-none"
                        aria-label="Capture photo"
                    >
                        <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center group-hover:border-white/70 group-active:scale-90 transition-all">
                            <div className="w-11 h-11 rounded-full bg-white/80 group-hover:bg-white transition-colors"></div>
                        </div>
                    </button>
                ) : mode === 'video' ? (
                    <button
                        onClick={onToggleRecording}
                        className="group flex items-center justify-center focus:outline-none"
                        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                    >
                        <div
                            className={`w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm border-2 flex items-center justify-center transition-all ${
                                isRecording
                                    ? 'border-white/60'
                                    : 'border-white/40 group-hover:border-white/70 group-active:scale-90'
                            }`}
                        >
                            {isRecording ? (
                                <div className="w-[calc(100%-2px)] h-[calc(100%-2px)] rounded-full bg-red-500 animate-pulse"></div>
                            ) : (
                                <div className="w-11 h-11 rounded-full bg-red-500/80 group-hover:bg-red-500 transition-colors"></div>
                            )}
                        </div>
                    </button>
                ) : (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="group flex items-center justify-center focus:outline-none"
                        aria-label="Upload file"
                    >
                        <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center group-hover:border-white/70 group-active:scale-90 transition-all">
                            <Upload
                                size={22}
                                strokeWidth={1.5}
                                className={`transition-colors ${hasUpload ? 'text-white' : 'text-white/70 group-hover:text-white'}`}
                            />
                        </div>
                    </button>
                )}

                {mode !== 'upload' ? (
                    <button
                        onClick={handleSave}
                        className="group flex items-center justify-center w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm focus:outline-none"
                        aria-label="Save image"
                    >
                        {isSaved ? (
                            <Check size={16} strokeWidth={1.5} className="text-white" />
                        ) : (
                            <Download
                                size={16}
                                strokeWidth={1.5}
                                className="text-white/70 group-hover:text-white transition-colors"
                            />
                        )}
                    </button>
                ) : (
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="group flex items-center justify-center w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm focus:outline-none"
                        aria-label="Choose another file"
                    >
                        <Upload
                            size={16}
                            strokeWidth={1.5}
                            className="text-white/70 group-hover:text-white transition-colors"
                        />
                    </button>
                )}
            </div>

            <div className="pointer-events-auto flex items-center gap-4 bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full">
                {(['photo', 'video', 'upload'] as const).map((m, i) => (
                    <span key={m} className="flex items-center gap-4">
                        {i > 0 && <span className="text-white/20 text-[9px]">/</span>}
                        <button
                            onClick={() => onModeChange(m)}
                            className={`text-[9px] tracking-[0.2em] uppercase font-light transition-colors ${
                                mode === m ? 'text-white' : 'text-white/40 hover:text-white/70'
                            }`}
                        >
                            {m}
                        </button>
                    </span>
                ))}
            </div>
        </div>
    )
}

export default memo(CameraControls)
