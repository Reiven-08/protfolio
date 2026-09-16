import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import defaultAboutContent from './aboutContentFallback'
import defaultHomeContent from './homeContentFallback'
import defaultProjectsContent from './projectsContentFallback'
import EditMode from './EditMode'
import './styles.css'

// Kept in one place so private Edit Mode can manage the Hire Me destination later.
const HIRE_ME_WHATSAPP_URL = 'https://wa.me/8801850123046'
const reveal = {
  hidden: { opacity: 0, y: 36 },
  visible: { opacity: 1, y: 0, transition: { duration: .8, ease: [0.22, 1, 0.36, 1] } },
}

const ArrowUpRight = ({ className = '' }) => <span className={`icon ${className}`} aria-hidden="true">↗</span>
const MoveRight = ({ className = '' }) => <span className={`icon ${className}`} aria-hidden="true">→</span>
const DocumentIcon = () => <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 2.5h6l4 4v11H5zM11 2.5v4h4M7.5 11h5M7.5 14h5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
const InstagramIcon = () => <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="3" width="14" height="14" rx="4" fill="none" stroke="currentColor" strokeWidth="1.6" /><circle cx="10" cy="10" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.6" /><circle cx="14.35" cy="5.8" r=".9" fill="currentColor" /></svg>
const GitHubIcon = () => <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.6a7.4 7.4 0 0 0-2.34 14.42c.37.07.5-.16.5-.35v-1.42c-2.04.44-2.47-.87-2.47-.87-.34-.85-.82-1.07-.82-1.07-.67-.46.05-.45.05-.45.74.05 1.13.76 1.13.76.66 1.13 1.72.8 2.14.61.07-.48.26-.8.47-.99-1.63-.18-3.34-.82-3.34-3.63 0-.8.29-1.46.76-1.97-.08-.19-.33-.93.07-1.94 0 0 .62-.2 2.03.75A7.1 7.1 0 0 1 10 5.1c.63 0 1.26.09 1.85.25 1.4-.95 2.02-.75 2.02-.75.4 1.01.15 1.75.08 1.94.47.51.75 1.17.75 1.97 0 2.82-1.72 3.44-3.35 3.62.26.23.5.68.5 1.37v2.03c0 .2.13.43.5.35A7.4 7.4 0 0 0 10 2.6Z" fill="currentColor" /></svg>
const FacebookIcon = () => <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11.2 17v-6.05h2.03l.3-2.36H11.2V7.08c0-.68.19-1.15 1.17-1.15h1.25V3.82c-.22-.03-.96-.09-1.83-.09-1.81 0-3.05 1.1-3.05 3.13V8.6H6.7v2.36h2.04V17h2.46Z" fill="currentColor" /></svg>
const WhatsAppIcon = () => <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M16.6 9.75a6.6 6.6 0 0 1-9.76 5.8L3.4 16.6l1.04-3.35a6.6 6.6 0 1 1 12.16-3.5Zm-6.59-5.5a5.48 5.48 0 0 0-4.65 8.38l.16.26-.62 2.04 2.1-.58.25.15a5.48 5.48 0 1 0 2.76-10.25Zm3.01 7.02c-.16-.08-.96-.47-1.1-.52-.15-.06-.26-.08-.37.08-.11.16-.43.52-.53.63-.1.12-.2.13-.36.04a4.42 4.42 0 0 1-1.3-.8 4.88 4.88 0 0 1-.9-1.12c-.1-.16 0-.25.08-.33.08-.08.16-.2.24-.3.08-.1.1-.18.15-.3.05-.1.03-.21-.01-.3-.04-.08-.37-.89-.51-1.22-.14-.33-.28-.28-.38-.29h-.33c-.11 0-.3.04-.45.2-.16.16-.6.58-.6 1.42s.62 1.64.7 1.75c.1.11 1.23 1.88 2.98 2.63.42.18.75.29 1 .37.42.13.8.11 1.1.07.34-.05.96-.4 1.1-.78.13-.38.13-.7.09-.78-.04-.07-.14-.11-.3-.19Z" fill="currentColor" /></svg>

function Logo() { return <a href="#top" className="logo" aria-label="Reiven home"><i />REIVEN</a> }

