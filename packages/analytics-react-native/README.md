# @kodo-x/analytics-react-native

Kodo's React Native SDK - send your mobile app analytics data to the Kodo platform.

## Features

- Cross-platform — Works on both iOS and Android
- Privacy-focused — Anonymous ID and session management
- Auto-tracking — Automatic screen views and app lifecycle events
- Offline support — Queue events when offline, send when connected
- User identification — Link events to known users
- Batch processing — Efficient event batching and delivery
- Device enrichment — Automatic device and app metadata

## Getting Started

### 1. Install the package

```bash
npm install @kodo-x/analytics-react-native
```

or with Yarn:

```bash
yarn add @kodo-x/analytics-react-native
```

### 2. Install peer dependencies

The SDK requires these peer dependencies:

```bash
npm install @react-native-async-storage/async-storage @react-native-community/netinfo react-native-device-info
```

### 3. Platform-specific setup

#### iOS

```bash
cd ios && pod install
```

#### Android

No additional setup required for Android.

### 4. Initialize the SDK

```javascript
import Kodo from '@kodo-x/analytics-react-native'

// Initialize as early as possible in your app (e.g., in App.js or index.js)
Kodo.initialize('<YOUR_WRITE_KEY>', {
    autoCapture: ['screen_views', 'app_opens'],
    autoEnrich: true,
    defaultTrackingProperties: {
        environment: 'production',
        app_name: 'MyApp'
    },
    trackSession: true
})
```

## Configuration Options

The `initialize` method accepts the following options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoCapture` | `Array<string>` | `[]` | Events to automatically capture: `'screen_views'`, `'app_opens'`, `'all'` |
| `autoEnrich` | `boolean` | `true` | Automatically enrich events with device and location data |
| `defaultTrackingProperties` | `object` | `{}` | Properties to include with every event |
| `trackSession` | `boolean` | `true` | Track sessions with unique identifiers |
| `disableUserIdStorage` | `boolean` | `false` | Don't persist user ID in AsyncStorage |
| `blockCommonBots` | `boolean` | `true` | Block tracking from emulators/simulators |
| `debugMode` | `boolean` | `false` | Enable debug logging |

## Core Methods

### Tracking Events

```javascript
// Track a custom event
await Kodo.track({
    event: 'purchase_completed',
    properties: {
        product_id: '12345',
        product_name: 'Premium Subscription',
        price: 9.99,
        currency: 'USD'
    },
    idempotencyKey: '<OPTIONAL_IDEMPOTENCY_KEY>'
})

// Track with user ID
await Kodo.track({
    event: 'button_clicked',
    properties: {
        button_name: 'checkout'
    },
    userId: 'user_123'
})
```

`idempotencyKey` is optional. If omitted, the SDK generates a UUID automatically. Required by the Kodo Integration API for event ingest.

### Identifying Users

```javascript
// Identify a user with profile attributes
await Kodo.identify({
    userId: 'user_123',
    properties: {
        email: 'user@example.com',
        name: 'John Doe',
        subscription_plan: 'premium',
        created_at: '2024-01-15'
    }
})
```

### Screen Tracking

```javascript
// Manual screen tracking
await Kodo.trackScreenView('HomeScreen', {
    category: 'main_navigation'
})

// Or integrate with React Navigation
import { NavigationContainer } from '@react-navigation/native'

function App() {
    const navigationRef = useRef()

    useEffect(() => {
        Kodo.setNavigationRef(navigationRef)
    }, [])

    return (
        <NavigationContainer
            ref={navigationRef}
            onStateChange={async () => {
                const currentScreen = navigationRef.current?.getCurrentRoute()?.name
                if (currentScreen) {
                    await Kodo.trackScreenView(currentScreen)
                }
            }}
        >
            {/* Your app screens */}
        </NavigationContainer>
    )
}
```

## React Navigation Integration

For automatic screen tracking with React Navigation:

```javascript
import { useNavigationContainerRef } from '@react-navigation/native'

function App() {
    const navigationRef = useNavigationContainerRef()
    const routeNameRef = useRef()

    return (
        <NavigationContainer
            ref={navigationRef}
            onReady={() => {
                routeNameRef.current = navigationRef.getCurrentRoute().name
            }}
            onStateChange={async () => {
                const previousRouteName = routeNameRef.current
                const currentRouteName = navigationRef.getCurrentRoute().name

                if (previousRouteName !== currentRouteName) {
                    await Kodo.trackScreenView(currentRouteName, {
                        previous_screen: previousRouteName
                    })
                }

                routeNameRef.current = currentRouteName
            }}
        >
            {/* Your navigation structure */}
        </NavigationContainer>
    )
}
```

## Batch Tracking

```javascript
// Send multiple events at once
await Kodo.trackBatch([
    {
        event: 'item_viewed',
        properties: { item_id: '1', category: 'electronics' }
    },
    {
        event: 'item_viewed',
        properties: { item_id: '2', category: 'books' }
    },
    {
        event: 'item_added_to_cart',
        properties: { item_id: '1', quantity: 1 }
    }
])
```

## Session Management

Sessions are automatically managed with a 5-minute timeout. When the app goes to background and returns after 5 minutes, a new session is created.

```javascript
// Get current session ID
const sessionId = Kodo.getSessionId()

