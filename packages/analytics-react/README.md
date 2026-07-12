# @kodo-x/analytics-react

Kodo's React SDK - send your frontend analytics data to the Kodo platform.

This package is a thin React wrapper around [`@kodo-x/analytics-browser`](../analytics-browser). Install both packages (or rely on the peer dependency) in your app.

# Getting Started

## 1. Install the package

```bash
npm i @kodo-x/analytics-react @kodo-x/analytics-browser
```

## 2. Initialise the SDK

```javascript
import { KodoProvider } from "@kodo-x/analytics-react"

const root = ReactDOM.createRoot(document.getElementById("root"))
root.render(
	<React.StrictMode>
		<KodoProvider
			writeKey="YOUR WRITE ONLY API KEY"
			options={{
				autoCapture: ["page_views", "clicks"],
				allowCookies: true,
				autoEnrich: true,
				cookieSameSiteSetting: "Strict",
				cookieExpiryDays: 365,
				trackSession: true,
				defaultTrackingProperties: { project: "Web App" },
			}}
		>
			<App />
		</KodoProvider>
	</React.StrictMode>
)
```

The `KodoProvider` takes the following props:

-   `writeKey` - Your Kodo write key. You can find this in the Kodo dashboard under `Management > Account Settings > Developers > Write Key`
-   `options` - An object containing the following optional properties:
    -   `autoCapture` - An array of strings used to define which events to automatically capture. Defaults to none. The following events are available:
        -   `page_views` - Capture page views
        -   `page_leaves` - Capture page leaves
        -   `clicks` - Capture clicks
        -   `all` - Capture all of the above events
    -   `allowCookies` - A boolean indicating whether or not to allow cookies. Defaults to `true`
    -   `cookieSameSiteSetting` - A string indicating what cookie same site setting to use. Defaults to `Strict`. Options available are: `Strict`, `Lax`
    -   `cookieExpiryDays` - A number indicating how many days a cookie should last. Defaults to `365`
    -   `autoEnrich` - A boolean indicating whether or not to automatically enrich events with location and device properties. Defaults to `true`
    -   `defaultTrackingProperties` - An object containing any default properties to be sent with every event. Defaults to an empty object
    -   `trackSession` - A boolean indicating whether or not to track sessions with an unique identifier. Defaults to `true`
    -   `customQueryParamsToCollect` - An array of strings used to define which custom query parameters to auto collect and include in event properties. Defaults to none.
    -   `disableUserIdStorage` - A boolean indicating whether or not to store the provided user id in storage. Defaults to `false`
    -   `blockCommonBots` - A boolean indicating whether or not to block common bots from being tracked. Defaults to `true`
    -   `anonymousIdOverride` - A string value to be used as the anonymous id of the device the user is on.
    -   `endpoint` - A string value used as the base path for sending events to, useful in case you need to proxy events through a server. Must include the scheme (e.g. `https://`) — a value without one will be resolved relative to the current page. Defaults to `https://integration.api.kodo.co`.
    -   `pathOverride` - An object used to remap the request path (subroute) for one or more routes. See [`@kodo-x/analytics-browser`](../analytics-browser) for details.

## 3. Tracking events

```javascript
import { useKodo } from "@kodo-x/analytics-react"

const kodo = useKodo()

await kodo.track({
    event: 'event_name',
    properties: { ... },
    userId: '<USER_ID>',
    idempotencyKey: '<OPTIONAL_IDEMPOTENCY_KEY>',
    enrichDeviceData: true,
    enrichLocationData: true,
    enrichPageProperties: true,
    enrichReferrerProperties: true,
    enrichUTMProperties: true,
    enrichPaidAdProperties: true,
    addToQueue: false
})
```

The `track` method takes a single argument:

