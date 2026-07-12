# @kodo-x/analytics-node

Kodo's Node.js SDK - send your backend analytics data to the Kodo platform.

# Getting Started

## 1. Install the package

```bash
npm i @kodo-x/analytics-node
```

## 2. Initialise the SDK

```javascript
import Kodo from '@kodo-x/analytics-node';
// or
const Kodo = require('@kodo-x/analytics-node');

const kodoClient = new Kodo('<YOUR_WRITE_KEY>', {
    autoEnrich: false,
    defaultTrackingProperties: { ... }
});
```

The client constructor takes two arguments:
- `writeKey` - Your Kodo write key. You can find this in the Kodo dashboard under `Management > Account Settings > Developers > Write Key`
- `options` - An object containing the following optional properties:
    - `autoEnrich` - A boolean indicating whether or not to automatically enrich events with additional information such as location properties. Defaults to `false`
    - `defaultTrackingProperties` - An object containing any default properties to be sent with every event. Defaults to an empty object

## 3. Tracking events

```javascript
kodoClient.track({
    userId: '<USER_ID>',
    anonymousId: '<ANONYMOUS_ID>',
    sessionId: '<SESSION_ID>',
    event: 'event_name',
    timestamp: 1700968957392,
    properties: { ... },
    idempotencyKey: '<OPTIONAL_IDEMPOTENCY_KEY>'
});
```

The `track` method takes a single argument:
- `parameters` - An object containing the following properties:
    - `userId` - (optional) A string representing the user ID of the user who performed the event
    - `anonymousId` - (optional) A optional string representing the anonymous ID of the user who performed the event
    - `sessionId`  - (optional) A string representing the session ID of the user who performed the event
    - `event` - (required) A string representing the name of the event
    - `timestamp` - (optional) A number representing the timestamp of the event in milliseconds since the Unix epoch. Defaults to the current time
    - `properties` - (optional) An object containing any properties to be sent with the event. Defaults to an empty object
    - `idempotencyKey` - (optional) A string used as the idempotency key for the event. If omitted, the SDK generates a UUID automatically. Required by the Kodo Integration API for event ingest.

Note: At least one of `userId` or `anonymousId` must be provided.
Note: This method is asynchronous and can be awaited if required.

## 4. Identifying users
    
```javascript
kodoClient.identify({
    userId: '<USER_ID>',
    anonymousId: '<ANONYMOUS_ID>',
    properties: { ... }
});
```

The `identify` method takes a single argument:
- `parameters` - An object containing the following properties:
    - `userId` - (optional) A string representing the user ID of the user you're identifying with attributes
    - `anonymousId` - (optional) A optional string representing the anonymous ID of the user you're identifying with attributes
    - `properties` - (required) An object containing any attributes to be associated with the users profile

Note: At least one of `userId` or `anonymousId` must be provided.
Note: This method is asynchronous and can be awaited if required.

# Other Methods Available

## getUserIdFromCookie

```javascript
Kodo.getUserIdFromCookie(req.headers.cookie)
```

If you're using the backend SDK in conjunction with the frontend SDK, you can use this method to extract the user ID set by the frontend SDK from the cookie header of an HTTP request.
The `getUserIdFromCookie` method takes a single argument:
- `cookie` - A string representing the cookie header from an HTTP request

## getAnonymousIdFromCookie

```javascript
Kodo.getAnonymousIdFromCookie(req.headers.cookie)
```

If you're using the backend SDK in conjunction with the frontend SDK, you can use this method to extract the anonymous ID set by the frontend SDK from the cookie header of an HTTP request.
The `getAnonymousIdFromCookie` method takes a single argument:
- `cookie` - A string representing the cookie header from an HTTP request

## getSessionIdFromCookie

```javascript
Kodo.getSessionIdFromCookie(req.headers.cookie)
```

If you're using the backend SDK in conjunction with the frontend SDK, you can use this method to extract the session ID set by the frontend SDK from the cookie header of an HTTP request.
The `getSessionIdFromCookie` method takes a single argument:
- `cookie` - A string representing the cookie header from an HTTP request

## isoTimestampToEpoch

```javascript
Kodo.isoTimestampToEpoch('2021-01-01T00:00:00.000Z')
```

This method converts an ISO timestamp to the number of milliseconds since the Unix epoch.
If you need to provide a timestamp to the `track` method, you can use this method to convert an ISO timestamp to the required format.
The `isoTimestampToEpoch` method takes a single argument:
- `isoTimestamp` - A string representing an ISO timestamp
