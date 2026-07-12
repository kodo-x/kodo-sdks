import React, { createContext, useContext, useEffect, useCallback, useRef } from "react"
import Kodo from "@kodo-x/analytics-browser"

const KodoContext = createContext(null)

export function KodoProvider({ writeKey, options, children }) {
	const isInitialized = useRef(false)

	useEffect(() => {
		if (!isInitialized.current) {
			Kodo.initialize(writeKey, options)
			isInitialized.current = true
		}

		return () => {
			// Clean up if necessary
		}
	}, [writeKey, options])

	const value = {
		identify: useCallback((parameters) => {
			return Kodo.identify(parameters)
		}, []),

		track: useCallback((parameters) => {
			return Kodo.track(parameters)
		}, []),

		trackBatch: useCallback((events) => {
			return Kodo.trackBatch(events)
		}, []),

		reset: useCallback(() => {
			return Kodo.reset()
		}, []),

		updateDefaultTrackingProperties: useCallback((properties) => {
			Kodo.updateDefaultTrackingProperties(properties)
		}, []),

		getUserId: useCallback(() => {
			return Kodo.getUserId()
		}, []),

		getAnonymousId: useCallback(() => {
			return Kodo.getAnonymousId()
		}, []),

		flush: useCallback(() => {
			return Kodo.flush()
		}, []),

		trackPageView: useCallback(() => {
			return Kodo.trackPageView()
		}, []),
	}

	return <KodoContext.Provider value={value}>{children}</KodoContext.Provider>
}

export function useKodo() {
	const context = useContext(KodoContext)
	if (context === null) {
		throw new Error("useKodo must be used within a KodoProvider")
	}
	return context
}
