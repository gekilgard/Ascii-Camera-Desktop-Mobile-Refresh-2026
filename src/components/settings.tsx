import { memo, useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { AsciiSettings } from '../types/types'

interface SettingsCompProps {
    settings: AsciiSettings
    onChange: (newSettings: AsciiSettings) => void
    inverted: boolean
}

type SliderEvent = React.MouseEvent | React.TouchEvent

const SLIDER_CONFIGS = {
    fontSize: { min: 6, max: 30, step: 1, label: 'Resolution' },
    contrast: { min: 0.5, max: 3.0, step: 0.1, label: 'Contrast' },
    brightness: { min: -100, max: 100, step: 1, label: 'Brightness' },
}

const CHARACTER_SETS = ['standard', 'simple', 'blocks', 'matrix', 'edges', 'gek', 'dither']

function Settings({ settings, onChange }: SettingsCompProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [activeSlider, setActiveSlider] = useState<string | null>(null)
    const [sliderValue, setSliderValue] = useState<number>(0)
    const [sliderPosition, setSliderPosition] = useState({ x: 0, y: 0 })
    const [sliderRect, setSliderRect] = useState<DOMRect | null>(null)

    const handleChange = (key: keyof AsciiSettings, value: number | string | boolean) => {
        onChange({ ...settings, [key]: value })
    }

    const getClientPos = (e: SliderEvent) => ({
        x: 'touches' in e ? e.touches[0].clientX : e.clientX,
        y: 'touches' in e ? e.touches[0].clientY : e.clientY,
    })

    const handleSliderStart = (key: string, value: number, e: SliderEvent) => {
        setSliderRect((e.currentTarget as HTMLInputElement).getBoundingClientRect())
        setActiveSlider(key)
        setSliderValue(value)
        setSliderPosition(getClientPos(e))
    }

    const handleSliderChange = (key: string, val: number, e: SliderEvent) => {
        handleChange(key as keyof AsciiSettings, val)
        if (activeSlider === key) {
            setSliderValue(val)
            setSliderPosition(getClientPos(e))
        }
    }

    const formatValue = (key: string, value: number) => {
        if (key === 'contrast') return value.toFixed(1)
        if (key === 'brightness') return `${value > 0 ? '+' : ''}${value}`
        return `${value}px`
    }

    const renderSlider = (key: keyof typeof SLIDER_CONFIGS) => {
        const config = SLIDER_CONFIGS[key]

        return (
            <section key={key} className="space-y-2">
                <div className="flex justify-between items-baseline">
                    <span className="text-[10px] tracking-[0.15em] uppercase text-white/60">
                        {config.label}
                    </span>
                    <span className="text-[10px] tracking-[0.1em] text-white/35 tabular-nums">
                        {formatValue(key, settings[key])}
                    </span>
                </div>
                <input
                    type="range"
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={settings[key]}
                    onMouseDown={e => handleSliderStart(key, settings[key], e)}
                    onTouchStart={e => handleSliderStart(key, settings[key], e)}
                    onChange={e =>
                        handleSliderChange(key, +e.target.value, e as unknown as SliderEvent)
                    }
                    onMouseUp={() => setActiveSlider(null)}
                    onTouchEnd={() => setActiveSlider(null)}
                    className="settings-slider"
                />
            </section>
        )
    }

    return (
        <>
            <button
                className="fixed top-4 right-4 z-50 w-8 h-8 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded text-white/70 hover:text-white transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? (
                    <X size={16} strokeWidth={1.5} />
                ) : (
                    <ChevronLeft size={16} strokeWidth={1.5} />
                )}
            </button>

            {isOpen && !activeSlider && (
                <div
                    className="fixed inset-0 bg-transparent z-30"
                    onClick={e => e.target === e.currentTarget && setIsOpen(false)}
                />
            )}

            {activeSlider && (
                <div
                    className="fixed z-50 pointer-events-none"
                    style={{
                        left: `${sliderPosition.x}px`,
                        top: `${sliderPosition.y - 44}px`,
                        transform: 'translateX(-50%)',
                    }}
                >
                    <div className="bg-white text-black px-2.5 py-1 rounded text-[10px] font-light tracking-wider">
                        {formatValue(activeSlider, sliderValue)}
                    </div>
                </div>
            )}

            <aside
                className={`fixed top-0 right-0 h-full w-64 bg-black/80 backdrop-blur-md flex flex-col
        transform transition-transform duration-300 z-40
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        ${activeSlider ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            >
                <header className="flex items-center py-5 px-5 border-b border-white/8">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-white/50 font-light">
                        Settings
                    </span>
                </header>

                <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
                    {(Object.keys(SLIDER_CONFIGS) as Array<keyof typeof SLIDER_CONFIGS>).map(
                        renderSlider,
                    )}

                    <div className="border-t border-white/8 pt-6">
                        <span className="text-[10px] tracking-[0.15em] uppercase text-white/40 block mb-3">
                            Characters
                        </span>
                        <div className="flex flex-col gap-0.5">
                            {CHARACTER_SETS.map(c => (
                                <button
                                    key={c}
                                    className={`text-left py-2 px-2 rounded text-[10px] tracking-[0.1em] uppercase font-light transition-colors ${
                                        settings.characterSet === c
                                            ? 'text-white bg-white/10'
                                            : 'text-white/40 hover:text-white/70'
                                    }`}
                                    onClick={() => handleChange('characterSet', c)}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-white/8 pt-6 space-y-1">
                        {[
                            { key: 'colorMode', label: 'Color' },
                            { key: 'invert', label: 'Invert' },
                        ].map(({ key, label }) => (
                            <label
                                key={key}
                                className="flex justify-between items-center py-2 px-2 rounded cursor-pointer hover:bg-white/5 transition-colors"
                            >
                                <span className="text-[10px] tracking-[0.15em] uppercase text-white/50 font-light">
                                    {label}
                                </span>
                                <input
                                    type="checkbox"
                                    checked={settings[key as keyof AsciiSettings] as boolean}
                                    onChange={() =>
                                        handleChange(
                                            key as keyof AsciiSettings,
                                            !settings[key as keyof AsciiSettings],
                                        )
                                    }
                                    className="settings-toggle"
                                />
                            </label>
                        ))}
                    </div>
                </div>
            </aside>

            {activeSlider && sliderRect && (
                <div
                    className="fixed z-50"
                    style={{
                        left: `${sliderRect.left}px`,
                        top: `${sliderRect.top}px`,
                        width: `${sliderRect.width}px`,
                    }}
                >
                    <input
                        type="range"
                        min={SLIDER_CONFIGS[activeSlider as keyof typeof SLIDER_CONFIGS].min}
                        max={SLIDER_CONFIGS[activeSlider as keyof typeof SLIDER_CONFIGS].max}
                        step={SLIDER_CONFIGS[activeSlider as keyof typeof SLIDER_CONFIGS].step}
                        value={sliderValue}
                        onChange={e =>
                            handleSliderChange(
                                activeSlider,
                                +e.target.value,
                                e as unknown as SliderEvent,
                            )
                        }
                        onMouseUp={() => setActiveSlider(null)}
                        onTouchEnd={() => setActiveSlider(null)}
                        className="settings-slider w-full"
                    />
                </div>
            )}
        </>
    )
}

export default memo(Settings)
