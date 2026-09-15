import { useEffect, useState } from 'react'
import './edit-mode.css'

const EDIT_API = '/api/edit'
const dashboardItems = ['Home', 'About', 'Projects', 'Contact', 'Global / Profile', 'Media']

async function editRequest(path, options = {}) {
  const response = await fetch(`${EDIT_API}${path}`, {
    credentials: 'include',
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  const payload = response.status === 204 ? null : await response.json().catch(() => ({}))
  return { response, payload }
}

function EditLogin({ onLogin }) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (submitting) return
    const form = new FormData(event.currentTarget)
    setSubmitting(true)
    setError('')

    try {
      const { response, payload } = await editRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ username: form.get('username'), password: form.get('password') }),
      })
      if (!response.ok) throw new Error(payload.error || 'Unable to log in.')
      onLogin()
    } catch (requestError) {
      setError(requestError.message || 'Unable to log in.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="edit-mode edit-login-page">
    <form className="edit-login-card" onSubmit={submit}>
      <span className="edit-kicker">Private area</span>
      <h1>Portfolio Edit Mode</h1>
      <p>Sign in to access your private workspace.</p>
      <label>Username<input name="username" autoComplete="username" required /></label>
      <label>Password<input name="password" type="password" autoComplete="current-password" required /></label>
      {error && <p className="edit-error" role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Login'}</button>
    </form>
  </main>
}

function HomeEditor() {
  const [content, setContent] = useState(null)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mediaPreview, setMediaPreview] = useState(null)

  useEffect(() => {
    let active = true
    editRequest('/home').then(({ response, payload }) => {
      if (!active) return
      if (!response.ok) throw new Error(payload.error || 'Unable to load Home content.')
      setContent(payload)
    }).catch((error) => { if (active) setStatus(error.message || 'Unable to load Home content.') })
    return () => { active = false }
  }, [])

  const update = (key, value) => setContent((current) => ({ ...current, [key]: value }))
  const updateRole = (index, value) => update('roles', content.roles.map((role, roleIndex) => roleIndex === index ? value : role))
  const moveRole = (index, direction) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= content.roles.length) return
    const roles = [...content.roles]
    ;[roles[index], roles[nextIndex]] = [roles[nextIndex], roles[index]]
    update('roles', roles)
  }
  const updateSocial = (platform, field, value) => update('socialLinks', content.socialLinks.map((link) => link.platform === platform ? { ...link, [field]: value } : link))
  const setMediaType = (type) => update('media', { ...(content.media || { src: '', alt: 'Home hero media' }), type })

  const uploadMedia = async (file, type) => {
    if (!file || uploading) return
    const validExtensions = type === 'video' ? /\.(mp4|webm)$/i : /\.(jpe?g|png|webp)$/i
    if (!validExtensions.test(file.name)) {
      setStatus(type === 'video' ? 'Choose an MP4 or WebM video.' : 'Choose a JPG, JPEG, PNG, or WebP image.')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setMediaPreview({ type, src: previewUrl })
    setUploading(true)
    setStatus('Uploading media…')
    try {
      const formData = new FormData()
      formData.append('media', file)
      const response = await fetch(`${EDIT_API}/home/media`, { method: 'POST', credentials: 'include', body: formData })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Media upload failed.')
      setContent((current) => ({ ...current, media: payload.media }))
      setMediaPreview(null)
      URL.revokeObjectURL(previewUrl)
      setStatus('Media uploaded and saved. You can still save other Home changes below.')
    } catch (error) {
      setStatus(error.message || 'Media upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!content || saving) return
    setSaving(true)
    setStatus('')
    try {
      const { response, payload } = await editRequest('/home', { method: 'PUT', body: JSON.stringify(content) })
      if (!response.ok) throw new Error(payload.error || 'Unable to save Home content.')
      setContent(payload.content)
      setStatus('Home saved successfully.')
    } catch (error) {
      setStatus(error.message || 'Unable to save Home content.')
    } finally {
      setSaving(false)
    }
  }

  if (!content) return <section className="edit-home-editor"><p role="status">{status || 'Loading Home content…'}</p></section>

  return <section className="edit-home-editor" aria-label="Home editor">
    <div className="edit-home-section"><h2>Greeting / Name</h2><div className="edit-field-grid"><label>Greeting<input value={content.greeting} onChange={(event) => update('greeting', event.target.value)} maxLength="80" /></label><label>Name<input value={content.name} onChange={(event) => update('name', event.target.value)} maxLength="80" /></label></div></div>
    <div className="edit-home-section"><h2>Animated Roles</h2><p>The existing typewriter animation automatically cycles through this list.</p><div className="edit-role-list">{content.roles.map((role, index) => <div className="edit-role-row" key={`${index}-${role}`}><input value={role} onChange={(event) => updateRole(index, event.target.value)} maxLength="80" aria-label={`Role ${index + 1}`} /><button type="button" onClick={() => moveRole(index, -1)} disabled={index === 0}>↑</button><button type="button" onClick={() => moveRole(index, 1)} disabled={index === content.roles.length - 1}>↓</button><button type="button" onClick={() => update('roles', content.roles.filter((_, roleIndex) => roleIndex !== index))} disabled={content.roles.length === 1}>Delete</button></div>)}</div><button type="button" className="edit-secondary-button" onClick={() => update('roles', [...content.roles, ''])}>Add role</button></div>
    <div className="edit-home-section"><h2>Resume</h2><label>Resume URL or local public path<input value={content.resumeUrl} onChange={(event) => update('resumeUrl', event.target.value)} placeholder="https://… or /resume.pdf" maxLength="1000" /></label></div>
    <div className="edit-home-section"><h2>Social Links</h2><p>Disabled platforms remain saved but are hidden from the public hero.</p><div className="edit-social-list">{content.socialLinks.map((link) => <div className="edit-social-row" key={link.platform}><label className="edit-toggle"><input type="checkbox" checked={link.enabled} onChange={(event) => updateSocial(link.platform, 'enabled', event.target.checked)} /> <span>{link.platform}</span></label><input value={link.url} onChange={(event) => updateSocial(link.platform, 'url', event.target.value)} aria-label={`${link.platform} URL`} maxLength="1000" /></div>)}</div></div>
    <div className="edit-home-section"><h2>Hero Media</h2><p>The existing TV / monitor frame stays unchanged. Use an HTTPS URL, a public path, or upload a JPG, JPEG, PNG, WebP, MP4, or WebM file.</p>{(() => { const media = content.media || { type: 'image', src: '', alt: 'Home hero media' }; const preview = mediaPreview || content.media; return <><div className="edit-field-grid"><label>Media type<select value={media.type} onChange={(event) => setMediaType(event.target.value)}><option value="image">Image</option><option value="video">Video</option></select></label><label>Media source<input value={media.src} onChange={(event) => update('media', { ...media, src: event.target.value })} placeholder="https://… or /uploads/…" maxLength="1000" /></label></div><label>Media description<input value={media.alt} onChange={(event) => update('media', { ...media, alt: event.target.value })} maxLength="180" /></label><div className="edit-media-actions"><label className="edit-upload-button">Upload Photo<input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => uploadMedia(event.target.files?.[0], 'image')} disabled={uploading} /></label><label className="edit-upload-button">Upload Video<input type="file" accept="video/mp4,video/webm,.mp4,.webm" onChange={(event) => uploadMedia(event.target.files?.[0], 'video')} disabled={uploading} /></label><button type="button" className="edit-remove-media" onClick={() => { update('media', null); setMediaPreview(null); setStatus('Media removed. Click Save Home to keep the empty TV screen.') }} disabled={!content.media || uploading}>Remove media</button></div>{preview && <div className="edit-media-preview"><span>Preview</span>{preview.type === 'video' ? <video src={preview.src} muted loop autoPlay playsInline /> : <img src={preview.src} alt="Selected hero media preview" />}</div>}</> })()}</div>
    <div className="edit-save-row"><span role="status" aria-live="polite">{status}</span><button type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Home'}</button></div>
  </section>
}

function AboutEditor() {
  const [content, setContent] = useState(null)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [mediaPreview, setMediaPreview] = useState(null)

  useEffect(() => {
    let active = true
    editRequest('/about').then(({ response, payload }) => {
      if (!active) return
      if (!response.ok) throw new Error(payload.error || 'Unable to load About content.')
      setContent(payload)
    }).catch((error) => { if (active) setStatus(error.message || 'Unable to load About content.') })
    return () => { active = false }
  }, [])

  const update = (key, value) => setContent((current) => ({ ...current, [key]: value }))
  const updateParagraph = (index, value) => update('paragraphs', content.paragraphs.map((paragraph, paragraphIndex) => paragraphIndex === index ? value : paragraph))
  const moveParagraph = (index, direction) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= content.paragraphs.length) return
    const paragraphs = [...content.paragraphs]
    ;[paragraphs[index], paragraphs[nextIndex]] = [paragraphs[nextIndex], paragraphs[index]]
    update('paragraphs', paragraphs)
  }
  const setMediaType = (type) => update('badgeMedia', { ...(content.badgeMedia || { src: '', alt: 'About badge media' }), type })

  const uploadMedia = async (file, type) => {
    if (!file || uploading) return
    const validExtensions = type === 'video' ? /\.(mp4|webm)$/i : /\.(jpe?g|png|webp)$/i
    if (!validExtensions.test(file.name)) {
      setStatus(type === 'video' ? 'Choose an MP4 or WebM video.' : 'Choose a JPG, JPEG, PNG, or WebP image.')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setMediaPreview({ type, src: previewUrl })
    setUploading(true)
    setStatus('Uploading badge media…')
    try {
      const formData = new FormData()
      formData.append('media', file)
      const response = await fetch(`${EDIT_API}/about/media`, { method: 'POST', credentials: 'include', body: formData })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Badge media upload failed.')
      setContent(payload.content)
      setMediaPreview(null)
      URL.revokeObjectURL(previewUrl)
      setStatus('Badge media uploaded and saved. You can still save other About changes below.')
    } catch (error) {
      setStatus(error.message || 'Badge media upload failed.')
    } finally {
      setUploading(false)
    }
  }

  const save = async () => {
    if (!content || saving) return
    setSaving(true)
    setStatus('')
    try {
      const { response, payload } = await editRequest('/about', { method: 'PUT', body: JSON.stringify(content) })
      if (!response.ok) throw new Error(payload.error || 'Unable to save About content.')
      setContent(payload.content)
      setStatus('About saved successfully.')
    } catch (error) {
      setStatus(error.message || 'Unable to save About content.')
    } finally {
      setSaving(false)
    }
  }

  if (!content) return <section className="edit-home-editor"><p role="status">{status || 'Loading About content…'}</p></section>

  const media = content.badgeMedia || { type: 'image', src: '', alt: 'About badge media' }
  const preview = mediaPreview || content.badgeMedia
  return <section className="edit-home-editor" aria-label="About editor">
    <div className="edit-home-section"><h2>Heading / Introduction</h2><label>Main heading<input value={content.heading} onChange={(event) => update('heading', event.target.value)} maxLength="120" /></label><label>Intro / highlight text<textarea value={content.intro} onChange={(event) => update('intro', event.target.value)} maxLength="600" rows="3" /></label></div>
    <div className="edit-home-section"><h2>About Paragraphs</h2><p>Reorder, refine, add, or remove the readable paragraphs shown on the public About page.</p><div className="edit-paragraph-list">{content.paragraphs.map((paragraph, index) => <div className="edit-paragraph-row" key={`${index}-${paragraph}`}><textarea value={paragraph} onChange={(event) => updateParagraph(index, event.target.value)} maxLength="1500" rows="4" aria-label={`About paragraph ${index + 1}`} /><div><button type="button" onClick={() => moveParagraph(index, -1)} disabled={index === 0}>Move up</button><button type="button" onClick={() => moveParagraph(index, 1)} disabled={index === content.paragraphs.length - 1}>Move down</button><button type="button" onClick={() => update('paragraphs', content.paragraphs.filter((_, paragraphIndex) => paragraphIndex !== index))} disabled={content.paragraphs.length === 1}>Delete</button></div></div>)}</div><button type="button" className="edit-secondary-button" onClick={() => update('paragraphs', [...content.paragraphs, ''])}>Add paragraph</button></div>
    <div className="edit-home-section"><h2>ID Badge Media</h2><p>Media appears only within the existing badge portrait area. The badge frame, lanyard, and movement remain unchanged.</p><div className="edit-field-grid"><label>Media type<select value={media.type} onChange={(event) => setMediaType(event.target.value)}><option value="image">Image</option><option value="video">Video</option></select></label><label>Media source<input value={media.src} onChange={(event) => update('badgeMedia', { ...media, src: event.target.value })} placeholder="https://… or /uploads/…" maxLength="1000" /></label></div><label>Media description<input value={media.alt} onChange={(event) => update('badgeMedia', { ...media, alt: event.target.value })} maxLength="180" /></label><div className="edit-media-actions"><label className="edit-upload-button">Upload Photo<input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => uploadMedia(event.target.files?.[0], 'image')} disabled={uploading} /></label><label className="edit-upload-button">Upload Video<input type="file" accept="video/mp4,video/webm,.mp4,.webm" onChange={(event) => uploadMedia(event.target.files?.[0], 'video')} disabled={uploading} /></label><button type="button" className="edit-remove-media" onClick={() => { update('badgeMedia', null); setMediaPreview(null); setStatus('Badge media removed. Click Save About to restore the temporary portrait.') }} disabled={!content.badgeMedia || uploading}>Remove media</button></div>{preview && <div className="edit-media-preview edit-badge-media-preview"><span>Preview</span>{preview.type === 'video' ? <video src={preview.src} muted loop autoPlay playsInline /> : <img src={preview.src} alt="Selected badge media preview" />}</div>}</div>
    <div className="edit-save-row"><span role="status" aria-live="polite">{status}</span><button type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save About'}</button></div>
  </section>
}

