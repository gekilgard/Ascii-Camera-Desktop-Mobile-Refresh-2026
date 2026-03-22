/**
 * Mobile-friendly save: Web Share API opens the system sheet where users can pick
 * "Save Image" / Photos (iOS) or "Save to Gallery" (some Android) — browsers cannot
 * write straight to the photo library without this step or a native wrapper app.
 */
export type ShareOrDownloadResult = 'shared' | 'downloaded' | 'cancelled'

export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    return new File([blob], filename, { type: blob.type || 'image/png' })
}

/**
 * Try native share (files) first; fall back to <a download>.
 * Must run from a user gesture (e.g. button click) on iOS.
 */
export async function shareFileOrDownload(opts: {
    file: File
    fallbackObjectUrl: string
    fallbackFilename: string
}): Promise<ShareOrDownloadResult> {
    const { file, fallbackObjectUrl, fallbackFilename } = opts

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

    const a = document.createElement('a')
    a.href = fallbackObjectUrl
    a.download = fallbackFilename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return 'downloaded'
}
