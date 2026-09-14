import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import contactHandler from './api/contact.js'
import { publicAboutContentHandler } from './server/content/about.js'
import { publicHomeContentHandler } from './server/content/home.js'
import { publicProjectsContentHandler } from './server/content/projects.js'

const contactApiPlugin = () => ({
  name: 'local-contact-api',
  configureServer(server) {
    server.middlewares.use('/api/contact', (request, response) => contactHandler(request, response))
  },
})

const publicContentPlugin = () => ({
  name: 'local-public-content-api',
  configureServer(server) {
    server.middlewares.use('/api/content/home', (request, response) => publicHomeContentHandler(request, response))
    server.middlewares.use('/api/content/about', (request, response) => publicAboutContentHandler(request, response))
    server.middlewares.use('/api/content/projects', (request, response) => publicProjectsContentHandler(request, response))
  },
})

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''))
  return {
    plugins: [react(), tailwindcss(), contactApiPlugin(), publicContentPlugin()],
    server: {
      proxy: {
        '/api/edit': 'http://localhost:3000',
        // Runtime uploads are written by Express after Vite starts. Serve them
        // from that same source instead of falling through to Vite's SPA HTML.
        '/uploads': 'http://localhost:3000',
      },
      // Content saves and uploads are handled by Express. Ignoring those
      // files prevents a Vite reload from resetting the current Edit section.
      watch: {
        ignored: ['**/node_modules/**', '**/content/**', '**/public/uploads/**'],
      },
    },
  }
})
