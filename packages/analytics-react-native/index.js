import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform, Dimensions, AppState, Linking } from 'react-native'
import DeviceInfo from 'react-native-device-info'
import NetInfo from '@react-native-community/netinfo'

class Kodo {
	static kodoApiKey = null
	static kodoUserId = null
	static kodoExternalId = null
	static kodoTrackQueue = []
	static kodoAnonymousId = ""
	static kodoSessionId = null
	static kodoSessionStartTime = null
	static kodoLocationEnrichmentEnabled = true
	static kodoDeviceDataEnrichmentEnabled = true
	static kodoDefaultTrackingProperties = {}
	static kodoDisableUserIdStorage = false
	static kodoConsecutiveFailures = 0
	static kodoMaxConsecutiveFailures = 3
	static kodoRetryDelay = 1000
	static kodoFlushInterval = null
	static kodoAppStateSubscription = null
	static kodoNetInfoSubscription = null
	static kodoCurrentScreen = null
	static kodoScreenStartTime = null
	static kodoNavigationRef = null
	static kodoSessionTimeout = 300000 // 5 minutes in milliseconds
	static kodoLastActivityTime = Date.now()

	static initialize(apiKey, options = {}) {
		try {
			const shouldDisableCommonBotsBlocking = "blockCommonBots" in options && options["blockCommonBots"] == false
			
			// Bot detection is less relevant in React Native, but we can check for simulators/emulators
			if (!shouldDisableCommonBotsBlocking && Kodo.isEmulatorOrSimulator()) {
				if (options.debugMode) {
					console.info("Emulator/Simulator detected. Kodo SDK initializing in debug mode.")
				}
			}

			Kodo.kodoApiKey = apiKey

			if ("disableUserIdStorage" in options && options["disableUserIdStorage"] == true) {
				Kodo.kodoDisableUserIdStorage = true
			}

			// Load stored data
			Kodo.loadStoredData().then(() => {
				Kodo.kodoAnonymousId = Kodo.getOrCreateAnonymousId()
				Kodo.kodoUserId = Kodo.getUserId()
				Kodo.loadEventsFromStorage()

				if (!("trackSession" in options) || options["trackSession"] !== false) {
					Kodo.setupSessionId()
				}

				if ("autoEnrich" in options && options["autoEnrich"] == false) {
					Kodo.kodoLocationEnrichmentEnabled = false
					Kodo.kodoDeviceDataEnrichmentEnabled = false
				}

				if ("defaultTrackingProperties" in options && typeof options["defaultTrackingProperties"] === "object") {
					Kodo.kodoDefaultTrackingProperties = options["defaultTrackingProperties"]
				}

				Kodo.startFlushInterval()

				if ("autoCapture" in options) {
					Kodo.setupAutoTracking(options["autoCapture"])
				}

				// Setup app state listener for session management
				Kodo.setupAppStateListener()

				// Setup network connectivity listener
				Kodo.setupNetworkListener()

				if (Kodo.kodoDisableUserIdStorage == true && Kodo.kodoUserId != null) {
					AsyncStorage.removeItem("kodo-userId")
				}
			})
		} catch (error) {
			console.info("Failed to initialize Kodo SDK: ", error)
		}
	}

	static setupAppStateListener() {
		Kodo.kodoAppStateSubscription = AppState.addEventListener('change', (nextAppState) => {
			if (nextAppState === 'active') {
				// App came to foreground
				const timeSinceLastActivity = Date.now() - Kodo.kodoLastActivityTime
				if (timeSinceLastActivity > Kodo.kodoSessionTimeout) {
					// Session expired, create new one
					Kodo.setupSessionId()
				}
				Kodo.kodoLastActivityTime = Date.now()
			} else if (nextAppState === 'background') {
				// App went to background
				Kodo.flush()
			}
		})
	}

