import gsap from 'gsap'
import { Observer } from 'gsap/dist/Observer'
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger'

// Configuring GSAP
gsap.config({
	autoSleep: 120,
	nullTargetWarn: process.env.NODE_ENV === 'development' ? true : false
})

//gsap.ticker.fps(100)

//Moved in the useGsapConfig hook
const SCROLLTRIGGER_CONFIG: ScrollTrigger.ConfigVars = {
	//autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load',
	syncInterval: 100,
	limitCallbacks: true
}
const SCROLLTRIGGER_NORMALIZE = true
const SCROLLTRIGGER_DEFAULTS: ScrollTrigger.Vars = {}

export {
	gsap,
	Observer,
	ScrollTrigger,
	SCROLLTRIGGER_CONFIG,
	SCROLLTRIGGER_DEFAULTS,
	SCROLLTRIGGER_NORMALIZE
}
