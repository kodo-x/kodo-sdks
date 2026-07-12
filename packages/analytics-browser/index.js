const fetch = require("cross-fetch")

class Kodo {
	static kodoApiKey = null
	static kodoUserId = null
	static kodoExternalId = null
	static kodoTrackQueue = []
	static kodoAnonymousId = ""
	static kodoSessionId = null
	static kodoAllowCookies = false
	static kodoCookieSameSiteSetting = "Strict"
	static kodoLocationEnrichmentEnabled = true
	static kodoDeviceDataEnrichmentEnabled = true
	static kodoDefaultTrackingProperties = {}
	static kodoCustomQueryParamsToCollect = []
	static kodoDisableUserIdStorage = false
	static kodoCookieExpiryDays = 365
	static kodoConsecutiveFailures = 0
	static kodoMaxConsecutiveFailures = 3
	static kodoRetryDelay = 1000 // 1 second delay between retries
	static kodoEndpoint = "https://integration.api.kodo.co"
	static kodoPathOverrides = {}

	static initialize(apiKey, options) {
		try {
			const shouldDisableCommonBotsBlocking = "blockCommonBots" in options && options["blockCommonBots"] == false
			if (!shouldDisableCommonBotsBlocking && Kodo.isBotUserAgent(window.navigator.userAgent)) {
				console.info("Common bot detected. Kodo SDK will not initialize.")
				return
			}

			Kodo.kodoApiKey = apiKey

			if ("endpoint" in options && typeof options["endpoint"] === "string") {
				Kodo.kodoEndpoint = options["endpoint"]
				if (!/^https?:\/\//i.test(Kodo.kodoEndpoint)) {
					console.info("Kodo: endpoint should include a scheme e.g. https:// — requests may resolve relative to the current page.")
				}
			}

			if (
				"pathOverride" in options &&
				typeof options["pathOverride"] === "object" &&
				options["pathOverride"] !== null &&
				!Array.isArray(options["pathOverride"])
			) {
				Kodo.kodoPathOverrides = options["pathOverride"]
			}

			if ("allowCookies" in options && options["allowCookies"] == true) {
				Kodo.kodoAllowCookies = true
			}

			if ("cookieSameSiteSetting" in options && options["cookieSameSiteSetting"] == "Lax") {
				Kodo.kodoCookieSameSiteSetting = "Lax"
			}

			if ("cookieExpiryDays" in options && typeof options["cookieExpiryDays"] === "number") {
				Kodo.kodoCookieExpiryDays = options["cookieExpiryDays"]
			}

			if ("disableUserIdStorage" in options && options["disableUserIdStorage"] == true) {
				Kodo.kodoDisableUserIdStorage = true
			}

			let anonymousIdOverride = null
			if ("anonymousIdOverride" in options && typeof options["anonymousIdOverride"] === "string") {
				anonymousIdOverride = options["anonymousIdOverride"]
			}

			Kodo.kodoAnonymousId = Kodo.getOrCreateAnonymousId(anonymousIdOverride)
			Kodo.kodoUserId = Kodo.getUserId()
			Kodo.kodoTrackQueue = Kodo.loadEventsFromStorage()

			if ("trackSession" in options && options["trackSession"] == false) {
				// don't setup session id
			} else {
				Kodo.setupSessionId()
			}

			if ("autoEnrich" in options && options["autoEnrich"] == false) {
				Kodo.kodoLocationEnrichmentEnabled = false
				Kodo.kodoDeviceDataEnrichmentEnabled = false
			}

			if ("defaultTrackingProperties" in options && typeof options["defaultTrackingProperties"] === "object") {
				Kodo.kodoDefaultTrackingProperties = options["defaultTrackingProperties"]
			}

			if (
				"customQueryParamsToCollect" in options &&
				Array.isArray(options["customQueryParamsToCollect"]) === true
			) {
				Kodo.kodoCustomQueryParamsToCollect = options["customQueryParamsToCollect"]
			}

			Kodo.startFlushInterval()

			if ("autoCapture" in options) {
				Kodo.setupAutoTracking(options["autoCapture"])
			}

			if (Kodo.kodoDisableUserIdStorage == true && Kodo.kodoUserId != null) {
				Kodo.getStorage()?.removeItem("kodo-userId")
			}
		} catch (error) {
			console.info("Failed to initialize Kodo SDK: ", error)
		}
	}

	static updateDefaultTrackingProperties(properties) {
		if (typeof properties !== "object") {
			console.info("Kodo defaultTrackingProperties must be an object.")
			return
		}

		Kodo.kodoDefaultTrackingProperties = properties
	}