function Nav() {
  const [open, setOpen] = useState(false)
  const links = [
    { label: 'Home', href: '#top' },
    { label: 'About', href: '#about' },
    { label: 'Projects', href: '#work' },
    { label: 'Contact', href: '#contact' },
  ]
  return <header className="home-header">
    <a href="#top" className="home-brand" aria-label="Reiven home">REIVEN</a>
    <nav className="home-nav">{links.map((item) => <a key={item.label} href={item.href}>{item.label}</a>)}</nav>
    <a className="home-hire" href={HIRE_ME_WHATSAPP_URL} target="_blank" rel="noreferrer">Hire Me</a>
    <button onClick={() => setOpen(!open)} className="mobile-toggle" aria-label="Toggle menu">{open ? '×' : '≡'}</button>
    <AnimatePresence>{open && <motion.nav className="mobile-nav" initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }}>
      {links.map((item, index) => <motion.a key={item.label} onClick={() => setOpen(false)} href={item.href} initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * .06 }}>{item.label}</motion.a>)}
    </motion.nav>}</AnimatePresence>
  </header>
}

function TypewriterRole({ reduced, roles }) {
  const roleList = roles.filter(Boolean)
  const roleKey = roleList.join('\u0000')
  const [state, setState] = useState({ roleIndex: 0, characterCount: 0, deleting: false })
  const role = roleList[state.roleIndex] || roleList[0] || ''

  useEffect(() => {
    setState({ roleIndex: 0, characterCount: 0, deleting: false })
  }, [roleKey])

  useEffect(() => {
    if (reduced || roleList.length <= 1 || !role) return undefined

    let delay = state.deleting ? 44 : 76
    let nextState

    if (!state.deleting && state.characterCount < role.length) {
      nextState = { ...state, characterCount: state.characterCount + 1 }
    } else if (!state.deleting) {
      delay = 1200
      nextState = { ...state, deleting: true }
    } else if (state.characterCount > 0) {
      nextState = { ...state, characterCount: state.characterCount - 1 }
    } else {
      delay = 260
      nextState = { roleIndex: (state.roleIndex + 1) % roleList.length, characterCount: 0, deleting: false }
    }

    const timer = window.setTimeout(() => setState(nextState), delay)
    return () => window.clearTimeout(timer)
  }, [reduced, role, roleList.length, state])

  return reduced || roleList.length <= 1 ? role : role.slice(0, state.characterCount)
}

function VideoWithSound({ className, src, alt, controlClass, label }) {
  const videoRef = useRef(null)
  const visibleRef = useRef(false)
  const endedRef = useRef(false)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined

    // Begin muted for policy-safe autoplay. A viewer's explicit sound choice is
    // retained for this source while viewport playback is paused and resumed.
    video.muted = true
    setMuted(true)
    endedRef.current = false

    const playIfEligible = () => {
      if (!visibleRef.current || endedRef.current) return
      const playback = video.play()
      if (playback?.catch) playback.catch(() => {})
    }
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting
      if (entry.isIntersecting) playIfEligible()
      else video.pause()
    }, { threshold: 0.5 })
    const handleEnded = () => {
      endedRef.current = true
      video.pause()
    }

    observer.observe(video)
    video.addEventListener('ended', handleEnded)
    return () => {
      observer.disconnect()
      video.removeEventListener('ended', handleEnded)
    }
  }, [src])

  const toggleSound = (event) => {
    event.preventDefault()
    event.stopPropagation()
    const video = videoRef.current
    if (!video) return
    const nextMuted = !video.muted
    video.muted = nextMuted
    setMuted(nextMuted)
    if (visibleRef.current && !endedRef.current) {
      const playback = video.play()
      if (playback?.catch) playback.catch(() => {})
    }
  }

  return <>
    <video ref={videoRef} className={className} src={src} muted={muted} playsInline aria-label={alt} />
    <button type="button" className={controlClass} onPointerDown={(event) => event.stopPropagation()} onPointerUp={(event) => event.stopPropagation()} onPointerCancel={(event) => event.stopPropagation()} onClick={toggleSound} aria-label={`${muted ? 'Unmute' : 'Mute'} ${label}`} title={`${muted ? 'Unmute' : 'Mute'} ${label}`}>{muted ? '🔇' : '🔊'}</button>
  </>
}

