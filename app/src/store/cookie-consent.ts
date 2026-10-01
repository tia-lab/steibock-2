import { create } from 'zustand'
import {
	createJSONStorage,
	persist,
	type StateStorage
} from 'zustand/middleware'

export type CookieConsentStatus = 'pending' | 'accepted' | 'declined'

type CookieConsentState = {
	status: CookieConsentStatus
	expiresAt: number | null
	updatedAt: number | null
}

type CookieConsentActions = {
	accept: (retentionDays?: number | null) => void
	decline: (retentionDays?: number | null) => void
	reset: () => void
}

export type CookieConsentStore = CookieConsentState & CookieConsentActions

const storageKey = 'ubiq-cookie-consent'
const second = 1000
const day = 24 * 60 * 60 * second
const fallbackCookieMaxAge = 10 * 365 * 24 * 60 * 60

const initialState: CookieConsentState = {
	status: 'pending',
	expiresAt: null,
	updatedAt: null
}

const getExpiry = (retentionDays?: number | null) => {
	if (!retentionDays || retentionDays <= 0) {
		return null
	}

	return Date.now() + retentionDays * day
}

export const isCookieConsentExpired = (expiresAt: number | null) => {
	return Boolean(expiresAt && expiresAt <= Date.now())
}

const getCookie = (name: string) => {
	if (typeof document === 'undefined') {
		return null
	}

	const cookie = document.cookie
		.split('; ')
		.find((item) => item.startsWith(`${name}=`))

	return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : null
}

const getMaxAge = (value: string) => {
	try {
		const parsed = JSON.parse(value) as {
			state?: Pick<CookieConsentState, 'expiresAt'>
		}

		if (!parsed.state?.expiresAt) {
			return fallbackCookieMaxAge
		}

		return Math.max(0, Math.floor((parsed.state.expiresAt - Date.now()) / second))
	} catch {
		return fallbackCookieMaxAge
	}
}

const cookieStorage: StateStorage = {
	getItem: getCookie,
	setItem: (name, value) => {
		if (typeof document === 'undefined') {
			return
		}

		document.cookie = [
			`${name}=${encodeURIComponent(value)}`,
			'path=/',
			'SameSite=Lax',
			`max-age=${getMaxAge(value)}`
		].join('; ')
	},
	removeItem: (name) => {
		if (typeof document === 'undefined') {
			return
		}

		document.cookie = `${name}=; path=/; SameSite=Lax; max-age=0`
	}
}

const createConsentState = (
	status: Exclude<CookieConsentStatus, 'pending'>,
	retentionDays?: number | null
): CookieConsentState => ({
	status,
	expiresAt: getExpiry(retentionDays),
	updatedAt: Date.now()
})

export const useCookieConsentStore = create<CookieConsentStore>()(
	persist(
		(set) => ({
			...initialState,
			accept: (retentionDays) => {
				set(createConsentState('accepted', retentionDays))
			},
			decline: (retentionDays) => {
				set(createConsentState('declined', retentionDays))
			},
			reset: () => {
				set(initialState)
			}
		}),
		{
			name: storageKey,
			storage: createJSONStorage(() => cookieStorage),
			partialize: ({ status, expiresAt, updatedAt }) => ({
				status,
				expiresAt,
				updatedAt
			})
		}
	)
)