	static getStorage() {
		if (typeof window === "undefined") {
			return null
		}

		return {
			setItem: (key, value) => {
				try {
					let shouldSkipForLocalStorage = Kodo.kodoDisableUserIdStorage == true && key === "kodo-userId"
					if (!shouldSkipForLocalStorage && Kodo.isLocalStorageAccessible())
						localStorage.setItem(key, value)

					let shouldSkipForCookieStorage = key == "kodo-track"
					if (Kodo.kodoAllowCookies == true && !shouldSkipForCookieStorage)
						Kodo.setCookie(key, value, Kodo.kodoCookieExpiryDays)
				} catch (error) {
					console.info("Error setting item to storage: ", error)
				}
			},
			getItem: (key) => {
				try {
					// first try fetch from cookies
					const cookieValue = (Kodo.kodoAllowCookies == true ? Kodo.getCookie(key) : null)
					if (cookieValue !== null && cookieValue !== "") return cookieValue

					// then try fetch from localStorage
					const localStorageValue = (Kodo.isLocalStorageAccessible() ? localStorage.getItem(key) : null)
					if (localStorageValue !== null && localStorageValue !== "") return localStorageValue

					// if not found in cookies or localStorage, return null
					return null
				} catch (error) {
					console.info("Error getting item from storage: ", error)
					return null
				}
			},
			removeItem: (key) => {
				try {
					if (Kodo.kodoAllowCookies == true) Kodo.eraseCookie(key)
					if (Kodo.isLocalStorageAccessible()) localStorage.removeItem(key)
				} catch (error) {
					console.info("Error removing item from storage: ", error)
				}
			},
		}
	}

	static getSessionStorage() {
		if (typeof window === "undefined" || !Kodo.isSessionStorageAccessible()) {
			return null
		}

		return {
			setItem: (key, value) => {
				try {
					sessionStorage.setItem(key, value)
				} catch (error) {
					console.info("Error setting item to session storage: ", error)
				}
			},
			getItem: (key) => {
				try {
					return sessionStorage.getItem(key)
				} catch (error) {
					console.info("Error getting item from session storage: ", error)
					return null
				}
			},
			removeItem: (key) => {
				try {
					sessionStorage.removeItem(key)
				} catch (error) {
					console.info("Error removing item from session storage: ", error)
				}
			},
		}
	}

	static setupSessionId() {
		try {
			if (!Kodo.isSessionStorageAccessible()) {
				console.info("Session storage is not accessible. Session ID handling will be disabled.")
				Kodo.clearSessionId()
				return
			}

			const currentSessionId = Kodo.getSessionId()

			if (Kodo.isStringNullOrBlank(currentSessionId)) {
				const newSessionId = Kodo.generateUUID()
				Kodo.setSessionId(newSessionId)
			}
		} catch (error) {
			console.info("Error setting up session ID: ", error)
		}
	}

	static setSessionId(newSessionId) {
		if (!Kodo.isSessionStorageAccessible()) {
			return
		}

		try {
			Kodo.kodoSessionId = newSessionId
			Kodo.getSessionStorage()?.setItem("kodo-sessionId", newSessionId)
			if (Kodo.kodoAllowCookies == true) Kodo.setCookie("kodo-sessionId", newSessionId, 0.003) // 5 minutes in days
		} catch (error) {
			console.info("Error setting session ID: ", error)
		}
	}

	static getSessionId() {
		try {
			if (!Kodo.isSessionStorageAccessible()) {
				return null
			}

			// fetch from memory
			if (!Kodo.isStringNullOrBlank(Kodo.kodoSessionId)) {
				Kodo.setSessionId(Kodo.kodoSessionId) // replenish storage
				return Kodo.kodoSessionId
			}

			// fetch from sesionStorage
			const idFromSessionStorage = Kodo.getSessionStorage()?.getItem("kodo-sessionId")
			if (!Kodo.isStringNullOrBlank(idFromSessionStorage)) {
				Kodo.setSessionId(idFromSessionStorage) // replenish storage
				return idFromSessionStorage
			}

			// fetch from cookie
			const idFromCookie = Kodo.kodoAllowCookies == true ? Kodo.getCookie("kodo-sessionId") : null
			if (!Kodo.isStringNullOrBlank(idFromCookie)) {
				Kodo.setSessionId(idFromCookie) // replenish storage
				return idFromCookie
			}

			// otherwise return null
			return null
		} catch (error) {
			console.info("Error getting session ID: ", error)
			return null
		}
	}

