export function initVitals() {
  if (typeof window === 'undefined') return

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log(`LCP: ${Math.round(entry.startTime)}ms`)
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true })

  new PerformanceObserver((list) => {
    let cls = 0
    for (const entry of list.getEntries()) {
      if (!(entry as any).hadRecentInput) cls += (entry as any).value
    }
    if (cls > 0.1) console.warn(`CLS alto: ${cls.toFixed(3)}`)
  }).observe({ type: 'layout-shift', buffered: true })

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const inp = (entry as any).processingEnd - (entry as any).processingStart
      if (inp > 200) console.warn(`INP alto: ${Math.round(inp)}ms`)
    }
  }).observe({ type: 'event', buffered: true })
}
