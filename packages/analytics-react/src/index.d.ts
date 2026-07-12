import { ReactNode, Context } from "react"

declare module "@kodo-x/analytics-react" {
	export interface KodoOptions {
		autoCapture?: string[]
		allowCookies?: boolean
		autoEnrich?: boolean
		[key: string]: any
	}

	export interface KodoContextValue {
		identify: (parameters: object) => Promise<any>
		track: (parameters: object) => Promise<any | null>
		trackBatch: (events: object[]) => Promise<void>
		reset: () => Promise<void>
		updateDefaultTrackingProperties: (properties: object) => void
		getUserId: () => string | null
		getAnonymousId: () => string | null
		flush: () => Promise<void>
		trackPageView: () => Promise<void>
	}

	export interface KodoProviderProps {
		writeKey: string
		options: KodoOptions
		children: ReactNode
	}

	export const KodoContext: Context<KodoContextValue>

	export function KodoProvider(props: KodoProviderProps): JSX.Element

	export function useKodo(): KodoContextValue

	export class Kodo {
		static initialize(apiKey: string, options: KodoOptions): void
		static identify(parameters: object): Promise<any>
		static track(parameters: object): Promise<any | null>
		static trackBatch(parameters: object[]): Promise<void>
		static reset(): Promise<void>
		static updateDefaultTrackingProperties(properties: object): void
		static getUserId(): string | null
		static getAnonymousId(): string | null
		static flush(): Promise<void>
		static trackPageView(): Promise<void>
	}
}
