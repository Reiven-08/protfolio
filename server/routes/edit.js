import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, unlink } from 'node:fs/promises'
import { extname, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import multer from 'multer'
import { readAboutContent, writeAboutContent } from '../content/about.js'
import { readHomeContent, writeHomeContent } from '../content/home.js'
import { readProjectsContent, writeProjectsContent } from '../content/projects.js'

const router = Router()
const SESSION_COOKIE = 'reiven_edit_session'
const SESSION_DURATION_MS = 1000 * 60 * 60 * 8
const activeSessions = new Map()
const uploadsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../public/uploads')
const allowedMedia = {
  image: new Set(['.jpg', '.jpeg', '.png', '.webp']),
  video: new Set(['.mp4', '.webm']),
}
const uploadStorage = multer.diskStorage({
  destination: async (_request, _file, callback) => {
    try { await mkdir(uploadsDirectory, { recursive: true }); callback(null, uploadsDirectory) } catch (error) { callback(error) }
  },
  filename: (_request, file, callback) => callback(null, `${Date.now()}-${randomBytes(10).toString('hex')}${extname(file.originalname).toLowerCase()}`),
})
const mediaUpload = multer({
  storage: uploadStorage,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase()
    const allowed = allowedMedia.image.has(extension) || allowedMedia.video.has(extension)
    callback(allowed ? null : new Error('Use a JPG, JPEG, PNG, WebP, MP4, or WebM file.'), allowed)
  },
})

function adminConfig() {
  const username = process.env.EDIT_ADMIN_USERNAME
  const password = process.env.EDIT_ADMIN_PASSWORD
  const secret = process.env.EDIT_SESSION_SECRET

  return username && password && secret ? { username, password, secret } : null
}

function sign(payload, secret) {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function secureEqual(left, right) {
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer)
}

function readCookie(request, name) {
  const cookie = request.headers.cookie
  if (!cookie) return null

  const entry = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))
  if (!entry) return null

  try {
    return decodeURIComponent(entry.slice(name.length + 1))
  } catch {
    return null
  }
}

function sessionFromRequest(request) {
  const config = adminConfig()
  const token = readCookie(request, SESSION_COOKIE)
  if (!config || !token) return null

  const [encodedPayload, signature, ...extra] = token.split('.')
  if (!encodedPayload || !signature || extra.length) return null
  if (!secureEqual(signature, sign(encodedPayload, config.secret))) return null

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
    if (!payload.id || !Number.isFinite(payload.expiresAt) || payload.expiresAt <= Date.now()) return null
    if (activeSessions.get(payload.id) !== payload.expiresAt) return null
    return payload
  } catch {
    return null
  }
}

function cookieOptions(maxAge) {
  const parts = ['Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAge}`]
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  return parts.join('; ')
}

function setSessionCookie(response, token) {
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions(Math.floor(SESSION_DURATION_MS / 1000))}`)
}

function clearSessionCookie(response) {
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${cookieOptions(0)}`)
}

function requireAdmin(request, response, next) {
  const session = sessionFromRequest(request)
  if (!session) return response.status(401).json({ error: 'Authentication required.' })
  request.editSession = session
  next()
}

function clearExpiredSessions() {
  const now = Date.now()
  for (const [id, expiresAt] of activeSessions) {
    if (expiresAt <= now) activeSessions.delete(id)
  }
}

router.post('/login', (request, response) => {
  const config = adminConfig()
  const username = typeof request.body?.username === 'string' ? request.body.username.trim() : ''
  const password = typeof request.body?.password === 'string' ? request.body.password : ''

  if (!config) return response.status(503).json({ error: 'Edit Mode is not configured.' })
  if (!secureEqual(username, config.username) || !secureEqual(password, config.password)) {
    return response.status(401).json({ error: 'Invalid username or password.' })
  }

  clearExpiredSessions()
  const payload = {
    id: randomBytes(24).toString('base64url'),
    expiresAt: Date.now() + SESSION_DURATION_MS,
  }
  activeSessions.set(payload.id, payload.expiresAt)
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  setSessionCookie(response, `${encodedPayload}.${sign(encodedPayload, config.secret)}`)

  return response.status(200).json({ ok: true })
})

router.post('/logout', requireAdmin, (request, response) => {
  activeSessions.delete(request.editSession.id)
  clearSessionCookie(response)
  return response.status(204).end()
})

router.get('/session', requireAdmin, (_request, response) => {
  return response.status(200).json({ ok: true, admin: 'Reiven' })
})

router.get('/dashboard', requireAdmin, (_request, response) => {
  return response.status(200).json({ ok: true })
})

