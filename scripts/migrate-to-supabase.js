import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
// Resolve the project .env explicitly: npm can be invoked from another working directory.
dotenv.config({ path: resolve(projectRoot, '.env'), quiet: true, override: true })

const contentDirectory = resolve(projectRoot, 'content')
const uploadsDirectory = resolve(projectRoot, 'public/uploads')
const sections = ['home', 'about', 'projects']
const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'portfolio-media'
const supabaseUrl = process.env.SUPABASE_URL?.trim()
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
const supabaseUrlDiagnostic = {
  exists: Boolean(supabaseUrl),
  hasHttpScheme: /^https?:\/\//i.test(supabaseUrl || ''),
  length: supabaseUrl?.length || 0,
}

const showHelp = process.argv.includes('--help') || process.argv.includes('-h')
if (showHelp) {
  console.log(`SUPABASE_URL diagnostic: exists=${supabaseUrlDiagnostic.exists}, hasHttpScheme=${supabaseUrlDiagnostic.hasHttpScheme}, length=${supabaseUrlDiagnostic.length}`)
  console.log('Usage: npm run migrate:supabase\n\nUploads local content and public/uploads media to Supabase. It does not delete local files.')
}

if (!showHelp && (!supabaseUrl || !serviceRoleKey)) {
  throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before running this migration.')
}

const supabase = showHelp ? null : createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
const mimeTypes = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp',
  '.mp4': 'video/mp4', '.webm': 'video/webm',
}

function findUploadSources(value, found = new Set()) {
  if (Array.isArray(value)) value.forEach((item) => findUploadSources(item, found))
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => findUploadSources(item, found))
  else if (typeof value === 'string' && value.startsWith('/uploads/')) found.add(value)
  return found
}

function isAlreadyUploaded(error) {
  return error?.statusCode === '409' || /already exists|duplicate/i.test(error?.message || '')
}

async function uploadMedia(sourcePath) {
  const filename = basename(sourcePath)
  if (!filename || filename !== sourcePath.slice('/uploads/'.length)) throw new Error(`Unsupported upload path: ${sourcePath}`)
  const file = await readFile(resolve(uploadsDirectory, filename))
  const { error } = await supabase.storage.from(bucket).upload(`uploads/${filename}`, file, {
    contentType: mimeTypes[extname(filename).toLowerCase()] || 'application/octet-stream',
    cacheControl: '31536000',
    upsert: false,
  })
  if (error && !isAlreadyUploaded(error)) throw error
  console.log(error ? `Kept existing object: ${filename}` : `Uploaded: ${filename}`)
}

async function main() {
  const documents = await Promise.all(sections.map(async (section) => [
    section,
    JSON.parse(await readFile(resolve(contentDirectory, `${section}.json`), 'utf8')),
  ]))

  const mediaPaths = new Set(documents.flatMap(([, content]) => [...findUploadSources(content)]))
  for (const sourcePath of mediaPaths) await uploadMedia(sourcePath)

  for (const [section, data] of documents) {
    const { error } = await supabase.from('portfolio_content').upsert(
      { section, data, updated_at: new Date().toISOString() },
      { onConflict: 'section' },
    )
    if (error) throw error
    console.log(`Saved ${section} content.`)
  }

  console.log('Supabase migration completed. Local files were not modified.')
}

if (!showHelp) {
  main().catch((error) => {
    console.error(`Supabase migration failed: ${error.message}`)
    process.exitCode = 1
  })
}
