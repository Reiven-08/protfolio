import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { constants as fileConstants } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const seedContentDirectory = resolve(projectRoot, 'content')
const seedUploadsDirectory = resolve(projectRoot, 'public/uploads')
const contentFiles = ['home.json', 'about.json', 'projects.json']

export function isSupabaseStorageEnabled() {
  return process.env.PORTFOLIO_STORAGE_BACKEND?.trim().toLowerCase() === 'supabase'
}

function configuredStorageRoot() {
  const configured = process.env.PORTFOLIO_STORAGE_DIR?.trim()
  return configured ? resolve(configured) : null
}

export function getContentDirectory() {
  const storageRoot = configuredStorageRoot()
  return storageRoot ? resolve(storageRoot, 'content') : seedContentDirectory
}

export function getContentPath(filename) {
  return resolve(getContentDirectory(), filename)
}

export function getUploadsDirectory() {
  const storageRoot = configuredStorageRoot()
  return storageRoot ? resolve(storageRoot, 'uploads') : seedUploadsDirectory
}

async function copyIfMissing(source, destination) {
  try {
    await copyFile(source, destination, fileConstants.COPYFILE_EXCL)
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
  }
}

// A configured storage directory starts from the repository's current editable
// content, but never overwrites data already present on the persistent disk.
export async function ensureEditableStorage() {
  if (isSupabaseStorageEnabled()) return
  if (!configuredStorageRoot()) return

  const contentDirectory = getContentDirectory()
  const uploadsDirectory = getUploadsDirectory()
  await Promise.all([mkdir(contentDirectory, { recursive: true }), mkdir(uploadsDirectory, { recursive: true })])

  await Promise.all(contentFiles.map((filename) => copyIfMissing(resolve(seedContentDirectory, filename), resolve(contentDirectory, filename))))

  const seedUploads = await readdir(seedUploadsDirectory, { withFileTypes: true }).catch((error) => {
    if (error?.code === 'ENOENT') return []
    throw error
  })
  await Promise.all(seedUploads.filter((entry) => entry.isFile()).map((entry) => copyIfMissing(resolve(seedUploadsDirectory, entry.name), resolve(uploadsDirectory, entry.name))))
}