router.get('/home', requireAdmin, async (_request, response) => {
  try {
    return response.status(200).json(await readHomeContent())
  } catch {
    return response.status(500).json({ error: 'Home content is unavailable.' })
  }
})

router.put('/home', requireAdmin, async (request, response) => {
  try {
    return response.status(200).json({ ok: true, content: await writeHomeContent(request.body) })
  } catch (error) {
    return response.status(400).json({ error: error.message || 'Home content could not be saved.' })
  }
})

router.post('/home/media', requireAdmin, (request, response) => {
  mediaUpload.single('media')(request, response, async (uploadError) => {
    if (uploadError) return response.status(400).json({ error: uploadError.message || 'Media upload failed.' })
    if (!request.file) return response.status(400).json({ error: 'Choose a media file to upload.' })

    const extension = extname(request.file.originalname).toLowerCase()
    const type = allowedMedia.video.has(extension) ? 'video' : 'image'
    try {
      const media = { type, src: `/uploads/${request.file.filename}`, alt: 'Home hero media' }
      const content = await writeHomeContent({ ...await readHomeContent(), media })
      return response.status(201).json({ ok: true, media, content })
    } catch {
      return response.status(500).json({ error: 'Media uploaded, but Home content could not be updated.' })
    }
  })
})

router.get('/about', requireAdmin, async (_request, response) => {
  try {
    return response.status(200).json(await readAboutContent())
  } catch {
    return response.status(500).json({ error: 'About content is unavailable.' })
  }
})

router.put('/about', requireAdmin, async (request, response) => {
  try {
    return response.status(200).json({ ok: true, content: await writeAboutContent(request.body) })
  } catch (error) {
    return response.status(400).json({ error: error.message || 'About content could not be saved.' })
  }
})

router.post('/about/media', requireAdmin, (request, response) => {
  mediaUpload.single('media')(request, response, async (uploadError) => {
    if (uploadError) return response.status(400).json({ error: uploadError.message || 'Media upload failed.' })
    if (!request.file) return response.status(400).json({ error: 'Choose a media file to upload.' })

    const extension = extname(request.file.originalname).toLowerCase()
    const type = allowedMedia.video.has(extension) ? 'video' : 'image'
    try {
      const badgeMedia = { type, src: `/uploads/${request.file.filename}`, alt: 'About badge media' }
      const content = await writeAboutContent({ ...await readAboutContent(), badgeMedia })
      return response.status(201).json({ ok: true, media: badgeMedia, content })
    } catch {
      return response.status(500).json({ error: 'Media uploaded, but About content could not be updated.' })
    }
  })
})

router.get('/projects', requireAdmin, async (_request, response) => {
  try {
    return response.status(200).json(await readProjectsContent())
  } catch {
    return response.status(500).json({ error: 'Projects content is unavailable.' })
  }
})

router.put('/projects', requireAdmin, async (request, response) => {
  try {
    return response.status(200).json({ ok: true, content: await writeProjectsContent(request.body) })
  } catch (error) {
    return response.status(400).json({ error: error.message || 'Projects content could not be saved.' })
  }
})

router.post('/projects/:projectId/images', requireAdmin, (request, response) => {
  mediaUpload.single('media')(request, response, async (uploadError) => {
    if (uploadError) return response.status(400).json({ error: uploadError.message || 'Image upload failed.' })
    if (!request.file) return response.status(400).json({ error: 'Choose an image to upload.' })

    const extension = extname(request.file.originalname).toLowerCase()
    if (!allowedMedia.image.has(extension)) {
      await unlink(request.file.path).catch(() => {})
      return response.status(400).json({ error: 'Use a JPG, JPEG, PNG, or WebP image.' })
    }

    try {
      const content = await readProjectsContent()
      const projectIndex = content.projects.findIndex((project) => project.id === request.params.projectId)
      if (projectIndex < 0) {
        await unlink(request.file.path).catch(() => {})
        return response.status(404).json({ error: 'Project not found.' })
      }

      const image = { id: randomBytes(10).toString('hex'), src: `/uploads/${request.file.filename}`, alt: `${content.projects[projectIndex].title} screenshot` }
      const projects = [...content.projects]
      const project = { ...projects[projectIndex] }
      project.coverImage = image
      projects[projectIndex] = project
      const savedContent = await writeProjectsContent({ projects })
      return response.status(201).json({ ok: true, image, content: savedContent })
    } catch {
      return response.status(500).json({ error: 'Image uploaded, but Project content could not be updated.' })
    }
  })
})

export default router