function HomeVideoWithBezelControls({ className, src, alt }) {
  const videoRef = useRef(null)
  const visibleRef = useRef(false)
  const endedRef = useRef(false)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined

    video.muted = true
    setMuted(true)
    endedRef.current = false
    const playIfEligible = () => {
      if (!visibleRef.current || endedRef.current) return
      const playback = video.play()
      if (playback?.catch) playback.catch(() => {})
    }
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting
      if (entry.isIntersecting) playIfEligible()
      else video.pause()
    }, { threshold: 0.5 })
    const handleEnded = () => {
      endedRef.current = true
      video.pause()
    }

    observer.observe(video)
    video.addEventListener('ended', handleEnded)
    return () => {
      observer.disconnect()
      video.removeEventListener('ended', handleEnded)
    }
  }, [src])

  const playIfVisible = () => {
    const video = videoRef.current
    if (!video || !visibleRef.current) return
    const playback = video.play()
    if (playback?.catch) playback.catch(() => {})
  }
  const toggleSound = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
    playIfVisible()
  }
  const replay = () => {
    const video = videoRef.current
    if (!video) return
    endedRef.current = false
    video.currentTime = 0
    playIfVisible()
  }

  return <>
    <div className="monitor-screen"><video ref={videoRef} className={className} src={src} muted={muted} playsInline aria-label={alt} /></div>
    <div className="monitor-controls monitor-controls-interactive">
      <span className="monitor-indicators" aria-hidden="true"><i /><i /><i /></span>
      <button type="button" className="monitor-replay-toggle" onClick={replay} aria-label="Replay Home video" title="Replay Home video"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.7 8.1A6.1 6.1 0 1 0 16 11" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" /><path d="M15.8 3.8v4.5h-4.5" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
      <button type="button" className="monitor-sound-toggle" onClick={toggleSound} aria-label={`${muted ? 'Unmute' : 'Mute'} Home video`} title={`${muted ? 'Unmute' : 'Mute'} Home video`}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.3 8.1h3.2l3.8-3v9.8l-3.8-3H3.3z" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinejoin="round" />{muted ? <path d="m13.2 8.1 3.5 3.8m0-3.8-3.5 3.8" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" /> : <path d="M13.1 7.4c.8.65.8 4.55 0 5.2m2-7c1.8 1.5 1.8 7.3 0 8.8" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" />}</svg></button>
    </div>
  </>
}

function Hero({ content }) {
  const reduced = useReducedMotion()
  const socialIcons = { instagram: InstagramIcon, github: GitHubIcon, facebook: FacebookIcon, whatsapp: WhatsAppIcon }
  const socialNames = { instagram: 'Instagram', github: 'GitHub', facebook: 'Facebook', whatsapp: 'WhatsApp' }
  const socialLinks = content.socialLinks.filter((link) => link.enabled && socialIcons[link.platform])
  const isExternalResume = /^https?:\/\//i.test(content.resumeUrl)
  return <section id="top" className="hero section-shell">
    <motion.div className="home-copy" initial={{ opacity: 0, y: reduced ? 0 : 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, ease: [0.22, 1, .36, 1] }}>
      <h1>{content.greeting} {content.name},<br /><span className="home-role"><TypewriterRole reduced={reduced} roles={content.roles} /><b className="home-cursor">|</b></span></h1>
      <p className="home-intro">I build considered digital experiences with a clean, modern point of view.</p>
      <div className="home-actions">
        <a className="home-action home-action-primary" href="#work">View My Work <MoveRight /></a>
        <a className="home-action" href="#contact">Contact Me</a>
        <a className="home-action" href={content.resumeUrl} target={isExternalResume ? '_blank' : undefined} rel={isExternalResume ? 'noreferrer' : undefined}>View Resume <DocumentIcon /></a>
      </div>
      <div className="home-socials" aria-label="Social links">
        {socialLinks.map((link) => {
          const Icon = socialIcons[link.platform]
          return <a href={link.url} target={link.url.startsWith('http') ? '_blank' : undefined} rel={link.url.startsWith('http') ? 'noreferrer' : undefined} aria-label={socialNames[link.platform]} key={link.platform}><Icon /></a>
        })}
      </div>
    </motion.div>
    <motion.div className="home-monitor-wrap" initial={{ opacity: 0, scale: .96, y: reduced ? 0 : 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: .14, duration: .9, ease: [0.22, 1, .36, 1] }}>
      <div className="home-monitor">
        <span className="monitor-brand">REIVEN</span>
        {content.media?.type === 'video'
          ? <HomeVideoWithBezelControls className={content.media.src === '/reiven-hooded-figure.svg' ? 'home-figure' : 'home-screen-media'} src={content.media.src} alt={content.media.alt} />
          : <><div className="monitor-screen">{content.media && <img className={content.media.src === '/reiven-hooded-figure.svg' ? 'home-figure' : 'home-screen-media'} src={content.media.src} alt={content.media.alt} />}</div><span className="monitor-controls" aria-hidden="true"><i /><i /><i /></span></>}
      </div>
      <div className="monitor-feet" aria-hidden="true"><i /><i /></div>
    </motion.div>
  </section>
}