	static setupNetworkListener() {
		Kodo.kodoNetInfoSubscription = NetInfo.addEventListener(state => {
			if (state.isConnected && Kodo.kodoTrackQueue.length > 0) {
				// Network reconnected, flush any pending events
				Kodo.flush()
			}
		})
	}

	static cleanup() {
		if (Kodo.kodoAppStateSubscription) {
			Kodo.kodoAppStateSubscription.remove()
		}
		if (Kodo.kodoNetInfoSubscription) {
			Kodo.kodoNetInfoSubscription()
		}
		if (Kodo.kodoFlushInterval) {
			clearInterval(Kodo.kodoFlushInterval)
		}
	}

	static setNavigationRef(navigationRef) {
		Kodo.kodoNavigationRef = navigationRef
	}

	static async loadStoredData() {
		try {
			const [anonymousId, userId, externalId, events] = await AsyncStorage.multiGet([
				'kodo-anonymousId',
				'kodo-userId',
				'kodo-externalId',
				'kodo-track'
			])

			if (anonymousId[1]) Kodo.kodoAnonymousId = anonymousId[1]
			if (userId[1]) Kodo.kodoUserId = userId[1]
			if (externalId[1]) Kodo.kodoExternalId = externalId[1]
			if (events[1]) {
				try {
					Kodo.kodoTrackQueue = JSON.parse(events[1])
				} catch (e) {
					Kodo.kodoTrackQueue = []
				}
			}
		} catch (error) {
			console.info("Error loading stored data: ", error)
		}
	}

	static updateDefaultTrackingProperties(properties) {
		if (typeof properties !== "object") {
			console.info("Kodo defaultTrackingProperties must be an object.")
			return
		}
		Kodo.kodoDefaultTrackingProperties = properties
	}

	static setupSessionId() {
		try {
			const newSessionId = Kodo.generateUUID()
			Kodo.kodoSessionId = newSessionId
			Kodo.kodoSessionStartTime = Date.now()
			Kodo.kodoLastActivityTime = Date.now()
		} catch (error) {
			console.info("Error setting up session ID: ", error)
		}
	}

	static getSessionId() {
		// Check if session has expired
		const timeSinceLastActivity = Date.now() - Kodo.kodoLastActivityTime
		if (timeSinceLastActivity > Kodo.kodoSessionTimeout) {
			Kodo.setupSessionId()
		}
		Kodo.kodoLastActivityTime = Date.now()
		return Kodo.kodoSessionId
	}

	static setupAutoTracking(autoCaptureOptions) {
		if (!Array.isArray(autoCaptureOptions)) {
			console.info("Kodo autoCapture must be an array.")
			return
		}

		if (autoCaptureOptions.includes("screen_views") || autoCaptureOptions.includes("all")) {
			// Screen view tracking requires integration with navigation
			console.info("Screen view tracking enabled. Call Kodo.trackScreenView(screenName) when screens change.")
		}

		if (autoCaptureOptions.includes("app_opens") || autoCaptureOptions.includes("all")) {
			Kodo.trackAppOpen()
		}
	}

	static async trackScreenView(screenName, properties = {}) {
		const screenViewProperties = {
			screenName: screenName,
			previousScreen: Kodo.kodoCurrentScreen,
			...properties
		}

		// Track time spent on previous screen
		if (Kodo.kodoCurrentScreen && Kodo.kodoScreenStartTime) {
			const timeOnScreen = Math.round((Date.now() - Kodo.kodoScreenStartTime) / 1000)
			screenViewProperties.previousScreenTime = timeOnScreen
		}

		Kodo.kodoCurrentScreen = screenName
		Kodo.kodoScreenStartTime = Date.now()

		await Kodo.track({
			event: "screen_view",
			properties: screenViewProperties,
			addToQueue: false
		})
	}

