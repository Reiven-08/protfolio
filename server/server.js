import dotenv from 'dotenv'
import express from 'express'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import contentRouter from './routes/content.js'
import editRouter from './routes/edit.js'
import { ensureEditableStorage, getUploadsDirectory } from './storage.js'

dotenv.config({ quiet: true })
await ensureEditableStorage()

const app = express()
const port = Number(process.env.PORT) || 3000
const productionBuildDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../dist')
const serveProductionBuild = process.env.NODE_ENV === 'production'

app.disable('x-powered-by')
app.use(express.json({ limit: '25kb' }))
app.use('/uploads', express.static(getUploadsDirectory()))
app.use('/api/content', contentRouter)
app.use('/api/edit', editRouter)

// Production uses one Express service for both the API and the Vite build.
// These handlers follow API/uploads so those routes always keep priority.
if (serveProductionBuild) {
  app.use(express.static(productionBuildDirectory))
  app.use((request, response, next) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return next()
    return response.sendFile(resolve(productionBuildDirectory, 'index.html'))
  })
}

app.use((_request, response) => {
  response.status(404).json({ ok: false, error: 'Not found.' })
})

const server = app.listen(port, () => {
  console.log(`Portfolio backend listening on http://localhost:${port}`)
})

const shutdown = async () => {
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
