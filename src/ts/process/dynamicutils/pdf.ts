import * as pdfjs from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker?worker&url'
import { HARDENED_LOCAL_ONLY } from 'src/ts/security/hardening'

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

export async function convertPdfToImages(pdfBuffer: ArrayBuffer, options?: {
    scale?: number
    format?: 'png' | 'jpeg'
    quality?: number
}): Promise<string[]> {
    if (HARDENED_LOCAL_ONLY) {
        throw new Error('PDF processing is disabled in the hardened build.')
    }
    const { scale = 1.5, format = 'png', quality = 0.8 } = options || {}
    
    const loadingTask = pdfjs.getDocument({
        data: pdfBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
        cMapPacked: true
    })
    const pdf = await loadingTask.promise
    const images: string[] = []
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const viewport = page.getViewport({ scale })
        
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')!
        
        canvas.height = viewport.height
        canvas.width = viewport.width
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        }
        
        await page.render(renderContext).promise
        
        const imageData = canvas.toDataURL(`image/${format}`, quality)
        images.push(imageData)
    }
    
    return images
}

export async function extractPdfText(pdfBuffer: ArrayBuffer): Promise<string[]> {
    if (HARDENED_LOCAL_ONLY) {
        throw new Error('PDF processing is disabled in the hardened build.')
    }
    const loadingTask = pdfjs.getDocument({
        data: pdfBuffer,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/cmaps/',
        cMapPacked: true
    })
    const pdf = await loadingTask.promise
    const texts: string[] = []
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        const items = content.items as { str: string }[]
        
        for (const item of items) {
            texts.push(item.str)
        }
    }
    
    return texts
}