	static async trackAppOpen() {
		const deepLink = await Linking.getInitialURL()
		
		await Kodo.track({
			event: "app_open",
			properties: {
				// Strip query/fragment so auth tokens and magic-link secrets
				// in deep links are never exported to analytics storage.
				deepLink: Kodo.sanitizeDeepLinkUrl(deepLink),
				...Kodo.getDeviceProperties()
			},
			addToQueue: false
		})
	}

	static async trackAppBackground() {
		await Kodo.track({
			event: "app_background",
			properties: {
				sessionDuration: Kodo.kodoSessionStartTime ? 
					Math.round((Date.now() - Kodo.kodoSessionStartTime) / 1000) : null
			},
			addToQueue: true
		})
	}

	static isApiKeyProvided() {
		return Kodo.kodoApiKey !== null
	}

	static getOrCreateAnonymousId() {
		let anonymousId
		if (Kodo.isStringNullOrBlank(Kodo.kodoAnonymousId)) {
			anonymousId = Kodo.createNewAnonymousId()
		} else {
			anonymousId = Kodo.kodoAnonymousId
		}

		Kodo.kodoAnonymousId = anonymousId
		AsyncStorage.setItem("kodo-anonymousId", anonymousId)

		return anonymousId
	}

	static createNewAnonymousId() {
		return Kodo.generateUUID()
	}