	static clearSessionId() {
		Kodo.kodoSessionId = null
	}

	static setupAutoTracking(autoCaptureOptions) {
		if (typeof autoCaptureOptions !== "object") {
			// The typeof operator returns " object " for arrays because in JavaScript arrays are objects.
			console.info("Kodo autoCapture must be an array.")
			return
		}

		if (autoCaptureOptions.includes("page_views") || autoCaptureOptions.includes("all")) {
			Kodo.setupPageViewListener()
		}

		if (autoCaptureOptions.includes("page_leaves") || autoCaptureOptions.includes("all")) {
			Kodo.setupPageLeaveListener()
		}

		if (autoCaptureOptions.includes("clicks") || autoCaptureOptions.includes("all")) {
			Kodo.setupClickListener()
		}
	}

	static setupPageViewListener() {
		// Check if running in a browser environment
		if (typeof window === "undefined") {
			return
		}

		window.addEventListener("pageshow", async (event) => {
			await Kodo.trackPageView()
		})
	}

	static setupPageLeaveListener() {
		// Check if running in a browser environment
		if (typeof window === "undefined") {
			return
		}

		// TBD: what's best to use pagehide or beforeunload
		window.addEventListener("pagehide", async (event) => {
			await Kodo.trackPageLeave()
		})
	}

	static async trackPageView() {
		await Kodo.track({
			event: "page_view",
			properties: {
				...Kodo.getPageProperties(),
				...(Kodo.getReferrerProperties() ?? {}),
				...(Kodo.getUTMProperties() ?? {}),
				...(Kodo.getPaidAdProperties() ?? {}),
			},
			addToQueue: false,
		})
	}

	static setupClickListener() {
		// Check if running in a browser environment
		if (typeof window === "undefined") {
			return
		}

		document.addEventListener("click", async (event) => {
			const element = event.target.closest('a, button, input[type="submit"], input[type="button"]')

			// If the clicked element or its parent is not what we want to track, return early.
			if (!element) return

			await Kodo.trackClick(element)
		})
	}

	static async trackClick(element) {
		const properties = {
			elementTagName: element.tagName,
			elementInnerText:
				element.innerText && element.innerText.length < 200 ? element.innerText.trim() : undefined,
			elementId: element.id && element.id !== "" ? element.id : undefined,
			...Kodo.getPageProperties(),
		}

		// Filter out properties that are undefined
		const filteredProperties = Object.keys(properties).reduce((obj, key) => {
			if (properties[key] !== undefined) {
				obj[key] = properties[key]
			}
			return obj
		}, {})

		await Kodo.track({
			event: "click",
			properties: {
				...filteredProperties,
			},
			addToQueue: true,
		})
	}

	static async trackPageLeave() {
		await Kodo.track({
			event: "page_leave",
			properties: {
				...Kodo.getPageProperties(),
				...(Kodo.getReferrerProperties() ?? {}),
				...(Kodo.getUTMProperties() ?? {}),
				...(Kodo.getPaidAdProperties() ?? {}),
			},
			addToQueue: true,
		})
	}

	static isApiKeyProvided() {
		return Kodo.kodoApiKey !== null
	}

	static getOrCreateAnonymousId(override) {
		if (override) {
			// Update anonymousId in memory + local + cookie storage to prevent it from expiring
			Kodo.kodoAnonymousId = override
			Kodo.getStorage()?.setItem("kodo-anonymousId", override)

			return override
		}

		let anonymousId
		if (Kodo.isStringNullOrBlank(Kodo.kodoAnonymousId)) {
			// default value is '' which means it hasn't been set yet
			// fetch from storage, if it isn't there then create a new ID
			anonymousId = Kodo.getStorage()?.getItem("kodo-anonymousId") ?? Kodo.createNewAnonymousId()
		} else {
			// otherwise value is set
			anonymousId = Kodo.kodoAnonymousId
		}

		// Update anonymousId in memory + local + cookie storage to prevent it from expiring
		Kodo.kodoAnonymousId = anonymousId
		Kodo.getStorage()?.setItem("kodo-anonymousId", anonymousId)

		return anonymousId
	}

	static createNewAnonymousId() {
		return Kodo.generateUUID()
	}

