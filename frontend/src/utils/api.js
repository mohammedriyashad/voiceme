// src/utils/api.js — All calls go to FastAPI on :8000 via Vite proxy
import axios from 'axios'

const http = axios.create({ baseURL: '/api', timeout: 15000 })

// ── Symbols ──────────────────────────────────────────────────
export const searchSymbols  = (kw, limit=6)  => http.get(`/symbols/search/${encodeURIComponent(kw)}?limit=${limit}`)
export const addSymbol      = (sym)          => http.post('/symbols/add', sym)
export const removeSymbol   = (i)            => http.delete(`/symbols/remove/${i}`)
export const clearSymbols   = ()             => http.delete('/symbols/clear')
export const getCustomSymbols = (childId)    => http.get(`/symbols/custom/list${childId ? `?child_id=${childId}` : ''}`)

// ── LLM ──────────────────────────────────────────────────────
export const generateSentence = ()           => http.post('/llm/generate')

// ── Speech ───────────────────────────────────────────────────
export const updateSpeech   = (text)         => http.post('/speech/update', { text })
export const clearSpeech    = ()             => http.delete('/speech/clear')

// ── Profiles ─────────────────────────────────────────────────
export const getProfiles    = ()             => http.get('/profiles/')
export const createProfile  = (data)        => http.post('/profiles/', data)
export const getProfile     = (id)          => http.get(`/profiles/${id}`)
export const updateProfile  = (id, data)    => http.put(`/profiles/${id}`, data)
export const deleteProfile  = (id)          => http.delete(`/profiles/${id}`)
export const activateProfile= (id)          => http.post(`/profiles/${id}/activate`)
export const endSession     = (sid)         => http.post(`/profiles/sessions/${sid}/end`)
export const getMessages    = (sid)         => http.get(`/profiles/sessions/${sid}/messages`)

// ── Alerts ───────────────────────────────────────────────────
export const getAlerts      = ()             => http.get('/alerts/')
export const getPendingAlerts = ()           => http.get('/alerts/pending')
export const markAlertRead  = (id)          => http.patch(`/alerts/${id}/read`)
export const triggerAlert   = (data)        => http.post('/alerts/trigger', data)

// ── Reports ──────────────────────────────────────────────────
export const listReports    = ()             => http.get('/reports/list')
export const generateReport = (sid)         => http.post(`/reports/generate/${sid}`)

// ── Upload ───────────────────────────────────────────────────
export const uploadCustomSymbol = (formData) =>
  http.post('/symbols/custom/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } })

export const uploadProfilePhoto = (id, formData) =>
  http.post(`/profiles/${id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })