import dotenv from 'dotenv'
import express from 'express'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import contentRouter from './routes/content.js'
import editRouter from './routes/edit.js'

dotenv.config({ quiet: true })

const app = express()
const port = Number(process.env.PORT) || 3000
const publicDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../public')

app.disable('x-powered-by')
app.use(express.json({ limit: '25kb' }))
app.use('/uploads', express.static(resolve(publicDirectory, 'uploads')))
app.use('/api/content', contentRouter)
app.use('/api/edit', editRouter)

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
