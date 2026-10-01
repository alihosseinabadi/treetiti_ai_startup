import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

const SYSTEM_PROMPT = `You are Treetiti's AI concierge and creative assistant.
Treetiti is a premium international AI agency. We build AI websites, AI automation, AI systems, AI content, AI UGC, AI marketing, AI branding, and AI documentaries for premium clients worldwide.

You help website visitors quickly figure out what they need and what Treetiti can do for them. Be professional, concise, friendly, and helpful. Keep answers short and clear. If the visitor seems ready to start a project, gently invite them to fill in the project request form (idea, references, timeline, email) on the same page so the team can take over. Never invent contact details. Respond in the same language the visitor uses.`

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const groqKey = env.GROQ_API_KEY

  function groqDevProxy() {
    return {
      name: 'groq-dev-proxy',
      configureServer(server: any) {
        server.middlewares.use('/functions/v1/groq-chat', async (req: any, res: any, next: any) => {
          if (req.method !== 'POST') return next()
          if (!groqKey) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'GROQ_API_KEY is not configured (set it in .env.local)' }))
            return
          }
          let body = ''
          req.on('data', (c: any) => (body += c))
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body)
              const up = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
                body: JSON.stringify({
                  model: 'llama-3.3-70b-versatile',
                  messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...(payload.messages ?? [])],
                  temperature: 0.7,
                  max_tokens: 900,
                }),
              })
              const data = await up.json()
              if (!up.ok) {
                res.statusCode = up.status
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'Groq request failed', details: data }))
                return
              }
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ reply: data?.choices?.[0]?.message?.content?.trim() ?? '' }))
            } catch (e: any) {
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: 'Upstream error', details: String(e) }))
            }
          })
        })
      },
    }
  }

  return {
    plugins: [react(), tailwindcss(), groqDevProxy()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) return 'three'
            if (id.includes('node_modules/framer-motion') || id.includes('node_modules/motion') || id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) return 'motion'
            if (id.includes('node_modules/lucide-react')) return 'ui'
          },
        },
      },
    },
  }
})
