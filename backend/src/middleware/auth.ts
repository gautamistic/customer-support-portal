import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextFunction, Request, Response } from 'express'
import { config } from '../config.js'

const SESSION_COOKIE = 'support_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const sessions = new Map<string, { customerId: string; email: string; expiresAt: number }>()
type User = { customerId: string; email: string; name: string; salt: Buffer; passwordHash: Buffer }
type StoredUser = { customerId: string; email: string; name: string; salt: string; passwordHash: string }
const users = new Map<string, User>()
const usersFile = join(dirname(fileURLToPath(import.meta.url)), '../../data/users.json')

function loadUsers() {
  try {
    const storedUsers = JSON.parse(readFileSync(usersFile, 'utf8')) as StoredUser[]
    for (const user of storedUsers) users.set(user.email, { ...user, salt: Buffer.from(user.salt, 'base64'), passwordHash: Buffer.from(user.passwordHash, 'base64') })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}

function saveUsers() {
  const storedUsers: StoredUser[] = [...users.values()].map((user) => ({ ...user, salt: user.salt.toString('base64'), passwordHash: user.passwordHash.toString('base64') }))
  mkdirSync(dirname(usersFile), { recursive: true })
  const temporaryFile = `${usersFile}.tmp`
  writeFileSync(temporaryFile, `${JSON.stringify(storedUsers, null, 2)}\n`, { mode: 0o600 })
  renameSync(temporaryFile, usersFile)
}

declare global { namespace Express { interface Request { customerId?: string; customerEmail?: string } } }

function hashPassword(password: string, salt: Buffer) {
  return scryptSync(password, salt, 64)
}

loadUsers()
const passwordSalt = createHash('sha256').update(config.DEMO_USER_EMAIL).digest().subarray(0, 16)
const demoPasswordHash = hashPassword(config.DEMO_USER_PASSWORD, passwordSalt)
const demoEmail = config.DEMO_USER_EMAIL.toLowerCase()
if (!users.has(demoEmail)) users.set(demoEmail, { customerId: config.DEV_CUSTOMER_ID, email: demoEmail, name: 'Jordan Miller', salt: passwordSalt, passwordHash: demoPasswordHash })

export function authenticateDemoUser(email: string, password: string) {
  const user = users.get(email.trim().toLowerCase())
  if (!user) return false
  const suppliedHash = hashPassword(password, user.salt)
  return suppliedHash.length === user.passwordHash.length && timingSafeEqual(suppliedHash, user.passwordHash)
}

export function registerUser(email: string, password: string, name: string) {
  const normalizedEmail = email.trim().toLowerCase()
  if (users.has(normalizedEmail)) return false
  const salt = randomBytes(16)
  users.set(normalizedEmail, { customerId: `customer-${randomBytes(8).toString('hex')}`, email: normalizedEmail, name, salt, passwordHash: hashPassword(password, salt) })
  saveUsers()
  return true
}

export function createSession(email = config.DEMO_USER_EMAIL) {
  const token = randomBytes(32).toString('hex')
  const user = users.get(email.toLowerCase())!
  sessions.set(token, { customerId: user.customerId, email: user.email, expiresAt: Date.now() + SESSION_TTL_MS })
  return token
}

export function getUser(email: string) { return users.get(email.trim().toLowerCase()) }

function getCookie(req: Request, name: string) {
  const cookies = req.header('cookie')?.split(';').map((item) => item.trim()) ?? []
  return cookies.find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1)
}

export function clearSession(req: Request, res: Response) {
  const token = getCookie(req, SESSION_COOKIE)
  if (token) sessions.delete(token)
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: config.NODE_ENV === 'production' })
}

export function requireCustomer(req: Request, res: Response, next: NextFunction) {
  const token = getCookie(req, SESSION_COOKIE)
  const session = token ? sessions.get(token) : undefined
  if (!session || session.expiresAt < Date.now()) {
    if (token) sessions.delete(token)
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Please log in to continue' } })
  }
  req.customerId = session.customerId
  req.customerEmail = session.email
  next()
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: config.NODE_ENV === 'production', maxAge: SESSION_TTL_MS, path: '/' })
}
