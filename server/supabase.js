import { createClient } from '@supabase/supabase-js'

let client

function config() {
  const url = process.env.SUPABASE_URL?.trim()
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || 'portfolio-media'

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase storage is enabled but SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not configured.')
  }

  return { url, serviceRoleKey, bucket }
}

export function getSupabaseClient() {
  const { url, serviceRoleKey } = config()
  if (!client) client = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return client
}

export async function readSupabaseContent(section) {
  const { data, error } = await getSupabaseClient()
    .from('portfolio_content')
    .select('data')
    .eq('section', section)
    .maybeSingle()

  if (error) throw new Error(`Supabase content read failed for ${section}.`)
  if (!data?.data) throw new Error(`Supabase content is not initialized for ${section}. Run the migration script first.`)
  return data.data
}

export async function writeSupabaseContent(section, content) {
  const { data, error } = await getSupabaseClient()
    .from('portfolio_content')
    .upsert({ section, data: content, updated_at: new Date().toISOString() }, { onConflict: 'section' })
    .select('data')
    .single()

  if (error || !data?.data) throw new Error(`Supabase content write failed for ${section}.`)
  return data.data
}

export async function uploadSupabaseMedia(filename, file) {
  const { bucket } = config()
  const objectKey = `uploads/${filename}`
  const { error } = await getSupabaseClient().storage.from(bucket).upload(objectKey, file.buffer, {
    contentType: file.mimetype || 'application/octet-stream',
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw new Error('Supabase media upload failed.')
  return objectKey
}

export async function removeSupabaseMedia(filename) {
  const { bucket } = config()
  await getSupabaseClient().storage.from(bucket).remove([`uploads/${filename}`])
}

export function getSupabaseMediaUrl(relativeUploadPath) {
  const { bucket } = config()
  const normalized = String(relativeUploadPath || '').replace(/^\/+/, '')
  if (!normalized || normalized.split('/').some((part) => !part || part === '.' || part === '..')) return null
  return getSupabaseClient().storage.from(bucket).getPublicUrl(`uploads/${normalized}`).data.publicUrl
}