function useHomeContent() {
  const [content, setContent] = useState(defaultHomeContent)

  useEffect(() => {
    let active = true
    fetch('/api/content/home', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Home content unavailable')))
      .then((savedContent) => { if (active) setContent(savedContent) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  return content
}

function useAboutContent() {
  const [content, setContent] = useState(defaultAboutContent)

  useEffect(() => {
    let active = true
    fetch('/api/content/about', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('About content unavailable')))
      .then((savedContent) => { if (active) setContent(savedContent) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  return content
}

function useProjectsContent() {
  const [content, setContent] = useState(defaultProjectsContent)

  useEffect(() => {
    let active = true
    fetch('/api/content/projects', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Projects content unavailable')))
      .then((savedContent) => { if (active) setContent(savedContent) })
      .catch(() => {})
    return () => { active = false }
  }, [])

  return content
}

function AboutBadge({ media }) {
  const reduced = useReducedMotion()
  const stageRef = useRef(null)
  const badgeRef = useRef(null)
  const lanyardRef = useRef(null)
  const lanyardPathRef = useRef(null)

  useEffect(() => {
    const stage = stageRef.current
    const badge = badgeRef.current
    const lanyard = lanyardRef.current
    const path = lanyardPathRef.current
    if (!stage || !badge || !lanyard || !path || reduced) return undefined

    const state = { angle: 0, velocity: 0, fall: 0, fallVelocity: 0, bend: 0, dragLift: 0, targetLift: 0, dragging: false, entered: false, introPlayed: false, settled: false, dragAngle: 0, grabX: 0, grabY: 0, lastX: null, lastTime: 0, frame: 0 }
    const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum)
    const apply = () => {
      const length = lanyard.getBoundingClientRect().height || 72
      const width = stage.getBoundingClientRect().width || 320
      const radians = state.angle * Math.PI / 180
      const x = Math.sin(radians) * length
      const y = length * (Math.cos(radians) - 1) + state.fall + state.dragLift
      const center = width / 2
      const endpointX = center + x
      const endpointY = length + y
      const firstControlX = center + state.bend * .18
      const secondControlX = endpointX + state.bend * .14
      const secondControlY = Math.max(length * .58, endpointY - length * .23)
      badge.style.setProperty('--badge-x', `${x.toFixed(2)}px`)
      badge.style.setProperty('--badge-y', `${y.toFixed(2)}px`)
      // The card stays almost upright while its top connection travels along the lanyard.
      // This avoids an invisible centre pivot while retaining the subtle ±10° card rotation.
      badge.style.setProperty('--badge-angle', `${clamp(state.angle * .16, -10, 10).toFixed(2)}deg`)
      lanyard.setAttribute('viewBox', `0 0 ${width} ${length}`)
      path.setAttribute('d', `M ${center} 0 C ${firstControlX} ${length * .27}, ${secondControlX} ${secondControlY}, ${endpointX} ${endpointY}`)
    }
    const run = () => {
      if (state.dragging) state.velocity += (state.dragAngle - state.angle) * .048 - state.velocity * .14
      else state.velocity += -state.angle * .017 - state.velocity * .075
      state.angle += state.velocity
      // This is a physical arc around the fixed anchor, not a rectangular stage limit.
      // The visual badge rotation remains capped separately in apply().
      if (state.angle > 62 || state.angle < -62) {
        state.angle = clamp(state.angle, -62, 62)
        state.velocity *= -.28
      }
      if (state.entered) {
        state.fallVelocity += -state.fall * .026 - state.fallVelocity * .1
        state.fall += state.fallVelocity
        if (Math.abs(state.fall) < .08 && Math.abs(state.fallVelocity) < .04) { state.fall = 0; state.fallVelocity = 0; state.entered = false }
      }
      const liftTarget = state.dragging ? state.targetLift : 0
      state.dragLift += (liftTarget - state.dragLift) * (state.dragging ? .13 : .1)
      const length = lanyard.getBoundingClientRect().height || 72
      const bendTarget = state.angle * length * .13 + state.velocity * length * .26 + state.fallVelocity * .08
      state.bend += (bendTarget - state.bend) * .17
      apply()
      const moving = state.dragging || state.entered || Math.abs(state.angle) > .03 || Math.abs(state.velocity) > .02 || Math.abs(state.bend) > .04 || Math.abs(state.dragLift) > .04
      if (moving) state.frame = requestAnimationFrame(run)
      else { state.angle = 0; state.velocity = 0; state.bend = 0; state.dragLift = 0; state.settled = true; state.frame = 0; apply() }
    }
    const startFrame = () => { if (!state.frame) state.frame = requestAnimationFrame(run) }
    const dragTarget = (event) => {
      const box = stage.getBoundingClientRect()
      const length = lanyard.getBoundingClientRect().height || 72
      const topCenterX = event.clientX - state.grabX
      const topCenterY = event.clientY - state.grabY
      const anchorX = box.left + box.width / 2
      const anchorY = box.top
      const angle = Math.atan2(topCenterX - anchorX, length) * 180 / Math.PI
      const radians = angle * Math.PI / 180
      const hangingY = anchorY + length * Math.cos(radians)
      return { angle, lift: (topCenterY - hangingY) * .24 }
    }
    const nudge = (event) => {
      if (!state.dragging || (event.pointerType && event.pointerType !== 'mouse')) return
      const now = performance.now()
      if (state.lastX !== null) {
        const speed = (event.clientX - state.lastX) / Math.max(now - state.lastTime, 12)
        const target = dragTarget(event)
        state.dragAngle = target.angle
        state.targetLift = target.lift
        state.velocity = clamp(state.velocity + speed * .09, -3.4, 3.4)
        startFrame()
      }
      state.lastX = event.clientX
      state.lastTime = now
    }
    const beginDrag = (event) => {
      // This listener is native while React's button handler is delegated, so
      // guard the control here before the badge can capture its pointer.
      if (event.target instanceof Element && event.target.closest('.badge-sound-toggle')) return
      if (!state.settled || event.button !== 0 || (event.pointerType && event.pointerType !== 'mouse')) return
      const badgeBox = badge.getBoundingClientRect()
      state.dragging = true
      state.grabX = event.clientX - (badgeBox.left + badgeBox.width / 2)
      state.grabY = event.clientY - badgeBox.top
      const target = dragTarget(event)
      state.dragAngle = target.angle
      state.targetLift = target.lift
      state.lastX = event.clientX
      state.lastTime = performance.now()
      badge.classList.add('is-dragging')
      badge.setPointerCapture(event.pointerId)
      startFrame()
    }
    const endDrag = (event) => {
      if (!state.dragging) return
      state.dragging = false
      state.targetLift = 0
      state.lastX = null
      badge.classList.remove('is-dragging')
      if (badge.hasPointerCapture(event.pointerId)) badge.releasePointerCapture(event.pointerId)
      startFrame()
    }
    const clearPointer = () => { if (!state.dragging) state.lastX = null }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || state.introPlayed) return
      state.introPlayed = true
      state.entered = true
      state.fall = -68
      state.fallVelocity = 0
      state.angle = -4.6
      state.velocity = .32
      state.bend = -10
      observer.disconnect()
      apply()
      startFrame()
    }, { threshold: .08, rootMargin: '0px 0px -8% 0px' })
    apply()
    observer.observe(badge)
    badge.addEventListener('pointermove', nudge)
    badge.addEventListener('pointerdown', beginDrag)
    badge.addEventListener('pointerup', endDrag)
    badge.addEventListener('pointercancel', endDrag)
    badge.addEventListener('pointerleave', clearPointer)
    return () => {
      observer.disconnect()
      badge.removeEventListener('pointermove', nudge)
      badge.removeEventListener('pointerdown', beginDrag)
      badge.removeEventListener('pointerup', endDrag)
      badge.removeEventListener('pointercancel', endDrag)
      badge.removeEventListener('pointerleave', clearPointer)
      cancelAnimationFrame(state.frame)
    }
  }, [reduced])

  return <div ref={stageRef} className="about-badge-stage">
    <span className="about-lanyard-anchor" aria-hidden="true" />
    <svg ref={lanyardRef} className="about-lanyard" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100"><path ref={lanyardPathRef} className="about-lanyard-path" d="M 50 0 Q 50 50 50 100" stroke="#242423" strokeWidth="8" /></svg>
    <div ref={badgeRef} className="about-badge-assembly">
      <span className="about-badge-clip" aria-hidden="true" />
      <div className="about-badge">
      <span className="about-badge-slot" aria-hidden="true" />
      <div className="about-badge-card">
        <div className="about-portrait-media" role={media ? undefined : 'img'} aria-label={media?.alt || 'Temporary hooded portrait placeholder'}>
          {media ? (media.type === 'video'
            ? <VideoWithSound className="about-badge-media" src={media.src} alt={media.alt} controlClass="badge-sound-toggle" label="About badge video" />
            : <img className="about-badge-media" src={media.src} alt={media.alt} />)
            : <><div className="about-portrait-glow" /><div className="about-figure"><div className="about-hood"><div className="about-face" /></div><div className="about-shoulders" /></div></>}
        </div>
      </div>
      </div>
    </div>
  </div>
}

function Statement({ content }) { return <section id="about" className="about section-shell">
  <div className="about-grid">
    <motion.div className="about-visual" initial={{ opacity: 0, y: 36 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .3 }} transition={{ duration: .8, ease: [0.22, 1, 0.36, 1] }}>
      <AboutBadge media={content.badgeMedia} /><span className="about-star about-star-one">✦</span><span className="about-star about-star-two">✦</span>
    </motion.div>
    <motion.div className="about-copy" initial="hidden" whileInView="visible" viewport={{ once: true, amount: .25 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: .1 } } }}>
      <motion.p className="about-overline" variants={reveal}>About Reiven</motion.p>
      <motion.h2 variants={reveal}>{content.heading}</motion.h2>
      <motion.p className="about-intro" variants={reveal}>{content.intro}</motion.p>
      <motion.div className="about-body" variants={reveal}>
        {content.paragraphs.map((paragraph, index) => <p key={`${index}-${paragraph}`}>{paragraph}</p>)}
      </motion.div>
    </motion.div>
  </div>
</section> }

function ProjectArt({ project }) {
  // Older saved projects can still have a single screenshot instead of a cover.
  // Use it only as a visual fallback so existing uploads continue to render.
  const coverImage = project.coverImage || project.screenshots?.[0] || null

  return <div className={`project-art art-${project.art}`}>
  {coverImage && <img className="project-cover-image" src={coverImage.src} alt={coverImage.alt} />}
  {!coverImage && <>
  {project.art === 'blue' && <><div className="blue-window" /><div className="blue-circle" /><b>COUNTER<br />PART</b></>}
  {project.art === 'lime' && <><div className="sunroom-sun" /><div className="sunroom-column one" /><div className="sunroom-column two" /><b>THE<br />SUNROOM</b></>}
  {project.art === 'peach' && <><div className="ground-slab"><span>CG</span></div><div className="ground-dot" /><b>COMMON<br />GROUND</b></>}
  </>}
</div> }

function Projects({ content }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const stackRef = useRef(null)
  const wheelLockRef = useRef(false)
  const wheelTimerRef = useRef(0)
  const touchStartRef = useRef(null)
  const projectCount = content.projects.length

  useEffect(() => {
    setActiveIndex((current) => Math.max(0, Math.min(current, projectCount - 1)))
  }, [projectCount])

  useEffect(() => () => window.clearTimeout(wheelTimerRef.current), [])

  const advance = (direction) => setActiveIndex((current) => {
    if (projectCount < 2) return current
    return (current + direction + projectCount) % projectCount
  })
  useEffect(() => {
    const stack = stackRef.current
    if (!stack) return undefined
    const handleWheel = (event) => {
      if (!event.deltaY) return
      // This listener is scoped to the deck, so only the card area consumes
      // vertical scrolling; page scrolling stays normal everywhere else.
      event.preventDefault()
      if (Math.abs(event.deltaY) < 8) return
      const direction = event.deltaY > 0 ? 1 : -1
      if (wheelLockRef.current) return
      advance(direction)
      wheelLockRef.current = true
      window.clearTimeout(wheelTimerRef.current)
      wheelTimerRef.current = window.setTimeout(() => { wheelLockRef.current = false }, 420)
    }
    stack.addEventListener('wheel', handleWheel, { passive: false })
    return () => stack.removeEventListener('wheel', handleWheel)
  }, [activeIndex, projectCount])
  const handleTouchStart = (event) => {
    touchStartRef.current = event.touches[0]?.clientY ?? null
  }
  const handleTouchEnd = (event) => {
    const startY = touchStartRef.current
    const endY = event.changedTouches[0]?.clientY
    touchStartRef.current = null
    if (startY === null || typeof endY !== 'number') return
    const distance = startY - endY
    if (Math.abs(distance) >= 42) advance(distance > 0 ? 1 : -1)
  }

  return <section id="work" className="projects section-shell">
  <div className="section-heading"><motion.p className="eyebrow" {...{ initial: 'hidden', whileInView: 'visible', viewport: { once: true }, variants: reveal }}>Selected work</motion.p><motion.p className="section-note" {...{ initial: 'hidden', whileInView: 'visible', viewport: { once: true }, variants: reveal }}>A selection of identities, websites and digital worlds made with curious people.</motion.p></div>
  <div ref={stackRef} className="project-stack" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} aria-label="Project card deck">{content.projects.map((project, index) => {
    const forwardDistance = (index - activeIndex + projectCount) % projectCount
    const backwardDistance = (activeIndex - index + projectCount) % projectCount
    const state = forwardDistance === 0
      ? 'is-active'
      : forwardDistance === 1
        ? 'is-back-right'
        : backwardDistance === 1
          ? 'is-back-left'
          : forwardDistance === 2
            ? 'is-back-right-deep'
            : backwardDistance === 2
              ? 'is-back-left-deep'
              : 'is-hidden'
    return <article className={`project project-stack-card ${state}`} key={project.id} aria-hidden={forwardDistance !== 0}>
    {project.websiteUrl ? <a href={project.websiteUrl} className="project-link" target="_blank" rel="noreferrer"><div className="project-media-frame"><ProjectArt project={project} /></div><div className="project-name"><h3>{project.title}</h3><span>View project <MoveRight /></span></div></a> : <div className="project-link"><div className="project-media-frame"><ProjectArt project={project} /></div><div className="project-name"><h3>{project.title}</h3></div></div>}
    </article>
  })}</div>
  {projectCount > 1 && <div className="project-stack-navigation" aria-label="Project navigation"><button type="button" onClick={() => advance(-1)} aria-label="Previous project">←</button><button type="button" onClick={() => advance(1)} aria-label="Next project">→</button></div>}
</section> }

function Contact() {
  const [formStatus, setFormStatus] = useState('Usually replies via email')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [preferredContactMethod, setPreferredContactMethod] = useState('')
  const contactDetailFields = {
    WhatsApp: { label: 'WhatsApp number', placeholder: '+880…', autoComplete: 'tel' },
    'Facebook Messenger': { label: 'Facebook profile link', placeholder: 'facebook.com/…', autoComplete: 'url' },
    Instagram: { label: 'Instagram username or profile link', placeholder: '@username or instagram.com/…', autoComplete: 'url' },
    Discord: { label: 'Discord username', placeholder: 'username', autoComplete: 'username' },
    Other: { label: 'Other contact method', placeholder: 'How should I contact you?', autoComplete: 'off' },
  }
  const contactDetailField = contactDetailFields[preferredContactMethod]

  const submitContactForm = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    const form = event.currentTarget
    if (!form.checkValidity()) {
      form.reportValidity()
      return
    }

    const formData = new FormData(form)
    setIsSubmitting(true)
    setFormStatus('Sending your message…')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: formData.get('firstName'),
          email: formData.get('email'),
          preferredContactMethod: formData.get('preferredContactMethod'),
          contactDetail: formData.get('contactDetail'),
          message: formData.get('message'),
        }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Unable to send your message right now.')

      form.reset()
      setPreferredContactMethod('')
      setFormStatus('Message sent — thank you.')
    } catch (error) {
      setFormStatus(error.message || 'Unable to send your message right now.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return <><section id="contact" className="contact"><div className="contact-grid section-shell">
  <motion.div className="contact-intro" initial="hidden" whileInView="visible" viewport={{ once: true, amount: .25 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: .1 } } }}>
    <motion.h2 variants={reveal}>Let’s build<br />something<br />meaningful<span>.</span></motion.h2>
    <motion.p variants={reveal}>Have an idea, a project, or just want to connect? Feel free to reach out.</motion.p>
    <motion.div className="contact-availability" variants={reveal}><span>Reiven / available for new projects</span><a href="mailto:reiven.connect@gmail.com">reiven.connect@gmail.com</a></motion.div>
  </motion.div>
  <motion.form className="contact-form" onSubmit={submitContactForm} initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .75, ease: [0.22, 1, .36, 1] }}>
    <h3>Tell me about your idea.</h3><p>Fill in the details below and I’ll get back to you.</p>
    <div className="contact-fields">
      <label>First name<input name="firstName" autoComplete="given-name" placeholder="Your first name" maxLength="100" required /></label>
      <label className="contact-field-wide">Email<input name="email" type="email" autoComplete="email" placeholder="you@email.com" maxLength="254" required /></label>
      <label className="contact-field-wide">Preferred contact method
        <select name="preferredContactMethod" value={preferredContactMethod} onChange={(event) => setPreferredContactMethod(event.target.value)}>
          <option value="">Select a contact method</option>
          <option value="Email">Email</option>
          <option value="WhatsApp">WhatsApp</option>
          <option value="Facebook Messenger">Facebook Messenger</option>
          <option value="Instagram">Instagram</option>
          <option value="Discord">Discord</option>
          <option value="Other">Other</option>
        </select>
      </label>
      {contactDetailField && <label className="contact-field-wide">{contactDetailField.label}<input name="contactDetail" autoComplete={contactDetailField.autoComplete} placeholder={contactDetailField.placeholder} maxLength="500" /></label>}
      <label className="contact-field-wide">Message<textarea name="message" placeholder="Tell me what you’re thinking…" rows="5" maxLength="5000" required /></label>
    </div>
    <div className="contact-form-footer"><span role="status" aria-live="polite">{formStatus}</span><button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending…' : 'Send message'} <MoveRight /></button></div>
  </motion.form>
</div></section><footer className="footer section-shell"><Logo /><span>© {new Date().getFullYear()} Reiven</span><a href="#top">Back to top ↑</a></footer></> }

function App() {
  const [loading, setLoading] = useState(true)
  const reduced = useReducedMotion()
  const homeContent = useHomeContent()
  const aboutContent = useAboutContent()
  const projectsContent = useProjectsContent()
  useEffect(() => { const timer = setTimeout(() => setLoading(false), reduced ? 0 : 1050); return () => clearTimeout(timer) }, [reduced])
  return <><AnimatePresence>{loading && <motion.div className="loader" exit={{ y: '-100%', transition: { duration: .8, ease: [0.76, 0, .24, 1] } }}><motion.div initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .5 }}><i />REIVEN</motion.div></motion.div>}</AnimatePresence><main><Nav /><Hero content={homeContent} /><Statement content={aboutContent} /><Projects content={projectsContent} /><Contact /></main></>
}

function Root() {
  return window.location.pathname.replace(/\/+$/, '') === '/edit' ? <EditMode /> : <App />
}

createRoot(document.getElementById('root')).render(<Root />)
