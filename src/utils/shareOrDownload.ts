/**
 * Mobile: Web Share (files) → system sheet → Save to Photos / Gallery.
 * Desktop (incl. Mac): skip share — Safari/Chrome would show a share modal instead of
 * saving to Downloads; use <a download> so files go to the default Downloads folder.
 */
export type ShareOrDownloadResult = 'shared' | 'downloaded' | 'cancelled'

export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    return new File([blob], filename, { type: blob.type || 'image/png' })
}

/** Phones / tablets where share-to-Photos is the right default (not desktop Mac/PC). */
export function isLikelyMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent || ''

    if (/iPhone|iPod/i.test(ua)) return true
    if (/iPad/i.test(ua)) return true
    // iPadOS 13+ often reports as Mac with touch
    if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true

    if (/Android/i.test(ua)) return true

    return false
}

/**
 * On mobile: try native share (files) first, then <a download>.
 * On desktop: always <a download> (direct to Downloads).
 */
export async function shareFileOrDownload(opts: {
    file: File
    fallbackObjectUrl: string
    fallbackFilename: string
}): Promise<ShareOrDownloadResult> {
    const { file, fallbackObjectUrl, fallbackFilename } = opts

    if (isLikelyMobileDevice()) {
        try {
            if (navigator.canShare?.({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: file.name.replace(/\.[^.]+$/, ''),
                })
                return 'shared'
            }
        } catch (e: unknown) {
            const err = e as { name?: string }
            if (err?.name === 'AbortError') return 'cancelled'
        }
    }

    const a = document.createElement('a')
    a.href = fallbackObjectUrl
    a.download = fallbackFilename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return 'downloaded'
}
