import { ref } from 'vue'
import type { Graph } from '@antv/x6'
import { ElMessage } from 'element-plus'
import type { ExportOptions } from '@/types'

export function useExport() {
  const exporting = ref(false)
  let graphInstance: Graph | null = null

  /** 设置图实例 */
  function setGraph(graph: Graph) {
    graphInstance = graph
  }

  /** 导出图片（SVG → Canvas → PNG/JPEG） */
  async function exportImage(options: ExportOptions) {
    if (!graphInstance) {
      ElMessage.warning('画布尚未准备好，请稍后再试')
      return
    }

    exporting.value = true

    try {
      const { format, background } = options
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const filename = `er-diagram-${timestamp}.${format}`

      // 获取 SVG 元素
      const container = graphInstance.container
      const svgEl = container?.querySelector('svg')
      if (!svgEl) {
        ElMessage.error('未找到画布内容')
        return
      }

      // 克隆 SVG 并设置背景色
      const clone = svgEl.cloneNode(true) as SVGElement
      const bbox = (svgEl as SVGSVGElement).viewBox?.baseVal
      const width = bbox?.width || container.clientWidth
      const height = bbox?.height || container.clientHeight

      // 如果背景不是透明，添加背景矩形
      if (background !== 'transparent') {
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        bgRect.setAttribute('width', String(width))
        bgRect.setAttribute('height', String(height))
        bgRect.setAttribute('fill', background || '#ffffff')
        clone.insertBefore(bgRect, clone.firstChild)
      }

      const svgData = new XMLSerializer().serializeToString(clone)
      const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData)

      // Canvas 绘制（Promise 包装图片加载）
      await new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, 0, 0)

          const mimeType = format === 'png' ? 'image/png' : 'image/jpeg'
          const dataUrl = canvas.toDataURL(mimeType, 0.95)
          downloadDataUri(dataUrl, filename)
          resolve()
        }
        img.onerror = () => reject(new Error('图片加载失败'))
        img.src = dataUri
      })

      ElMessage.success(`已导出 ${filename}`)
    } catch (err) {
      console.error('导出失败:', err)
      ElMessage.error('导出失败，请重试')
    } finally {
      exporting.value = false
    }
  }

  return {
    exporting,
    setGraph,
    exportImage,
  }
}

/** 触发浏览器下载 Data URI */
function downloadDataUri(dataUri: string, filename: string) {
  const link = document.createElement('a')
  link.download = filename
  link.href = dataUri
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
