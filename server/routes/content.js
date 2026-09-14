import { Router } from 'express'
import { publicAboutContentHandler } from '../content/about.js'
import { publicHomeContentHandler } from '../content/home.js'
import { publicProjectsContentHandler } from '../content/projects.js'

const router = Router()

router.get('/home', publicHomeContentHandler)
router.get('/about', publicAboutContentHandler)
router.get('/projects', publicProjectsContentHandler)

export default router
