// index.d.ts
declare module "@kodo-x/analytics-react-native" {
	export interface InitializeOptions {
		/**
		 * Array of events to automatically capture
		 * Options: 'screen_views', 'app_opens', 'all'
		 */
		autoCapture?: Array<'screen_views' | 'app_opens' | 'all'>
		/**
		 * Enable automatic enrichment with device and location data
		 * Default: true
		 */
		autoEnrich?: boolean
		/**
		 * Default properties to include with every tracked event
		 */
		defaultTrackingProperties?: Record<string, any>
		/**
		 * Enable session tracking with unique identifier
		 * Default: true
		 */
		trackSession?: boolean
		/**
		 * Disable storing user ID in AsyncStorage
		 * Default: false
		 */
		disableUserIdStorage?: boolean
		/**
		 * Block tracking from emulators/simulators
		 * Default: true
		 */
		blockCommonBots?: boolean
		/**
		 * Enable debug mode for development
		 * Default: false
		 */
		debugMode?: boolean
	}

	export interface IdentifyParameters {
		/**
		 * User attributes to associate with the profile
		 */
		properties: Record<string, any>
		/**
		 * User ID from your system
		 */
		userId?: string
		/**
		 * External ID for the user
		 */
		externalId?: string
		/**
		 * Enrich with device data
		 */
		enrichDeviceData?: boolean
		/**
		 * Enrich with location data
		 */
		enrichLocationData?: boolean
	}

	export interface TrackParameters {
		/**
		 * Name of the event to track
		 */
		event: string
		/**
		 * Properties associated with the event
		 */
		properties?: Record<string, any>
		/**
		 * User ID from your system
		 */
		userId?: string
		/**
		 * External ID for the user
		 */
		externalId?: string
		/**
		 * Idempotency key for the event. If omitted, the SDK generates a UUID automatically.
		 * Required by the Kodo Integration API for event ingest.
		 */
		idempotencyKey?: string
		/**
		 * Enrich with device data
		 */
		enrichDeviceData?: boolean
		/**
		 * Enrich with location data
		 */
		enrichLocationData?: boolean
		/**
		 * Add event to queue instead of sending immediately
		 * Default: false
		 */
		addToQueue?: boolean
	}

	export interface DeviceProperties {
		platform: string
		platformVersion: string | number
		deviceType: string
		deviceModel: string
		deviceBrand: string
		deviceManufacturer: string
		deviceId: string
		systemName: string
		systemVersion: string
		appVersion: string
		appBuildNumber: string
		bundleId: string
		isTablet: boolean
		hasNotch: boolean
		screenWidth: number
		screenHeight: number
		screenScale: number
		timezone: string
		locale: string
		country: string
		uniqueId: string
		carrier: string
		totalMemory: number
		totalDiskCapacity: number
		isEmulator: boolean
	}

	declare class Kodo {
		/**
		 * Initialize the Kodo SDK
		 * @param apiKey Your Kodo write key
		 * @param options Configuration options
		 */
		static initialize(apiKey: string, options?: InitializeOptions): void

		/**
		 * Identify a user and set their profile attributes
		 * @param parameters Identification parameters
		 */
		static identify(parameters: IdentifyParameters): Promise<any>

		/**
		 * Track a custom event
		 * @param parameters Event tracking parameters
		 */
		static track(parameters: TrackParameters): Promise<any | null>

		/**
		 * Track multiple events in a batch
		 * @param events Array of tracking parameters
		 */
		static trackBatch(events: TrackParameters[]): Promise<void>

		/**
		 * Track a screen view event
		 * @param screenName Name of the screen
		 * @param properties Additional properties for the screen view
		 */
		static trackScreenView(screenName: string, properties?: Record<string, any>): Promise<void>

		/**
		 * Track app open event
		 */
		static trackAppOpen(): Promise<void>

		/**
		 * Track app background event
		 */
		static trackAppBackground(): Promise<void>

		/**
		 * Reset the SDK and clear all stored data
		 */
		static reset(): Promise<void>

		/**
		 * Update default tracking properties
		 * @param properties New default properties
		 */
		static updateDefaultTrackingProperties(properties: Record<string, any>): void

		/**
		 * Get the current user ID
		 */
		static getUserId(): string | null

		/**
		 * Get the anonymous ID
		 */
		static getAnonymousId(): string

		/**
		 * Get the current session ID
		 */
		static getSessionId(): string | null

		/**
		 * Set the user ID
		 * @param userId User ID to set
		 */
		static setUserId(userId: string | null): void

		/**
		 * Set the external ID
		 * @param externalId External ID to set
		 */
		static setExternalId(externalId: string | null): void

		/**
		 * Flush all pending events
		 */
		static flush(): Promise<void>

		/**
		 * Set navigation reference for automatic screen tracking
		 * @param navigationRef React Navigation ref
		 */
		static setNavigationRef(navigationRef: any): void

		/**
		 * Clean up listeners and intervals
		 */
		static cleanup(): void

		/**
		 * Get device properties
		 */
		static getDeviceProperties(): Promise<Partial<DeviceProperties>>

		/**
		 * Check if running on emulator/simulator
		 */
		static isEmulatorOrSimulator(): Promise<boolean>
	}

	export default Kodo
}
