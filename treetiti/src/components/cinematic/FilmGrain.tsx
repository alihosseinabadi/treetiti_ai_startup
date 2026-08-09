import { useEffect, useRef } from "react"

export default function FilmGrain({ opacity = 0.015 }: { opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let frame = 0
    let raf: number

    const resize = () => {
      canvas.width = window.innerWidth * 1.5
      canvas.height = window.innerHeight * 1.5
    }
    resize()
    window.addEventListener("resize", resize)

    const draw = () => {
      frame++
      if (frame % 2 === 0) {
        const w = canvas.width
        const h = canvas.height
        const imageData = ctx.createImageData(w, h)
        const data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
          const v = Math.random() * 255
          data[i] = v
          data[i + 1] = v
          data[i + 2] = v
          data[i + 3] = 30
        }
        ctx.putImageData(imageData, 0, 0)
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-40"
      style={{ opacity, mixBlendMode: "overlay" as any }}
      aria-hidden="true"
    />
  )
}
