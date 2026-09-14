import { rename, readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { ensureEditableStorage, getContentPath, isSupabaseStorageEnabled } from '../storage.js'
import { readSupabaseContent, writeSupabaseContent } from '../supabase.js'

const ART_TYPES = new Set(['blue', 'lime', 'peach'])

function cleanText(value, label, maximumLength) {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`)
  const cleaned = value.trim()
  if (!cleaned) throw new Error(`${label} is required.`)
  if (cleaned.length > maximumLength) throw new Error(`${label} is too long.`)
  return cleaned
}

function cleanOptionalUrl(value, label) {
  if (value === '') return ''
  const cleaned = cleanText(value, label, 1000)
  if (!/^https?:\/\//i.test(cleaned)) throw new Error(`${label} must be an HTTP or HTTPS URL.`)
  try { new URL(cleaned) } catch { throw new Error(`${label} must be a valid URL.`) }
  return cleaned
}

function cleanImage(value, label) {
  if (!value || typeof value !== 'object') throw new Error(`Invalid ${label}.`)
  const id = cleanText(value.id, `${label} ID`, 80)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`${label} ID is invalid.`)
  const src = cleanText(value.src, `${label} source`, 1000)
  if (!/^https?:\/\//i.test(src) && !src.startsWith('/')) throw new Error(`${label} source must be an HTTPS URL or a site-relative path.`)
  return { id, src, alt: cleanText(typeof value.alt === 'string' ? value.alt : 'Project screenshot', `${label} description`, 180) }
}

function cleanProject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid project.')
  const id = cleanText(value.id, 'Project ID', 80)
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Project ID is invalid.')
  const screenshots = Array.isArray(value.screenshots) ? value.screenshots.map((image, index) => cleanImage(image, `Screenshot ${index + 1}`)) : []
  if (screenshots.length > 24) throw new Error('Use no more than 24 screenshots per project.')
  const seenImages = new Set()
  for (const image of screenshots) {
    if (seenImages.has(image.id)) throw new Error('Each screenshot needs a unique ID.')
    seenImages.add(image.id)
  }

  const art = typeof value.art === 'string' && ART_TYPES.has(value.art) ? value.art : 'blue'
  return {
    id,
    title: cleanText(value.title, 'Project title', 140),
    description: cleanText(value.description, 'Project description', 500),
    websiteUrl: cleanOptionalUrl(value.websiteUrl, 'Project website URL'),
    coverImage: value.coverImage === null ? null : cleanImage(value.coverImage, 'Cover image'),
    screenshots,
    number: typeof value.number === 'string' ? value.number.slice(0, 8) : '',
    color: typeof value.color === 'string' ? value.color.slice(0, 32) : '',
    art,
  }
}

export function validateProjectsContent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.projects)) throw new Error('Invalid Projects content.')
  if (value.projects.length > 50) throw new Error('Use no more than 50 projects.')
  const projects = value.projects.map(cleanProject)
  const ids = new Set()
  for (const project of projects) {
    if (ids.has(project.id)) throw new Error('Each project needs a unique ID.')
    ids.add(project.id)
  }
  return { projects }
}

export async function readProjectsContent() {
  if (isSupabaseStorageEnabled()) return validateProjectsContent(await readSupabaseContent('projects'))
  await ensureEditableStorage()
  return validateProjectsContent(JSON.parse(await readFile(getContentPath('projects.json'), 'utf8')))
}

export async function writeProjectsContent(value) {
  const content = validateProjectsContent(value)
  if (isSupabaseStorageEnabled()) return validateProjectsContent(await writeSupabaseContent('projects', content))
  await ensureEditableStorage()
  const contentPath = getContentPath('projects.json')
  const temporaryPath = `${contentPath}.${randomBytes(8).toString('hex')}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(content, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, contentPath)
  return content
}

export async function publicProjectsContentHandler(_request, response) {
  try {
    const content = await readProjectsContent()
    response.setHeader('Cache-Control', 'no-store')
    if (typeof response.status === 'function') return response.status(200).json(content)
    response.statusCode = 200
    response.setHeader('Content-Type', 'application/json')
    return response.end(JSON.stringify(content))
  } catch {
    if (typeof response.status === 'function') return response.status(500).json({ error: 'Projects content is unavailable.' })
    response.statusCode = 500
    response.setHeader('Content-Type', 'application/json')
    return response.end(JSON.stringify({ error: 'Projects content is unavailable.' }))
  }
}