-   `parameters` - An object containing the following properties:
    -   `event` - (required) A string representing the name of the event
    -   `properties` - (optional) An object containing any properties to be sent with the event. Defaults to an empty object. Any `defaultTrackingProperties` provided in the global options will be merged with these properties
    -   `userId` - (optional) A string representing the user ID of the user you're identifying with attributes
    -   `externalId` - (optional) A string representing the external ID of the user you're identifying with attributes
    -   `idempotencyKey` - (optional) A string used as the idempotency key for the event. If omitted, the SDK generates a UUID automatically. Required by the Kodo Integration API for event ingest.
    -   `enrichDeviceData` - (optional) A boolean indicating whether or not to enrich the event with device data. Defaults to the value of `autoEnrich` in the global options
    -   `enrichLocationData` - (optional) A boolean indicating whether or not to enrich the event with location data. Defaults to the value of `autoEnrich` in the global options
    -   `enrichPageProperties` - (optional) A boolean indicating whether or not to enrich the event with page properties. Defaults to `true`
    -   `enrichReferrerProperties` - (optional) A boolean indicating whether or not to enrich the event with referrer properties. Defaults to `true`
    -   `enrichUTMProperties` - (optional) A boolean indicating whether or not to enrich the event with UTM properties. Defaults to `true`
    -   `enrichPaidAdProperties` - (optional) A boolean indicating whether or not to enrich the event with paid advertisement properties (such as google and facebook ads). Defaults to `true`
    -   `addToQueue` - (optional) A boolean indicating whether or not to add the event to the queue. Defaults to `false`. If `false`, the event will be sent immediately

## 4. Identifying users

```javascript
import { useKodo } from "@kodo-x/analytics-react"

const kodo = useKodo()

await kodo.identify({
    properties: { ... },
    userId: '<USER_ID>',
    enrichDeviceData: true,
    enrichLocationData: true
})
```

The `identify` method takes a single argument:

-   `parameters` - An object containing the following properties:
    -   `properties` - (required) An object containing any attributes to be associated with the users profile
    -   `userId` - (optional) A string representing the user ID of the user you're identifying with attributes
    -   `externalId` - (optional) A string representing the external ID of the user you're identifying with attributes
    -   `enrichDeviceData` - (optional) A boolean indicating whether or not to enrich the event with device data. Defaults to the value of `autoEnrich` in the global options
    -   `enrichLocationData` - (optional) A boolean indicating whether or not to enrich the event with location data. Defaults to the value of `autoEnrich` in the global options

# Other Methods Available

## trackBatch

```javascript
import { useKodo } from "@kodo-x/analytics-react"

const kodo = useKodo()

await kodo.trackBatch([
    {
        event: 'event_name',
        properties: { ... },
        userId: '<USER_ID>',
        enrichDeviceData: true,
        enrichLocationData: true,
        enrichPageProperties: true,
        enrichReferrerProperties: true,
        enrichUTMProperties: true,
        enrichPaidAdProperties: true
    },
    {
        event: 'event_name',
        properties: { ... },
        userId: '<USER_ID>',
        enrichDeviceData: true,
        enrichLocationData: true,
        enrichPageProperties: true,
        enrichReferrerProperties: true,
        enrichUTMProperties: true,
        enrichPaidAdProperties: true
    }
])
```

The `trackBatch` method takes a single argument:

-   `events` - An array of objects. See the `track` method for details of the properties available for each object.

## updateDefaultTrackingProperties

```javascript
import { useKodo } from "@kodo-x/analytics-react"

const kodo = useKodo()

kodo.updateDefaultTrackingProperties({ ... })
```

If at any time you wish to update the default tracking properties, you can do so by calling the `updateDefaultTrackingProperties` method.

The `updateDefaultTrackingProperties` method takes one argument:

-   `defaultTrackingProperties` - An object containing any default properties to be sent with every event.

## reset

```javascript
import { useKodo } from "@kodo-x/analytics-react"

const kodo = useKodo()

await kodo.reset()
```

If at any time you wish to reset the SDK, you can do so by calling the `reset` method. This will flush any events, clear any cookies / local storage, and reset the SDK to its initial state.

## flush

```javascript
import { useKodo } from "@kodo-x/analytics-react"

const kodo = useKodo()

await kodo.flush()
```

This will flush any pending events and send them to the Kodo platform.

## trackPageView

```javascript
import { useKodo } from "@kodo-x/analytics-react"

const kodo = useKodo()

await kodo.trackPageView()
```

If you have disabled `autoCapture` in the global options, you can manually capture page views by calling the `trackPageView` method.

## getUserId

```javascript
import { useKodo } from "@kodo-x/analytics-react"

const kodo = useKodo()

kodo.getUserId()
```

If you have provided a `userId` in the `identify` or `track` methods, you can retrieve this by calling the `getUserId` method.

## getAnonymousId

```javascript
import { useKodo } from "@kodo-x/analytics-react"

const kodo = useKodo()

kodo.getAnonymousId()
```

You can retrieve the anonymous id by calling the `getAnonymousId` method. This is the id that will be used if no `userId` is provided in the `identify` or `track` methods.

The underlying `Kodo` class from `@kodo-x/analytics-browser` is also re-exported for direct usage when needed.
