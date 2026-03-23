import { memo, useCallback, useEffect, useState } from 'react'
import { ChevronLeft, X } from 'lucide-react'
import { AsciiSettings, CHARACTER_SET_OPTIONS, FILTER_PRESETS } from '../types/types'

interface SettingsCompProps {
    settings: AsciiSettings
    onChange: (newSettings: AsciiSettings) => void
    inverted: boolean
    /** True while dragging a settings slider — parent hides header / bottom chrome. */
    onSettingsSliderActiveChange?: (active: boolean) => void
}

type SliderEvent = React.MouseEvent | React.TouchEvent

const SLIDER_CONFIGS = {
    fontSize: { min: 6, max: 30, step: 1, label: 'Resolution' },
    contrast: { min: 0.5, max: 3.0, step: 0.1, label: 'Contrast' },
    brightness: { min: -100, max: 100, step: 1, label: 'Brightness' },
    saturation: { min: 0, max: 200, step: 1, label: 'Saturation' },
    hue: { min: -180, max: 180, step: 1, label: 'Hue' },
}

const COLOR_MODE_SLIDER_KEYS: (keyof typeof SLIDER_CONFIGS)[] = ['saturation', 'hue']

function Settings({ settings, onChange, onSettingsSliderActiveChange }: SettingsCompProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [activeSlider, setActiveSlider] = useState<string | null>(null)
    const [sliderValue, setSliderValue] = useState<number>(0)
    const [sliderPosition, setSliderPosition] = useState({ x: 0, y: 0 })

    const handleChange = (key: keyof AsciiSettings, value: number | string | boolean) => {
        onChange({ ...settings, [key]: value })
    }

    const getClientPos = (e: SliderEvent) => ({
        x: 'touches' in e ? e.touches[0].clientX : e.clientX,
        y: 'touches' in e ? e.touches[0].clientY : e.clientY,
    })

    const endSliderDrag = useCallback(() => {
        setActiveSlider(null)
        onSettingsSliderActiveChange?.(false)
    }, [onSettingsSliderActiveChange])

    useEffect(() => {
        if (!activeSlider) return
        const onGlobalEnd = () => endSliderDrag()
        window.addEventListener('pointerup', onGlobalEnd)
        window.addEventListener('touchend', onGlobalEnd)
        return () => {
            window.removeEventListener('pointerup', onGlobalEnd)
            window.removeEventListener('touchend', onGlobalEnd)
        }
    }, [activeSlider, endSliderDrag])

    const isColorSliderDisabled = (key: keyof typeof SLIDER_CONFIGS) =>
        COLOR_MODE_SLIDER_KEYS.includes(key) && !settings.colorMode

    const handleSliderStart = (key: string, value: number, e: SliderEvent) => {
        if (isColorSliderDisabled(key as keyof typeof SLIDER_CONFIGS)) return
        setActiveSlider(key)
        setSliderValue(value)
        setSliderPosition(getClientPos(e))
        onSettingsSliderActiveChange?.(true)
    }

    const handleSliderChange = (key: string, val: number, e: SliderEvent) => {
        if (isColorSliderDisabled(key as keyof typeof SLIDER_CONFIGS)) return
        handleChange(key as keyof AsciiSettings, val)
        if (activeSlider === key) {
            setSliderValue(val)
            setSliderPosition(getClientPos(e))
        }
    }

    const formatValue = (key: string, value: number) => {
        if (key === 'contrast') return value.toFixed(1)
        if (key === 'brightness') return `${value > 0 ? '+' : ''}${value}`
        if (key === 'saturation') return `${Math.round(value)}%`
        if (key === 'hue') return `${value > 0 ? '+' : ''}${Math.round(value)}°`
        return `${value}px`
    }

    const renderSlider = (key: keyof typeof SLIDER_CONFIGS) => {
        const config = SLIDER_CONFIGS[key]
        const disabled = isColorSliderDisabled(key)

        return (
            <section
                key={key}
                className={`space-y-2 transition-opacity duration-200 ${
                    disabled ? 'pointer-events-none opacity-35' : 'opacity-100'
                }`}
                aria-disabled={disabled}
            >
                <div className="flex items-baseline justify-between">
                    <span
                        className={`text-[10px] uppercase tracking-[0.15em] ${
                            disabled ? 'text-white/35' : 'text-white/60'
                        }`}
                    >
                        {config.label}
                    </span>
                    <span
                        className={`text-[10px] tabular-nums tracking-[0.1em] ${
                            disabled ? 'text-white/25' : 'text-white/35'
                        }`}
                    >
                        {formatValue(key, settings[key] as number)}
                    </span>
                </div>
                <input
                    type="range"
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={settings[key] as number}
                    disabled={disabled}
                    onMouseDown={e => handleSliderStart(key, settings[key] as number, e)}
                    onTouchStart={e => handleSliderStart(key, settings[key] as number, e)}
                    onChange={e =>
                        handleSliderChange(key, +e.target.value, e as unknown as SliderEvent)
                    }
                    onMouseUp={endSliderDrag}
                    onTouchEnd={endSliderDrag}
                    className="settings-slider"
                />
            </section>
        )
    }

    return (
        <>
            <button
                className="fixed right-4 top-[8vh] z-50 flex h-8 w-8 items-center justify-center rounded bg-black/60 text-white/70 backdrop-blur-sm transition-colors hover:text-white"
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
                className={`fixed top-0 right-0 z-40 flex h-full w-64 flex-col transform transition-transform duration-300 ease-out
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div
                    className={`pointer-events-none absolute inset-0 transition-[background-color,backdrop-filter] duration-200 ease-out ${
                        activeSlider
                            ? 'bg-black/25 backdrop-blur-sm'
                            : 'bg-black/80 backdrop-blur-md'
                    }`}
                    aria-hidden
                />
                <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                    <header className="flex shrink-0 items-center border-b border-white/8 px-5 py-5">
                        <span className="text-[10px] font-light uppercase tracking-[0.2em] text-white/50">
                            Settings
                        </span>
                    </header>

                    <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
                        {(Object.keys(SLIDER_CONFIGS) as Array<keyof typeof SLIDER_CONFIGS>).map(
                            renderSlider,
                        )}

                        <div className="border-t border-white/8 pt-6">
                            <span className="mb-3 block text-[10px] font-light uppercase tracking-[0.15em] text-white/40">
                                Filter
                            </span>
                            <div className="flex flex-col gap-0.5">
                                {CHARACTER_SET_OPTIONS.map(({ id, label }) => (
                                    <button
                                        key={id}
                                        className={`rounded px-2 py-2 text-left text-[10px] font-light uppercase tracking-[0.1em] transition-colors ${
                                            settings.characterSet === id
                                                ? 'bg-white/10 text-white'
                                                : 'text-white/40 hover:text-white/70'
                                        }`}
                                        onClick={() => {
                                            const preset = FILTER_PRESETS[id]
                                            onChange({
                                                ...settings,
                                                characterSet: id,
                                                ...preset,
                                            })
                                        }}
                                    >
                                        {label}
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
                </div>
            </aside>
        </>
    )
}

export default memo(Settings)
