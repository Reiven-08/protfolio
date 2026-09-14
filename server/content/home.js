import { rename, readFile, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { ensureEditableStorage, getContentPath, isSupabaseStorageEnabled } from '../storage.js'
import { readSupabaseContent, writeSupabaseContent } from '../supabase.js'

const SUPPORTED_SOCIAL_PLATFORMS = new Set(['instagram', 'github', 'facebook', 'whatsapp'])
const MEDIA_TYPES = new Set(['image', 'video'])

function cleanText(value, label, maximumLength) {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`)
  const cleaned = value.trim()
  if (!cleaned) throw new Error(`${label} is required.`)
  if (cleaned.length > maximumLength) throw new Error(`${label} is too long.`)
  return cleaned
}

function cleanSafePath(value, label, { allowFragment = false } = {}) {
  const cleaned = cleanText(value, label, 1000)
  if (/^https?:\/\//i.test(cleaned) || (allowFragment && cleaned.startsWith('#')) || cleaned.startsWith('/')) return cleaned
  throw new Error(`${label} must be an HTTPS URL, a site-relative path, or a page anchor.`)
}

export function validateHomeContent(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Home content.')
  const roles = Array.isArray(value.roles) ? value.roles.map((role) => cleanText(role, 'Each role', 80)) : []
  if (!roles.length) throw new Error('Add at least one role.')
  if (roles.length > 12) throw new Error('Use no more than 12 roles.')

  if (!Array.isArray(value.socialLinks)) throw new Error('Social links must be a list.')
  const seenPlatforms = new Set()
  const socialLinks = value.socialLinks.map((link) => {
    if (!link || typeof link !== 'object') throw new Error('Invalid social link.')
    const platform = cleanText(link.platform, 'Social platform', 30).toLowerCase()
    if (!SUPPORTED_SOCIAL_PLATFORMS.has(platform)) throw new Error('Unsupported social platform.')
    if (seenPlatforms.has(platform)) throw new Error('Each social platform can appear only once.')
    seenPlatforms.add(platform)
    if (typeof link.enabled !== 'boolean') throw new Error('Social link visibility is invalid.')
    return { platform, enabled: link.enabled, url: cleanSafePath(link.url, 'Social URL', { allowFragment: true }) }
  })

  const media = value.media
  if (media !== null && (!media || typeof media !== 'object' || !MEDIA_TYPES.has(media.type))) throw new Error('Choose an image or video for hero media.')

  return {
    greeting: cleanText(value.greeting, 'Greeting', 80),
    name: cleanText(value.name, 'Name', 80),
    roles,
    resumeUrl: cleanSafePath(value.resumeUrl, 'Resume destination', { allowFragment: true }),
    socialLinks,
    media: media === null ? null : {
      type: media.type,
      src: cleanSafePath(media.src, 'Media source'),
      alt: cleanText(typeof media.alt === 'string' ? media.alt : 'Hero media', 'Media description', 180),
    },
  }
}

export async function readHomeContent() {
  if (isSupabaseStorageEnabled()) return validateHomeContent(await readSupabaseContent('home'))
  await ensureEditableStorage()
  return validateHomeContent(JSON.parse(await readFile(getContentPath('home.json'), 'utf8')))
}

export async function writeHomeContent(value) {
  const content = validateHomeContent(value)
  if (isSupabaseStorageEnabled()) return validateHomeContent(await writeSupabaseContent('home', content))
  await ensureEditableStorage()
  const contentPath = getContentPath('home.json')
  const temporaryPath = `${contentPath}.${randomBytes(8).toString('hex')}.tmp`
  await writeFile(temporaryPath, `${JSON.stringify(content, null, 2)}\n`, 'utf8')
  await rename(temporaryPath, contentPath)
  return content
}

export async function publicHomeContentHandler(_request, response) {
  try {
    const content = await readHomeContent()
    response.setHeader('Cache-Control', 'no-store')
    if (typeof response.status === 'function') return response.status(200).json(content)
    response.statusCode = 200
    response.setHeader('Content-Type', 'application/json')
    return response.end(JSON.stringify(content))
  } catch {
    if (typeof response.status === 'function') return response.status(500).json({ error: 'Home content is unavailable.' })
    response.statusCode = 500
    response.setHeader('Content-Type', 'application/json')
    return response.end(JSON.stringify({ error: 'Home content is unavailable.' }))
  }
}