// Sessions automatically refresh on app foreground if expired
```

## User Management

```javascript
// Set user ID (persisted across app launches)
Kodo.setUserId('user_123')

// Set external ID (e.g., from your CRM)
Kodo.setExternalId('crm_456')

// Get current user ID
const userId = Kodo.getUserId()

// Get anonymous ID (device identifier)
const anonymousId = Kodo.getAnonymousId()

// Reset user (logout)
await Kodo.reset() // Clears user data and creates new anonymous ID
```

## Default Properties

Update default properties that are sent with every event:

```javascript
Kodo.updateDefaultTrackingProperties({
    app_version: '2.0.0',
    environment: 'production',
    user_segment: 'premium'
})
```

## Offline Support

Events are automatically queued when the device is offline and sent when connectivity is restored:

```javascript
// Events are queued automatically when offline
await Kodo.track({
    event: 'offline_action',
    properties: { value: 100 }
})

// Manually flush the queue
await Kodo.flush()
```

## App Lifecycle Events

Track app lifecycle events:

```javascript
import { AppState } from 'react-native'

AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'background') {
        Kodo.trackAppBackground()
    } else if (nextAppState === 'active') {
        Kodo.trackAppOpen()
    }
})
```

## Device Information

The SDK automatically collects device information when `autoEnrich` is enabled:

- Platform (iOS/Android)
- Device model and brand
- OS version
- App version and build number
- Screen dimensions
- Timezone and locale
- Network carrier
- Memory and storage info

## Deep Linking

Track app opens from deep links:

```javascript
import { Linking } from 'react-native'

Linking.getInitialURL().then(url => {
    if (url) {
        Kodo.track({
            event: 'app_opened_from_deep_link',
            properties: {
                url: url,
                source: parseDeepLinkSource(url)
            }
        })
    }
})
```

## TypeScript Support

The SDK includes TypeScript definitions:

```typescript
import Kodo, { TrackParameters, IdentifyParameters } from '@kodo-x/analytics-react-native'

const trackParams: TrackParameters = {
    event: 'purchase',
    properties: {
        amount: 99.99
    },
    userId: 'user_123'
}

await Kodo.track(trackParams)
```

## Best Practices

1. **Initialize Early**: Call `Kodo.initialize()` as early as possible in your app lifecycle
2. **User Identification**: Call `identify()` as soon as you have user information
3. **Screen Tracking**: Integrate with your navigation solution for automatic screen tracking
4. **Batch Events**: Use `trackBatch()` when tracking multiple related events
5. **Cleanup**: Call `Kodo.cleanup()` when your app unmounts (if needed)

## Troubleshooting

### Events not being sent

1. Check that you've initialized the SDK with a valid API key
2. Verify network connectivity
3. Enable debug mode to see logs: `{ debugMode: true }`
4. Check that events are not being blocked by emulator detection

### Storage issues

- The SDK uses AsyncStorage for persistence
- Ensure AsyncStorage is properly installed and linked
- Storage is automatically cleared on `reset()`

### Session management

- Sessions timeout after 5 minutes of inactivity
- New sessions are created when the app returns from background after timeout
- Session IDs are not persisted between app launches

## API Reference

### Core Methods

- `initialize(apiKey, options)` - Initialize the SDK
- `identify(parameters)` - Identify a user
- `track(parameters)` - Track an event
- `trackBatch(events)` - Track multiple events
- `trackScreenView(screenName, properties)` - Track a screen view
- `reset()` - Reset the SDK and clear data
- `flush()` - Force flush pending events

### User Methods

- `setUserId(userId)` - Set the user ID
- `setExternalId(externalId)` - Set external ID
- `getUserId()` - Get current user ID
- `getAnonymousId()` - Get anonymous ID
- `getSessionId()` - Get current session ID

### Configuration Methods

- `updateDefaultTrackingProperties(properties)` - Update default properties
- `setNavigationRef(ref)` - Set navigation reference for auto-tracking
- `cleanup()` - Clean up listeners and intervals

## Support

For issues, questions, or feature requests:
- GitHub Issues: https://github.com/kodo-x/kodo-sdks/issues

## License

ISC License - see LICENSE file for details
