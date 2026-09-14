import { rename, readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { ensureEditableStorage, getContentPath } from '../storage.js'

const MEDIA_TYPES = new Set(['image', 'video'])

function cleanText(value, label, maximumLength) {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`)
  const cleaned = value.trim()
  if (!cleaned) throw new Error(`${label} is required.`)
  if (cleaned.length > maximumLength) throw new Error(`${label} is too long.`)
  return cleaned
}

function cleanMedia(value) {
  if (value === null) return null
  if (!value || typeof value !== 'object' || !MEDIA_TYPES.has(value.type)) throw new Error('Choose an image or video for badge media.')
  const src = cleanText(value.src, 'Badge media source', 1000)
  if (!/^https?:\/\//i.test(src) && !src.startsWith('/')) throw new Error('Badge media source must be an HTTPS URL or a site-relative path.')
  return { type: value.type, src, alt: cleanText(typeof value.alt === 'string' ? value.alt : 'About badge media', 'Badge media description', 180) }
}

export function validateAboutContent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid About content.')
  const paragraphs = Array.isArray(value.paragraphs) ? value.paragraphs.map((paragraph) => cleanText(paragraph, 'Each paragraph', 1500)) : []
  if (!paragraphs.length) throw new Error('Add at least one paragraph.')
  if (paragraphs.length > 10) throw new Error('Use no more than 10 paragraphs.')
  const instagram = cleanText(value.socialLinks?.instagram, 'Instagram URL', 1000)
  if (!/^https?:\/\//i.test(instagram)) throw new Error('Instagram URL must be an HTTPS URL.')

  return {
    heading: cleanText(value.heading, 'Heading', 120),
    intro: cleanText(value.intro, 'Intro text', 600),
    paragraphs,
    socialLinks: { instagram },
    badgeMedia: cleanMedia(value.badgeMedia),
  }
}

export async function readAboutContent() {
  await ensureEditableStorage()
  return validateAboutContent(JSON.parse(await readFile(getContentPath('about.json'), 'utf8')))
}

export async function writeAboutContent(value) {
  const content = validateAboutContent(value)
  await ensureEditableStorage()
  const contentPath = getContentPath('about.json')
  const temporaryPath = `${contentPath}.${randomBytes(8).toString('hex')}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(content, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, contentPath)
  return content
}

export async function publicAboutContentHandler(_request, response) {
  try {
    const content = await readAboutContent()
    response.setHeader('Cache-Control', 'no-store')
    if (typeof response.status === 'function') return response.status(200).json(content)
    response.statusCode = 200
    response.setHeader('Content-Type', 'application/json')
    return response.end(JSON.stringify(content))
  } catch {
    if (typeof response.status === 'function') return response.status(500).json({ error: 'About content is unavailable.' })
    response.statusCode = 500
    response.setHeader('Content-Type', 'application/json')
    return response.end(JSON.stringify({ error: 'About content is unavailable.' }))
  }
}