	static generateUUID() {
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
			let r = (Math.random() * 16) | 0,
				v = c == "x" ? r : (r & 0x3) | 0x8
			return v.toString(16)
		})
	}

	static getUserId() {
		let userId = Kodo.kodoUserId || Kodo.getStorage()?.getItem("kodo-userId")

		// clean up any wrongly stored user ids
		let shouldForceUpdate = false

		// handle edge case values
		if (Kodo.isStringNullOrBlank(userId)) {
			userId = null
			shouldForceUpdate = true
		}

		if (userId || shouldForceUpdate) {
			// Update userId in local storage to prevent it from expiring
			Kodo.getStorage()?.setItem("kodo-userId", userId)
		}

		return userId
	}

	static getAnonymousId() {
		return Kodo.getOrCreateAnonymousId()
	}

	static setUserId(userId) {
		Kodo.kodoUserId = userId
		Kodo.getStorage()?.setItem("kodo-userId", userId)
	}

	static setExternalId(externalId) {
		Kodo.kodoExternalId = externalId
		Kodo.getStorage()?.setItem("kodo-externalId", externalId)
	}

	static loadEventsFromStorage() {
		try {
			const events = Kodo.getStorage()?.getItem("kodo-track")
			return events ? JSON.parse(events) : []
		} catch (error) {
			console.info("Failed to get tracking events from storage: ", error)
			Kodo.getStorage()?.removeItem("kodo-track")
			return []
		}
	}

	static async reset() {
		// Firstly, flush any pending events
		await Kodo.checkQueue(Kodo.kodoTrackQueue, "event/ingest/batch", true)

		// Clear identified user stored data
		Kodo.kodoUserId = null
		Kodo.getStorage()?.removeItem("kodo-userId")

		Kodo.kodoExternalId = null
		Kodo.getStorage()?.removeItem("kodo-externalId")
	}

	static startFlushInterval() {
		setInterval(async () => {
			await Kodo.checkQueue(Kodo.kodoTrackQueue, "event/ingest/batch", true)
		}, 1500)
	}

	static async identify(parameters) {
		// sanity check API key
		if (!Kodo.isApiKeyProvided()) {
			console.info("API key not provided. Cannot identify user.")
			return
		}

		// sanity check parameters
		if (!parameters || typeof parameters !== "object") {
			console.info("Invalid parameters passed to track method")
			return
		}

		// sanity check userId
		let userId = parameters.userId || Kodo.kodoUserId
		if (userId && (typeof userId !== "string" || Kodo.isStringNullOrBlank(userId))) userId = null
		if (userId !== Kodo.kodoUserId) Kodo.setUserId(userId)

		// sanity check externalId
		let externalId = parameters.externalId || Kodo.kodoExternalId || Kodo.getExternalIdQueryParam()
		if (externalId && (typeof externalId !== "string" || Kodo.isStringNullOrBlank(externalId))) externalId = null
		if (externalId !== Kodo.kodoExternalId) Kodo.setExternalId(externalId)

		// sanity check properties
		const properties = parameters.properties ?? {}
		if (typeof properties !== "object") {
			console.info("Invalid properties passed to identify method")
			return
		}

		// sanity check enrichDeviceData
		const enrichDeviceData = parameters.enrichDeviceData ?? Kodo.kodoDeviceDataEnrichmentEnabled
		if (typeof enrichDeviceData !== "boolean") {
			console.info("Invalid enrichDeviceData passed to identify method")
			return
		}

		// sanity check enrichLocationData
		const enrichLocationData = parameters.enrichLocationData ?? Kodo.kodoLocationEnrichmentEnabled
		if (typeof enrichLocationData !== "boolean") {
			console.info("Invalid enrichLocationData passed to identify method")
			return
		}

		const payload = {
			userId: userId,
			externalId: externalId,
			anonymousId: Kodo.getOrCreateAnonymousId(),
			properties: properties,
			deviceData: enrichDeviceData ? Kodo.getDeviceProperties() : null,
		}

		return await Kodo.sendRequest("profile", payload, enrichLocationData)
	}

	static async track(parameters) {
		// sanity check API key
		if (!Kodo.isApiKeyProvided()) {
			console.info("API key not provided. Cannot track event.")
			return
		}

		// sanity check parameters
		if (!parameters || typeof parameters !== "object") {
			console.info("Invalid parameters passed to track method")
			return
		}

		// sanity check event
		const event = parameters.event
		if (!event || typeof event !== "string" || Kodo.isStringNullOrBlank(event)) {
			console.info("Invalid event passed to track method")
			return
		}

		// sanity check userId
		let userId = parameters.userId || Kodo.kodoUserId
		if (userId && (typeof userId !== "string" || Kodo.isStringNullOrBlank(userId))) userId = null
		if (userId !== Kodo.kodoUserId) Kodo.setUserId(userId)

		// sanity check externalId
		let externalId = parameters.externalId || Kodo.kodoExternalId || Kodo.getExternalIdQueryParam()
		if (externalId && (typeof externalId !== "string" || Kodo.isStringNullOrBlank(externalId))) externalId = null
		if (externalId !== Kodo.kodoExternalId) Kodo.setExternalId(externalId)

		// sanity check properties
		const properties = parameters.properties ?? {}
		if (typeof properties !== "object") {
			console.info("Invalid properties passed to track method")
			return
		}

		// sanity check enrichDeviceData
		const enrichDeviceData = parameters.enrichDeviceData ?? Kodo.kodoDeviceDataEnrichmentEnabled
		if (typeof enrichDeviceData !== "boolean") {
			console.info("Invalid enrichDeviceData passed to track method")
			return
		}

		// sanity check enrichLocationData
		const enrichLocationData = parameters.enrichLocationData ?? Kodo.kodoLocationEnrichmentEnabled
		if (typeof enrichLocationData !== "boolean") {
			console.info("Invalid enrichLocationData passed to track method")
			return
		}

		const enrichPageProperties = parameters.enrichPageProperties ?? true
		if (typeof enrichPageProperties !== "boolean") {
			console.info("Invalid enrichPageProperties passed to track method")
			return
		}

		const enrichReferrerProperties = parameters.enrichReferrerProperties ?? true
		if (typeof enrichReferrerProperties !== "boolean") {
			console.info("Invalid enrichReferrerProperties passed to track method")
			return
		}

		const enrichUTMProperties = parameters.enrichUTMProperties ?? true
		if (typeof enrichUTMProperties !== "boolean") {
			console.info("Invalid enrichUTMProperties passed to track method")
			return
		}

		const enrichPaidAdProperties = parameters.enrichPaidAdProperties ?? true
		if (typeof enrichPaidAdProperties !== "boolean") {
			console.info("Invalid enrichPaidAdProperties passed to track method")
			return
		}

		// sanity check addToQueue
		const addToQueue = parameters.addToQueue ?? false
		if (typeof addToQueue !== "boolean") {
			console.info("Invalid addToQueue passed to track method")
			return
		}

		// combine event properties with any default tracking properties
		const finalProperties = {
			...properties,
			...Kodo.kodoDefaultTrackingProperties,
			...(enrichPageProperties ? Kodo.getPageProperties() : {}),
			...(enrichReferrerProperties ? Kodo.getReferrerProperties() : {}),
			...(enrichUTMProperties ? Kodo.getUTMProperties() : {}),
			...(enrichPaidAdProperties ? Kodo.getPaidAdProperties() : {}),
			...(Kodo.getCustomQueryParamProperties() || {}),
		}

		let idempotencyKey = parameters.idempotencyKey
		if (typeof idempotencyKey !== "string" || Kodo.isStringNullOrBlank(idempotencyKey)) {
			idempotencyKey = Kodo.generateUUID()
		}

		const payload = {
			timestamp: Date.now(),
			userId: userId,
			anonymousId: Kodo.getOrCreateAnonymousId(),
			externalId: externalId,
			sessionId: Kodo.getSessionId(),
			name: event,
			properties: finalProperties,
			deviceData: enrichDeviceData ? Kodo.getDeviceProperties() : null,
			idempotencyKey: idempotencyKey,
		}

		const shouldForceFlush = Kodo.getStorage() == null || addToQueue == false
		Kodo.kodoTrackQueue.push(payload)
		Kodo.saveEventsToStorage("kodo-track", Kodo.kodoTrackQueue)
		await Kodo.checkQueue(Kodo.kodoTrackQueue, "event/ingest/batch", shouldForceFlush)
		return null
	}

	static async trackBatch(events) {
		for (const event of events) {
			await Kodo.track({ ...event, addToQueue: true })
		}

		await Kodo.flush()
		return
	}

	static async flush() {
		await Kodo.checkQueue(Kodo.kodoTrackQueue, "event/ingest/batch", true)
	}

	static saveEventsToStorage(key, queue) {
		Kodo.getStorage()?.setItem(key, JSON.stringify(queue))
	}

	static async checkQueue(queue, eventType, forceFlush) {
		if (queue.length >= 10 || (forceFlush && queue.length > 0)) {
			await Kodo.flushEvents(queue, eventType)
		}
	}

	static async flushEvents(queue, eventType) {
		if (!Kodo.isApiKeyProvided()) {
			console.info("API key not provided. Cannot flush events.")
			return
		}

		// Check if we've hit the maximum consecutive failures
		if (Kodo.kodoConsecutiveFailures >= Kodo.kodoMaxConsecutiveFailures) {
			console.info(`Kodo: Max consecutive failures (${Kodo.kodoMaxConsecutiveFailures}) reached. Stopping flush attempts.`)
			// Reset the failure counter after some time to allow retrying later
			setTimeout(() => {
				Kodo.kodoConsecutiveFailures = 0
			}, 60000) // Reset after 1 minute
			return
		}

		const eventsToTrack = queue.splice(0, 10).map((event) => {
			if (typeof event.idempotencyKey !== "string" || Kodo.isStringNullOrBlank(event.idempotencyKey)) {
				return { ...event, idempotencyKey: Kodo.generateUUID() }
			}
			return event
		})
		const success = await Kodo.sendRequest(eventType, { events: eventsToTrack })
		if (success) {
			Kodo.saveEventsToStorage(`kodo-track`, queue)
			Kodo.kodoConsecutiveFailures = 0
		} else {
			// If the request fails, add the events back to the queue
			queue.push(...eventsToTrack)
			Kodo.saveEventsToStorage(`kodo-track`, queue)
			Kodo.kodoConsecutiveFailures++
		}

		// If the queue is not empty, check it again with a delay
		if (queue.length > 0) {
			setTimeout(async () => {
				await Kodo.checkQueue(queue, eventType, true)
			}, Kodo.kodoRetryDelay)
		}
	}

	static async sendRequest(endpoint, data, locationEnrich = Kodo.kodoLocationEnrichmentEnabled) {
		if (!Kodo.isApiKeyProvided()) {
			console.info("API key not provided. Cannot send request.")
			return false
		}

		// Check if we're in an iframe that might be closing/closed
		if (typeof window !== 'undefined' && window.frameElement && !document.body) {
			console.info("Kodo: Iframe appears to be closing/closed. Skipping request.")
			return false
		}

		try {
			// `endpoint` here is the request path/subroute. Allow it to be remapped via
			// pathOverride (e.g. for first-party proxies masking analytics paths), falling
			// back to the canonical path when no valid override is provided.
			const override = Kodo.kodoPathOverrides[endpoint]
			const resolvedPath = Kodo.isStringNullOrBlank(override) ? endpoint : override
			const base = Kodo.kodoEndpoint.replace(/\/+$/, "")
			const path = resolvedPath.replace(/^\/+/, "")

			await fetch(`${base}/${path}?locationEnrichment=${locationEnrich}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${Kodo.kodoApiKey}`,
				},
				body: JSON.stringify(data),
				keepalive: true,
			})

			return true
		} catch (error) {
			console.info("Kodo HTTP Error: ", error)
			return false
		}
	}

	static getPageProperties() {
		try {
			// Check if running in a browser environment
			if (typeof window === "undefined") {
				return {}
			}

			return Kodo.removeNullProperties({
				host: window.location.host,
				href: window.location.href,
				path: window.location.pathname,
				pageTitle: document.title,
			})
		} catch (error) {
			console.info("Error on getPageProperties:", error)
			return {}
		}
	}

	static getDeviceProperties() {
		try {
			// Check if running in a browser environment
			if (typeof window === "undefined") {
				return null
			}

			const userAgent = window.navigator.userAgent
			let browser, browserVersion, deviceType, os

			// Determine Browser and Browser Version
			if (userAgent.indexOf("Chrome") > -1) {
				browser = "Chrome"
				const match = userAgent.match(/Chrome\/(\d+)/)
				browserVersion = match ? match[1] : "Unknown"
			} else if (userAgent.indexOf("CriOS") > -1) {
				browser = "Chrome"
				const match = userAgent.match(/CriOS\/([\d.]+)/)
				browserVersion = match ? match[1] : "Unknown"
			} else if (userAgent.indexOf("Safari") > -1) {
				browser = "Safari"
				const match = userAgent.match(/Version\/([\d.]+)/)
				browserVersion = match ? match[1] : "Unknown"
			} else if (userAgent.indexOf("Firefox") > -1) {
				browser = "Firefox"
				const match = userAgent.match(/Firefox\/([\d.]+)/)
				browserVersion = match ? match[1] : "Unknown"
			} else if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident") > -1) {
				browser = "Internet Explorer"
				const match = userAgent.match(/(?:MSIE |rv:)(\d+)/)
				browserVersion = match ? match[1] : "Unknown"
			} else {
				browser = "Unknown"
				browserVersion = "Unknown"
			}

			// Determine Device Type
			if (/Mobi|Android/i.test(userAgent)) {
				deviceType = "Mobile"
			} else {
				deviceType = "Desktop"
			}

			// Determine OS
			if (/iPhone|iPad|iPod/i.test(userAgent)) {
				os = "iOS"
			} else if (userAgent.indexOf("Mac OS X") > -1) {
				os = "Mac OS X"
			} else if (userAgent.indexOf("Windows NT") > -1) {
				os = "Windows"
			} else if (userAgent.indexOf("Android") > -1) {
				os = "Android"
			} else if (userAgent.indexOf("Linux") > -1) {
				os = "Linux"
			} else {
				os = "Unknown"
			}

			// Determine Browser Language Preference
			const browserLanguage =
				navigator.language || navigator.userLanguage || navigator.browserLanguage || "Unknown"

			return Kodo.removeNullProperties({
				userAgent: userAgent,
				browser: browser,
				browserVersion: browserVersion,
				deviceType: deviceType,
				os: os,
				screenWidth: window.screen.width,
				screenHeight: window.screen.height,
				browserWidth: window.innerWidth,
				browserHeight: window.innerHeight,
				browserLanguage: browserLanguage,
			})
		} catch (error) {
			console.info("Error:", error)
			return null
		}
	}

	static getCustomQueryParamProperties() {
		try {
			// Check if there are any custom query parameters to collect
			if (Kodo.kodoCustomQueryParamsToCollect.length == 0) return null

			// Check if running in a browser environment
			if (typeof window === "undefined") {
				return null
			}

			// Pickup any custom query parameters from the href, default to null if it doesn't exist
			let locationHref = window.location.href
			const urlSearchParams = new URLSearchParams(new URL(locationHref).search)

			let customQueryParams = {}
			Kodo.kodoCustomQueryParamsToCollect.forEach((param) => {
				customQueryParams[param] = urlSearchParams.get(param) || null
			})

			// Remove any null properties from the object before returning
			return Kodo.removeNullProperties(customQueryParams)
		} catch (error) {
			console.info("Error for getCustomQueryParamProperties(): ", error)
			return null
		}
	}

	static getUTMProperties() {
		try {
			// Check if running in a browser environment
			if (typeof window === "undefined") {
				return null
			}

			let locationHref = window.location.href

			// Extract query parameters
			const urlSearchParams = new URLSearchParams(new URL(locationHref).search)
			let queryParams = {
				utmSource: urlSearchParams.get("utm_source") || null,
				utmMedium: urlSearchParams.get("utm_medium") || null,
				utmCampaign: urlSearchParams.get("utm_campaign") || null,
				utmTerm: urlSearchParams.get("utm_term") || null,
				utmContent: urlSearchParams.get("utm_content") || null,
				utmId: urlSearchParams.get("utm_id") || null,
				utmSourcePlatform: urlSearchParams.get("utm_source_platform") || null,
			}

			return Kodo.removeNullProperties(queryParams)
		} catch (error) {
			console.info("Error for getUTMProperties(): ", error)
			return null
		}
	}

	static getExternalIdQueryParam() {
		try {
			// Check if running in a browser environment
			if (typeof window === "undefined") {
				return null
			}

			let locationHref = window.location.href
			const urlSearchParams = new URLSearchParams(new URL(locationHref).search)
			return urlSearchParams.get("kodoeid") || null
		} catch (error) {
			console.info("Error for getExternalIdQueryParam(): ", error)
			return null
		}
	}

	static getPaidAdProperties() {
		try {
			// Check if running in a browser environment
			if (typeof window === "undefined") {
				return null
			}

			let locationHref = window.location.href

			// Extract query parameters
			const urlSearchParams = new URLSearchParams(new URL(locationHref).search)
			let queryParams = {
				gclid: urlSearchParams.get("gclid") || null,
				fbclid: urlSearchParams.get("fbclid") || null,
				msclkid: urlSearchParams.get("msclkid") || null,
			}

			return Kodo.removeNullProperties(queryParams)
		} catch (error) {
			console.info("Error for getPaidAdProperties(): ", error)
			return null
		}
	}

	static getReferrerProperties() {
		try {
			// Check if running in a browser environment
			if (typeof window === "undefined") {
				return null
			}

			return Kodo.removeNullProperties({
				referrerHref: document.referrer !== "" ? document.referrer : null,
				referrerHost: document.referrer ? new URL(document.referrer).hostname : null,
			})
		} catch (error) {
			console.info("Error getReferrerProperties(): ", error)
			return null
		}
	}

	// Utility function to set a cookie
	static setCookie(name, value, days) {
		try {
			let expires = ""

			if (days) {
				const date = new Date()
				date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
				expires = "; expires=" + date.toUTCString()
			}

			// Set SameSite setting
			const sameSite = `; SameSite=${Kodo.kodoCookieSameSiteSetting}`

			// Dynamically determine the base domain
			const hostMatchRegex = /^(?:https?:\/\/)?(?:[^\/]+\.)?([^.\/]+\.(?:co\.uk|com\.au|com|co|money|io|is|dev|app|ai|vc|xyz|gg|net|me|health)).*$/i
			const matches = document.location.hostname.match(hostMatchRegex)
			const domain = matches ? matches[1] : ""
			const cookieDomain = domain ? "; domain=." + domain : ""

			document.cookie = name + "=" + (value ?? "") + expires + sameSite + "; Secure" + cookieDomain + "; path=/"
		} catch (error) {
			console.info("Error:", error)
		}
	}

	// Utility function to get a cookie
	static getCookie(name) {
		try {
			const nameEQ = name + "="
			const ca = document.cookie.split(";")
			for (let i = 0; i < ca.length; i++) {
				let c = ca[i]
				while (c.charAt(0) == " ") c = c.substring(1, c.length)
				if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length)
			}
			return null
		} catch (error) {
			console.info("Error:", error)
			return null
		}
	}

	// Utility function to erase a cookie
	static eraseCookie(name) {
		try {
			// Dynamically determine the base domain
			const hostMatchRegex = /[a-z0-9][a-z0-9-]+\.[a-z]{2,}$/i
			const matches = document.location.hostname.match(hostMatchRegex)
			const domain = matches ? "; domain=." + matches[0] : ""

			document.cookie = name + "=; Max-Age=-99999999; path=/" + "; domain=." + domain
		} catch (error) {
			console.info("Error:", error)
		}
	}

	// Method to check if localStorage is accessible
	static isLocalStorageAccessible() {
		try {
			// Try to use localStorage
			localStorage.setItem("kodo-ls-test", "test")
			localStorage.removeItem("kodo-ls-test")
			return true
		} catch (e) {
			// Catch any errors, including security-related ones
			return false
		}
	}

	// Method to check if sessionStorage is accessible
	static isSessionStorageAccessible() {
		try {
			const storage = window.sessionStorage
			const testKey = "kodo-ss-test"
			storage.setItem(testKey, "test")
			storage.removeItem(testKey)
			return true
		} catch (e) {
			// Catch any errors, including security-related ones
			return false
		}
	}

	// Method to check if a strings value is null or empty
	// Handles edges cases where values retrieve from storage come back as string values instead of null
	static isStringNullOrBlank(value) {
		if (typeof value !== "string") return true
		return !value || value == null || value == undefined || value == "" || value == "null" || value == "undefined"
	}

	// Method to remove null properties from an object
	// Used for cleaning up the properties object of a event before tracking
	static removeNullProperties(object) {
		return Object.fromEntries(Object.entries(object).filter(([key, value]) => value !== null))
	}

	static isBotUserAgent(userAgent) {
		// Convert to lowercase for case-insensitive matching
		const lowerUA = userAgent.toLowerCase()

		// Check for empty or missing user agent, if so, assume it's not a bot
		if (!userAgent || userAgent.trim() === "") {
			return false
		}

		// List of common bot keywords
		const botKeywords = [
			"bot",
			"crawler",
			"spider",
			"scraper",
			"indexer",
			"archiver",
			"slurp",
			"googlebot",
			"bingbot",
			"yandexbot",
			"duckduckbot",
			"baiduspider",
			"twitterbot",
			"facebookexternalhit",
			"linkedinbot",
			"msnbot",
			"slackbot",
			"telegrambot",
			"applebot",
			"pingdom",
			"ia_archiver",
			"semrushbot",
			"ahrefsbot",
			"monotybot",
			"amazon-qbusiness",
			"google-safety",
			"amazon-kendra",
		]

		// Check for bot keywords
		for (const keyword of botKeywords) {
			if (lowerUA.includes(keyword)) {
				return true
			}
		}

		// Check for common bot patterns
		if (
			/(?:^|\W)spider(?:$|\W)/i.test(userAgent) ||
			/(?:^|\W)crawl(?:er|ing)(?:$|\W)/i.test(userAgent) ||
			/(?:^|\W)bot(?:$|\W)/i.test(userAgent) ||
			/\+https?:\/\//i.test(userAgent)
		) {
			return true
		}

		// If none of the above conditions are met, it's likely not a bot
		return false
	}
}

module.exports = Kodo
