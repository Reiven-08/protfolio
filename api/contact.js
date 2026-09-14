const CONTACT_RECIPIENT = 'reiven.connect@gmail.com'
const DEFAULT_FROM = 'Reiven Portfolio <onboarding@resend.dev>'
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const CONTACT_METHODS = new Set(['Email', 'WhatsApp', 'Facebook Messenger', 'Instagram', 'Discord', 'Other'])

const escapeHtml = (value) => value.replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
}[character]))

const parseBody = (body) => {
  if (typeof body === 'string') {
    try { return JSON.parse(body) } catch { return {} }
  }
  return body && typeof body === 'object' ? body : {}
}

const readBody = async (request) => {
  if (request.body !== undefined) return parseBody(request.body)

  let rawBody = ''
  for await (const chunk of request) {
    rawBody += chunk
    if (rawBody.length > 10_000) return {}
  }
  return parseBody(rawBody)
}

const sendJson = (response, status, payload) => {
  if (typeof response.status === 'function') return response.status(status).json(payload)
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(payload))
}

export default async function contactHandler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return sendJson(response, 405, { error: 'Method not allowed.' })
  }

  const { firstName, email, message, preferredContactMethod, contactDetail } = await readBody(request)
  const cleanName = typeof firstName === 'string' ? firstName.trim() : ''
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  const cleanMessage = typeof message === 'string' ? message.trim() : ''
  const cleanPreferredContactMethod = typeof preferredContactMethod === 'string' ? preferredContactMethod.trim() : ''
  const cleanContactDetail = typeof contactDetail === 'string' ? contactDetail.trim() : ''

  if (!cleanName || !cleanEmail || !cleanMessage) {
    return sendJson(response, 400, { error: 'First name, email, and message are required.' })
  }
  if (cleanName.length > 100 || cleanEmail.length > 254 || cleanMessage.length > 5000 || cleanContactDetail.length > 500) {
    return sendJson(response, 400, { error: 'One or more fields are too long.' })
  }
  if (!EMAIL_PATTERN.test(cleanEmail)) {
    return sendJson(response, 400, { error: 'Please provide a valid email address.' })
  }
  if (cleanPreferredContactMethod && !CONTACT_METHODS.has(cleanPreferredContactMethod)) {
    return sendJson(response, 400, { error: 'Please choose a valid preferred contact method.' })
  }
  if (!process.env.RESEND_API_KEY) {
    return sendJson(response, 503, { error: 'Email delivery is not configured yet.' })
  }

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || DEFAULT_FROM,
        to: [CONTACT_RECIPIENT],
        reply_to: cleanEmail,
        subject: `New portfolio message from ${cleanName}`,
        text: `Name: ${cleanName}\nEmail: ${cleanEmail}\nPreferred Contact: ${cleanPreferredContactMethod || 'Not provided'}\nContact Detail: ${cleanPreferredContactMethod === 'Email' ? 'Not needed' : cleanContactDetail || 'Not provided'}\n\nMessage:\n${cleanMessage}`,
        html: `<h2>New portfolio message</h2><p><strong>Name:</strong> ${escapeHtml(cleanName)}</p><p><strong>Email:</strong> ${escapeHtml(cleanEmail)}</p><p><strong>Preferred Contact:</strong> ${escapeHtml(cleanPreferredContactMethod || 'Not provided')}</p><p><strong>Contact Detail:</strong> ${escapeHtml(cleanPreferredContactMethod === 'Email' ? 'Not needed' : cleanContactDetail || 'Not provided')}</p><p><strong>Message:</strong></p><p>${escapeHtml(cleanMessage).replace(/\n/g, '<br>')}</p>`,
      }),
    })

    if (!resendResponse.ok) {
      const resendError = await resendResponse.json().catch(() => ({}))
      console.error('Resend contact request failed:', resendError)
      return sendJson(response, 502, { error: 'Unable to send your message right now.' })
    }

    return sendJson(response, 200, { ok: true })
  } catch (error) {
    console.error('Contact endpoint failed:', error)
    return sendJson(response, 502, { error: 'Unable to send your message right now.' })
  }
}
