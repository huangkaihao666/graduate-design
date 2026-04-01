import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

const EMOJI_RE = /[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{FE00}-\u{FEFF}]/gu

/**
 * 将结案报告页面截图并生成 PDF 下载。
 * 调用前请确保所有 Collapse 已通过 React 状态展开，并等待动画完成。
 */
export async function generateReportPdf(containerEl: HTMLElement, title: string): Promise<void> {
  const fullHeight = containerEl.scrollHeight

  const canvas = await html2canvas(containerEl, {
    scale: 2,
    useCORS: true,
    height: fullHeight,
    windowHeight: fullHeight,
    backgroundColor:
      getComputedStyle(document.documentElement).getPropertyValue('--bg-page').trim() || '#F1F5F9',
    ignoreElements: (el) => {
      const cls = typeof el.className === 'string' ? el.className : ''
      return cls.includes('rr-back-row') || cls.includes('rr-widget-goto')
    },
    logging: false,
  })

  const imgW = canvas.width
  const imgH = canvas.height

  const pdfW = 210
  const pdfH = 297
  const margin = 10
  const contentW = pdfW - margin * 2
  const renderedH = imgH * (contentW / imgW)
  const pageContentH = pdfH - margin * 2
  const pxPerMm = imgW / contentW

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })

  let remainH = renderedH
  let srcY = 0

  while (remainH > 0) {
    const sliceH = Math.min(remainH, pageContentH)
    const srcYpx = Math.round(srcY * pxPerMm)
    const sliceHpx = Math.round(sliceH * pxPerMm)

    const sliceCanvas = document.createElement('canvas')
    sliceCanvas.width = imgW
    sliceCanvas.height = sliceHpx
    sliceCanvas.getContext('2d')!.drawImage(canvas, 0, srcYpx, imgW, sliceHpx, 0, 0, imgW, sliceHpx)

    doc.addImage(sliceCanvas.toDataURL('image/jpeg', 0.92), 'JPEG', margin, margin, contentW, sliceH)

    srcY += sliceH
    remainH -= sliceH
    if (remainH > 0) doc.addPage()
  }

  const safeTitle = title.replace(EMOJI_RE, '').replace(/[/\\:*?"<>|]/g, '_').slice(0, 50)
  const date = new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')
  doc.save(`结案报告_${safeTitle}_${date}.pdf`)
}
