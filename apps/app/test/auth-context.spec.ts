import { describe, it, expect } from 'vitest'
import { resolveUserId, type SessionResolver } from '../server/utils/auth-context'

const headers = new Headers()

describe('resolveUserId', () => {
  it("renvoie l'id quand une session authentifiée existe", async () => {
    const getSession: SessionResolver = async () => ({ user: { id: 'usr_123' } })
    expect(await resolveUserId(getSession, headers)).toBe('usr_123')
  })

  it('renvoie undefined (sans lever) quand il n’y a pas de session', async () => {
    const getSession: SessionResolver = async () => null
    expect(await resolveUserId(getSession, headers)).toBeUndefined()
  })

  it('renvoie undefined quand la session n’a pas d’utilisateur', async () => {
    const getSession: SessionResolver = async () => ({ user: null })
    expect(await resolveUserId(getSession, headers)).toBeUndefined()
  })

  it('renvoie undefined quand l’id utilisateur est nul', async () => {
    const getSession: SessionResolver = async () => ({ user: { id: null } })
    expect(await resolveUserId(getSession, headers)).toBeUndefined()
  })

  it('transmet bien les en-têtes de la requête au résolveur de session', async () => {
    const h = new Headers({ cookie: 'better-auth.session_token=abc' })
    let received: Headers | undefined
    const getSession: SessionResolver = async ({ headers }) => {
      received = headers
      return { user: { id: 'usr_x' } }
    }
    await resolveUserId(getSession, h)
    expect(received).toBe(h)
  })
})
