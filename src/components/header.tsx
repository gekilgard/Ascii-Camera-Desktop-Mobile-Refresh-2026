import { memo } from 'react'
import { ProcessingStats } from '../types/types'

interface HeaderProps extends ProcessingStats {
    width: number
    height: number
    inverted: boolean
    /** Hide stats while dragging a settings slider. */
    hidden?: boolean
}

function Header({ fps, renderTime, width, height, hidden }: HeaderProps) {
    return (
        <div
            className={`fixed left-4 top-[calc(10vh+env(safe-area-inset-top))] z-10 transition-opacity duration-500 ease-in-out ${
                hidden ? 'pointer-events-none opacity-0' : 'opacity-100'
            }`}
            aria-hidden={hidden}
        >
            <div className="flex gap-4 text-[10px] tracking-[0.15em] uppercase font-light text-white/80 bg-black/60 backdrop-blur-sm px-3 py-2 rounded">
                <span className="flex items-center gap-1.5">
                    <span className="text-white/40">FPS</span>
                    <span>{Math.floor(fps)}</span>
                </span>
                <span className="text-white/20">|</span>
                <span className="flex items-center gap-1.5">
                    <span className="text-white/40">Render</span>
                    <span>{Math.floor(renderTime)}ms</span>
                </span>
                <span className="text-white/20">|</span>
                <span className="flex items-center gap-1.5">
                    <span className="text-white/40">Res</span>
                    <span>
                        {width} x {height}
                    </span>
                </span>
            </div>
        </div>
    )
}

export default memo(Header)