	static generateUUID() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			let r = (Math.random() * 16) | 0,
				v = c == 'x' ? r : (r & 0x3) | 0x8
			return v.toString(16)
		})
	}

	static getUserId() {
		return Kodo.kodoUserId
	}

	static getAnonymousId() {
		return Kodo.getOrCreateAnonymousId()
	}

	static setUserId(userId) {
		Kodo.kodoUserId = userId
		if (!Kodo.kodoDisableUserIdStorage) {
			AsyncStorage.setItem("kodo-userId", userId || "")
		}
	}

	static setExternalId(externalId) {
		Kodo.kodoExternalId = externalId
		AsyncStorage.setItem("kodo-externalId", externalId || "")
	}

	static async loadEventsFromStorage() {
		try {
			const events = await AsyncStorage.getItem("kodo-track")
			Kodo.kodoTrackQueue = events ? JSON.parse(events) : []
		} catch (error) {
			console.info("Failed to get tracking events from storage: ", error)
			await AsyncStorage.removeItem("kodo-track")
			Kodo.kodoTrackQueue = []
		}
	}

	static async reset() {
		// Flush any pending events
		await Kodo.checkQueue(Kodo.kodoTrackQueue, "event/ingest/batch", true)

		// Clear all stored data
		Kodo.kodoUserId = null
		Kodo.kodoAnonymousId = null
		Kodo.kodoExternalId = null
		Kodo.kodoSessionId = null

		await AsyncStorage.multiRemove([
			"kodo-userId",
			"kodo-anonymousId",
			"kodo-externalId",
			"kodo-track"
		])

		// Create new anonymous ID
		Kodo.kodoAnonymousId = Kodo.createNewAnonymousId()
		await AsyncStorage.setItem("kodo-anonymousId", Kodo.kodoAnonymousId)

		// Create new session
		Kodo.setupSessionId()
	}

	static startFlushInterval() {
		Kodo.kodoFlushInterval = setInterval(async () => {
			await Kodo.checkQueue(Kodo.kodoTrackQueue, "event/ingest/batch", true)
		}, 1500)
	}

	static async identify(parameters) {
		if (!Kodo.isApiKeyProvided()) {
			console.info("API key not provided. Cannot identify user.")
			return
		}

		if (!parameters || typeof parameters !== "object") {
			console.info("Invalid parameters passed to identify method")
			return
		}

		let userId = parameters.userId || Kodo.kodoUserId
		if (userId && (typeof userId !== "string" || Kodo.isStringNullOrBlank(userId))) userId = null
		if (userId !== Kodo.kodoUserId) Kodo.setUserId(userId)

		let externalId = parameters.externalId || Kodo.kodoExternalId
		if (externalId && (typeof externalId !== "string" || Kodo.isStringNullOrBlank(externalId))) externalId = null
		if (externalId !== Kodo.kodoExternalId) Kodo.setExternalId(externalId)

		const properties = parameters.properties || {}
		if (typeof properties !== "object") {
			console.info("Invalid properties passed to identify method")
			return
		}

		const enrichDeviceData = parameters.enrichDeviceData !== false && Kodo.kodoDeviceDataEnrichmentEnabled
		const enrichLocationData = parameters.enrichLocationData !== false && Kodo.kodoLocationEnrichmentEnabled

		const payload = {
			userId: userId,
			externalId: externalId,
			anonymousId: Kodo.getOrCreateAnonymousId(),
			properties: properties,
			deviceData: enrichDeviceData ? await Kodo.getDeviceProperties() : null
		}

		return await Kodo.sendRequest("profile", payload, enrichLocationData)
	}

	static async track(parameters) {
		if (!Kodo.isApiKeyProvided()) {
			console.info("API key not provided. Cannot track event.")
			return
		}

		if (!parameters || typeof parameters !== "object") {
			console.info("Invalid parameters passed to track method")
			return
		}

		const event = parameters.event
		if (!event || typeof event !== "string" || Kodo.isStringNullOrBlank(event)) {
			console.info("Invalid event passed to track method")
			return
		}

		let userId = parameters.userId || Kodo.kodoUserId
		if (userId && (typeof userId !== "string" || Kodo.isStringNullOrBlank(userId))) userId = null
		if (userId !== Kodo.kodoUserId) Kodo.setUserId(userId)

		let externalId = parameters.externalId || Kodo.kodoExternalId
		if (externalId && (typeof externalId !== "string" || Kodo.isStringNullOrBlank(externalId))) externalId = null
		if (externalId !== Kodo.kodoExternalId) Kodo.setExternalId(externalId)

		const properties = parameters.properties || {}
		const enrichDeviceData = parameters.enrichDeviceData !== false && Kodo.kodoDeviceDataEnrichmentEnabled
		const enrichLocationData = parameters.enrichLocationData !== false && Kodo.kodoLocationEnrichmentEnabled
		const addToQueue = parameters.addToQueue || false

		const finalProperties = {
			...properties,
			...Kodo.kodoDefaultTrackingProperties
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
			deviceData: enrichDeviceData ? await Kodo.getDeviceProperties() : null,
			idempotencyKey: idempotencyKey
		}

		Kodo.kodoTrackQueue.push(payload)
		await Kodo.saveEventsToStorage("kodo-track", Kodo.kodoTrackQueue)
		await Kodo.checkQueue(Kodo.kodoTrackQueue, "event/ingest/batch", !addToQueue)
		return null
	}

	static async trackBatch(events) {
		for (const event of events) {
			await Kodo.track({ ...event, addToQueue: true })
		}
		await Kodo.flush()
	}

	static async flush() {
		await Kodo.checkQueue(Kodo.kodoTrackQueue, "event/ingest/batch", true)
	}

	static async saveEventsToStorage(key, queue) {
		try {
			await AsyncStorage.setItem(key, JSON.stringify(queue))
		} catch (error) {
			console.info("Error saving events to storage: ", error)
		}
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

		// Check network connectivity
		const netInfo = await NetInfo.fetch()
		if (!netInfo.isConnected) {
			console.info("No network connection. Events will be flushed when connection is restored.")
			return
		}

		if (Kodo.kodoConsecutiveFailures >= Kodo.kodoMaxConsecutiveFailures) {
			console.info(`Kodo: Max consecutive failures (${Kodo.kodoMaxConsecutiveFailures}) reached. Stopping flush attempts.`)
			setTimeout(() => {
				Kodo.kodoConsecutiveFailures = 0
			}, 60000)
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
			await Kodo.saveEventsToStorage("kodo-track", queue)
			Kodo.kodoConsecutiveFailures = 0
		} else {
			queue.push(...eventsToTrack)
			await Kodo.saveEventsToStorage("kodo-track", queue)
			Kodo.kodoConsecutiveFailures++
		}

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

		try {
			const response = await fetch(`https://integration.api.kodo.co/${endpoint}?locationEnrichment=${locationEnrich}`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${Kodo.kodoApiKey}`
				},
				body: JSON.stringify(data)
			})

			return response.ok
		} catch (error) {
			console.info("Kodo HTTP Error: ", error)
			return false
		}
	}

	static async getDeviceProperties() {
		try {
			const deviceProperties = {
				platform: Platform.OS,
				platformVersion: Platform.Version,
				deviceType: DeviceInfo.getDeviceType(),
				deviceModel: DeviceInfo.getModel(),
				deviceBrand: await DeviceInfo.getBrand(),
				deviceManufacturer: await DeviceInfo.getManufacturer(),
				deviceId: await DeviceInfo.getDeviceId(),
				systemName: await DeviceInfo.getSystemName(),
				systemVersion: await DeviceInfo.getSystemVersion(),
				appVersion: DeviceInfo.getVersion(),
				appBuildNumber: DeviceInfo.getBuildNumber(),
				bundleId: DeviceInfo.getBundleId(),
				isTablet: DeviceInfo.isTablet(),
				hasNotch: DeviceInfo.hasNotch(),
				screenWidth: Dimensions.get('window').width,
				screenHeight: Dimensions.get('window').height,
				screenScale: Dimensions.get('window').scale,
				timezone: await DeviceInfo.getTimezone(),
				locale: await DeviceInfo.getLocale(),
				country: await DeviceInfo.getCountry(),
				uniqueId: await DeviceInfo.getUniqueId(),
				carrier: await DeviceInfo.getCarrier(),
				totalMemory: await DeviceInfo.getTotalMemory(),
				totalDiskCapacity: await DeviceInfo.getTotalDiskCapacity(),
				isEmulator: await DeviceInfo.isEmulator()
			}

			return Kodo.removeNullProperties(deviceProperties)
		} catch (error) {
			console.info("Error getting device properties:", error)
			return {
				platform: Platform.OS,
				platformVersion: Platform.Version,
				screenWidth: Dimensions.get('window').width,
				screenHeight: Dimensions.get('window').height
			}
		}
	}

	static async isEmulatorOrSimulator() {
		try {
			return await DeviceInfo.isEmulator()
		} catch (error) {
			return false
		}
	}

	static isStringNullOrBlank(value) {
		if (typeof value !== "string") return true
		return !value || value == null || value == undefined || value == "" || value == "null" || value == "undefined"
	}

	/**
	 * Remove query string and fragment from a deep-link URL so sensitive
	 * tokens (password reset, OAuth codes, magic links) are not forwarded
	 * into analytics properties. Preserves scheme, host, and path for attribution.
	 * @param {string|null} url
	 * @returns {string|null}
	 */
	static sanitizeDeepLinkUrl(url) {
		if (Kodo.isStringNullOrBlank(url)) return null

		try {
			// Prefer URL parsing when the scheme is supported (https, custom schemes
			// with a host). Fall back to index-based stripping for opaque deep links.
			const parsed = new URL(url)
			parsed.search = ""
			parsed.hash = ""
			return parsed.toString()
		} catch (_) {
			const queryIndex = url.indexOf("?")
			const hashIndex = url.indexOf("#")
			let end = url.length
			if (queryIndex !== -1) end = Math.min(end, queryIndex)
			if (hashIndex !== -1) end = Math.min(end, hashIndex)
			const sanitized = url.substring(0, end)
			return sanitized.length > 0 ? sanitized : null
		}
	}

	static removeNullProperties(object) {
		return Object.fromEntries(Object.entries(object).filter(([key, value]) => value !== null && value !== undefined))
	}
}

export default Kodo