function newProject() {
  return {
    id: `project-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    description: '',
    websiteUrl: '',
    coverImage: null,
    screenshots: [],
    number: '',
    color: '',
    art: 'blue',
  }
}

function ProjectsEditor() {
  const [content, setContent] = useState(null)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState('')
  const [previews, setPreviews] = useState({})

  useEffect(() => {
    let active = true
    editRequest('/projects').then(({ response, payload }) => {
      if (!active) return
      if (!response.ok) throw new Error(payload.error || 'Unable to load Projects content.')
      setContent(payload)
    }).catch((error) => { if (active) setStatus(error.message || 'Unable to load Projects content.') })
    return () => { active = false }
  }, [])

  const updateProject = (id, key, value) => setContent((current) => ({ ...current, projects: current.projects.map((project) => project.id === id ? { ...project, [key]: value } : project) }))
  const moveProject = (index, direction) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= content.projects.length) return
    const projects = [...content.projects]
    ;[projects[index], projects[nextIndex]] = [projects[nextIndex], projects[index]]
    setContent({ ...content, projects })
  }
  const uploadImage = async (projectId, file) => {
    if (!file || uploading) return
    if (!/\.(jpe?g|png|webp)$/i.test(file.name)) {
      setStatus('Choose a JPG, JPEG, PNG, or WebP image.')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    setPreviews((current) => ({ ...current, [projectId]: previewUrl }))
    setUploading(projectId)
    setStatus('Uploading project image…')
    try {
      // Newly added projects live in local editor state until this point.
      // Save the valid list first so the established cover-upload route can
      // find the new project without changing that route or its response.
      const { response: saveResponse, payload: savedContent } = await editRequest('/projects', { method: 'PUT', body: JSON.stringify(content) })
      if (!saveResponse.ok) throw new Error(savedContent.error || 'Save this project’s required details before uploading its cover.')
      setContent(savedContent.content)

      const formData = new FormData()
      formData.append('media', file)
      const response = await fetch(`${EDIT_API}/projects/${encodeURIComponent(projectId)}/images`, { method: 'POST', credentials: 'include', body: formData })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Project image upload failed.')
      const savedProject = payload.content.projects.find((project) => project.id === projectId)
      setContent((current) => ({ ...current, projects: current.projects.map((project) => project.id === projectId && savedProject ? { ...project, coverImage: savedProject.coverImage } : project) }))
      setStatus('Project image uploaded. Click Save Projects to keep other edits.')
    } catch (error) {
      setStatus(error.message || 'Project image upload failed.')
    } finally {
      URL.revokeObjectURL(previewUrl)
      setPreviews((current) => { const next = { ...current }; delete next[projectId]; return next })
      setUploading('')
    }
  }

  const save = async () => {
    if (!content || saving) return
    setSaving(true)
    setStatus('')
    try {
      const { response, payload } = await editRequest('/projects', { method: 'PUT', body: JSON.stringify(content) })
      if (!response.ok) throw new Error(payload.error || 'Unable to save Projects content.')
      setContent(payload.content)
      setStatus('Projects saved successfully.')
    } catch (error) {
      setStatus(error.message || 'Unable to save Projects content.')
    } finally {
      setSaving(false)
    }
  }

  if (!content) return <section className="edit-home-editor"><p role="status">{status || 'Loading Projects content…'}</p></section>

  return <section className="edit-home-editor" aria-label="Projects editor">
    <div className="edit-home-section"><h2>Projects</h2><p>Each project has its own details, website link, and cover image.</p><button type="button" className="edit-secondary-button" onClick={() => setContent((current) => ({ ...current, projects: [...current.projects, newProject()] }))}>Add project</button></div>
    <div className="edit-project-list">{content.projects.map((project, projectIndex) => <article className="edit-project-card" key={project.id}>
      <div className="edit-project-card-header"><h3>Project {projectIndex + 1}</h3><div><button type="button" onClick={() => moveProject(projectIndex, -1)} disabled={projectIndex === 0}>Move up</button><button type="button" onClick={() => moveProject(projectIndex, 1)} disabled={projectIndex === content.projects.length - 1}>Move down</button><button type="button" className="edit-danger-button" onClick={() => setContent((current) => ({ ...current, projects: current.projects.filter((item) => item.id !== project.id) }))}>Delete</button></div></div>
      <div className="edit-field-grid"><label>Project title<input value={project.title} onChange={(event) => updateProject(project.id, 'title', event.target.value)} maxLength="140" /></label><label>Project URL / website link<input value={project.websiteUrl} onChange={(event) => updateProject(project.id, 'websiteUrl', event.target.value)} placeholder="https://myproject.com" maxLength="1000" /></label></div>
      <label>Project description<input value={project.description} onChange={(event) => updateProject(project.id, 'description', event.target.value)} maxLength="500" /></label>
      <div className="edit-project-media"><h4>Cover screenshot</h4><p>Shown on the existing public project card. Uploading a cover does not affect other projects.</p>{(previews[project.id] || project.coverImage?.src) && <img className="edit-project-cover-preview" src={previews[project.id] || project.coverImage.src} alt="Project cover preview" />}<label className="edit-upload-button">{project.coverImage ? 'Replace cover' : 'Upload cover'}<input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => uploadImage(project.id, event.target.files?.[0])} disabled={Boolean(uploading)} /></label><button type="button" className="edit-remove-media" onClick={() => updateProject(project.id, 'coverImage', null)} disabled={!project.coverImage || Boolean(uploading)}>Remove cover</button></div>
    </article>)}</div>
    <div className="edit-save-row"><span role="status" aria-live="polite">{status}</span><button type="button" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Projects'}</button></div>
  </section>
}

function EditDashboard({ onLogout }) {
  const [loggingOut, setLoggingOut] = useState(false)
  const [activeSection, setActiveSection] = useState('Home')

  const logout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try { await editRequest('/logout', { method: 'POST' }) } finally { onLogout() }
  }

  return <main className="edit-mode edit-dashboard">
    <header className="edit-dashboard-header"><a href="/" className="edit-brand">REIVEN</a><button onClick={logout} disabled={loggingOut}>{loggingOut ? 'Logging out…' : 'Logout'}</button></header>
    <section className="edit-dashboard-content">
      <div><span className="edit-kicker">Private workspace</span><h1>Edit Mode</h1><p>Home, About, and Projects content are ready to edit. Your public layout remains unchanged.</p></div>
      <nav className="edit-dashboard-nav" aria-label="Edit sections">{dashboardItems.map((item) => { const ready = item === 'Home' || item === 'About' || item === 'Projects'; return <button type="button" key={item} onClick={() => ready && setActiveSection(item)} disabled={!ready} aria-current={activeSection === item ? 'page' : undefined}>{item}{ready ? <span>Ready</span> : <span>Coming soon</span>}</button> })}</nav>
      {activeSection === 'Home' && <HomeEditor />}
      {activeSection === 'About' && <AboutEditor />}
      {activeSection === 'Projects' && <ProjectsEditor />}
    </section>
  </main>
}

export default function EditMode() {
  const [state, setState] = useState('checking')

  useEffect(() => {
    let active = true
    editRequest('/session').then(({ response }) => {
      if (active) setState(response.ok ? 'authenticated' : 'logged-out')
    }).catch(() => { if (active) setState('logged-out') })
    return () => { active = false }
  }, [])

  if (state === 'checking') return <main className="edit-mode edit-loading">Checking secure session…</main>
  if (state === 'authenticated') return <EditDashboard onLogout={() => setState('logged-out')} />
  return <EditLogin onLogin={() => setState('authenticated')} />
}
