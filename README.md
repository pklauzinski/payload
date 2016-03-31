# Payload.js

[![Build Status](https://travis-ci.org/payloadjs/payload.svg?branch=master)](https://travis-ci.org/payloadjs/payload)
[![npm version](https://img.shields.io/npm/v/payloadjs.svg)](https://www.npmjs.com/package/payloadjs)
[![Bower version](https://img.shields.io/bower/v/payloadjs.svg)](https://github.com/payloadjs/payload)
[![MIT Licensed](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Join the chat at https://gitter.im/payloadjs/payload](https://badges.gitter.im/payloadjs/payload.svg)](https://gitter.im/payloadjs/payload?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

Payload.js is a javascript single page application (SPA) driver that creates a global `Payload` object to automate API requests and render [Handlebars](http://handlebarsjs.com/) templates or raw HTML data within the DOM. Payload.js's behaviors are initialized by calling `Payload.deliver()` with a default object of options, and are further controlled by setting various HTML `data-` attributes on DOM objects.

When DOM objects imbued with Payload.js's selectors are activated, a call to `Payload.apiRequest()` is performed, which involves making a XHR request and/or rendering a template. Payload.js also contains template/response caching and an event system as additional means of integration.

## Table of Contents

- [Installation](#installation)
    - [Install from NPM](#install-from-npm)
    - [Install from Bower](#install-from-bower)
- [Dependencies](#dependencies)
- [Selectors](#selectors)
- [Payload.js Options](#payloadjs-options)
- [Primary Methods](#primary-methods)
- [Helper Methods](#helper-methods)
- [API Request Handling](#api-request-handling)
    - [API Request Flow](#api-request-flow)
    - [API Callback Params](#api-callback-params)
    - [API Object & HTML Attributes](#api-object--html-attributes)
    - [Template Data](#template-data)
- [Payload.js Object Properties](#payloadjs-object-properties)

## Installation

Payload.js can be downloaded [directly from GitHub](https://github.com/payloadjs/payload/archive/master.zip), installed from [NPM](https://www.npmjs.com/), or installed from [Bower](http://bower.io/).

### Install from NPM

```sh
$ npm install payloadjs --save
```

### Install from Bower

```sh
$ bower install payloadjs --save
```

## Dependencies
- [jQuery](https://jquery.com/) >= v1.7
- [Handlebars runtime](http://handlebarsjs.com/precompilation.html) - version depends entirely on your compiler version

**Note:** Handlebars is not required if you choose to only work with raw XHR responses, e.g. HTML returned directly from an API request.

## Selectors

Payload.js automatically binds to HTML elements based on the following selectors:

  - **Links** (activated on click)
    - `a[data-selector]`
    - `a[data-url]`
    - `button[data-selector]`
    - `button[data-url]`
  - **Forms** (activated on submit)
    - `form[data-selector]`
    - `form[data-url]`

Payload.js selectors can also contain the `data-auto-load` attribute to cause them to be automatically invoked on page/template load. Selectors are used to invoke API calls and/or render templates when they receive an appropriate user or trigger event.

## Payload.js Options

| Option               | Type                 | Default                       | Description                                                                                                                                                                                                                                                                                                         |
|----------------------|----------------------|-------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `apiAccessToken`     | `string`             | `''`                          | Supply an access token for your application and it will be added to the request headers as an OAuth 2.0 Bearer token.                                                                                                                                                                                               |
| `apiAfterRender`     | `function`           | `$.noop`                      | Invoked just after rendering a template or fetching cached HTML.                                                                                                                                                                                                                                                    |
| `apiBeforeRender`    | `function`           | `$.noop`                      | Invoked just before rendering a template or fetching cached HTML.                                                                                                                                                                                                                                                   |
| `apiCallback`        | `function`           | `$.noop`                      | Called during API request handling before XHR requests (but after loading a template if no XHR request is required). See [API Callback Params](#api-callback-params) for more information about the arguments.                                                                                                      |
| `apiOnClick`         | `function`           | `function() { return true; }` | Invoked on API link activation; if it returns a false value, Payload.js will skip performing an API request.                                                                                                                                                                                                        |
| `apiOnSubmit`        | `function`           | `function() { return true; }` | Invoked on API form submission; if it returns a false value, Payload.js will skip performing an API request.                                                                                                                                                                                                        |
| `apiResponseParent`  | `string`             | `''`                          | If set, unserialized XHR response objects will use the specified property as the parent key for response data (e.g. if all API responses contain `{"response": {}}`).                                                                                                                                               |
| `context`            | `object` or `string` | `document.body`               | Payload.js will only monitor events on the given DOM object or selector string.                                                                                                                                                                                                                                     |
| `dataNamespace`      | `string`             | `''`                          | If set, Payload will look for `data-[dataNamespace]-` attributes instead of `data-` attributes. This can be used to prevent `data-` attribute naming conflicts.                                                                                                                                                     |
| `debug`              | `boolean`            | `false`                       | If `true`, outputs useful debugging information to the `console`.                                                                                                                                                                                                                                                   |
| `loadingDefault`     | `boolean`            | `true`                        | If `true`, sets the default behavior for all XHR requests to clear the `$target` element and show the `loadingHtml` within it. If `false`, the `$target` element's content will not be cleared until updated by the `$api` response. This can be overridden for any API request using the `data-loading` attribute. |
| `loadingHtml`        | `string`             | `<small>Loading...</small>`   | The default HTML to insert into API `$target` if the `loading` flag for the request is `true`.                                                                                                                                                                                                                      |
| `partialsNamespace`  | `object`             | `Handlebars.partials`         | The namespace containing precompiled Handlebars partials.                                                                                                                                                                                                                                                           |
| `storeAppData`       | `boolean`            | `true`                        | If `true`, stores `Payload.appData` to localStorage on `beforeunload` event                                                                                                                                                                                                                                         |
| `subscribers`        | `array`              | `[]`                          | List of events and callback functions to pass to `Payload.addSubscribers` method. These subscribers are initialized upon the `Payload.delivery` call.                                                                                                                                                               |
| `templatesNamespace` | `object`             | `Handlebars.templates`        | The namespace containing precompiled Handlebars templates.                                                                                                                                                                                                                                                          |
| `timeout`            | `number`             | `0`                           | Timeout value, in milliseconds, before XHR requests are aborted. This can be overridden for any API request using the `data-timeout` attribute. If set to `0`, no timeout will occur.                                                                                                                               |
| `xhrAlways`          | `function`           | `$.noop`                      | Called after each XHR request, regardless of success/failure.                                                                                                                                                                                                                                                       |
| `xhrBeforeSend`      | `function`           | `$.noop`                      | Called before each XHR request.                                                                                                                                                                                                                                                                                     |
| `xhrDone`            | `function`           | `$.noop`                      | Called after each successful XHR request.                                                                                                                                                                                                                                                                           |
| `xhrFail`            | `function`           | `$.noop`                      | Called after each failed XHR request.                                                                                                                                                                                                                                                                               |

## Primary Methods

  - `deliver(options)` - Used to initialize the initial options to Payload.js and start monitoring the Payload.js context for events; see [Payload.js Options](#payloadjs-options).
  - `apiRequest($origin)` - Automatically called when a selector is activated. May also be called explicitly by passing in a jQuery object with the proper data attributes. See [API Request Handling](#api-request-handling) for more information about this method.
  - `triggerAutoLoad($element)`  - Perform an API call on any DOM nodes containing the attribute `data-auto-load` set to `true`. If `$element` is given, trigger `auto-load` on the parameter instead of on the Payload.js `$context`.
  - `publish(eventName, arguments)`  - Publish a Payload.js. Any arguments given will pass through to the event handlers subscribed to the event named.
  - `subscribe(eventName, function)`  - Subscribe to a Payload.js event. When the specified event is published the function provided will be invoked and passed event-specific arguments.
  - `unsubscribe(eventName, function)`  - Stop subscribing to a Payload.js event.
  - `addSubscribers(subscribers)` - Subscribe multiple functions to an array of events: `subscribers={events: [], methods: []}`.
  - `clearCache(type, key)`  - Based on the `type`, either the cached "response" or "view" data will be cleared for the given key. If no `type` is specified all caches are cleared. If a `type` is specified but no `key`, then all items within that `type` of cache are cleared.

## Helper Methods

  - `merge(options)` - Allows you to merge or *extend* the current Payload.js options with new options via the given object.
  - `serializeObject($form)` - Serializes form data into an object, automatically creating arrays for form fields containing the same name.
  - `debug(m)` - Allows you to pass in a single method as a string with the subsequent parameters being that method's arguments, *OR* pass in an object containing keys as method names and values as method arguments (single argument or array of multiple arguments).

## API Request Handling

Once a selector has been activated, Payload.js perform any API calls requested and renders the template specified. Your app can interact with Payload.js via various callback methods and by "subscribing" to API events. Upon completion of rendering a template, Payload.js will call `Payload.triggerAutoLoad($target)`.

When performing an API request Payload.js will also manage showing and hiding loading indicators. If the "data-loading" attribute is set to "true" (or the "loadingDefault" option is true) the "$target" element will be cleared and have the "loadingHtml" inserted. Otherwise Payload.js will look for an element with the attribute `data-role` set to `loading` and call `jQuery.show()` on it.

### API Request Flow

Note that DOM objects must either perform an API call by having `api.url` set (see the [API Object and HTML attributes](#api-object-and-html-attributes)) or specifying a template to load.

  1. Publish events with `pre` namespace to allow any preparation work to happen.
  1. Fetch and set cached view if requested.
  1. Invoke `apiCallback` method set in Payload.js options (see [API Callback Params](#api-callback-params)).
  1. If no API URL was specified or a cached view was used, publish the API events and trigger `auto-load`.
  1. Show any configured loading indicators.
  1. Perform the XHR request.
    1. Failures will invoke the `xhrFail` callback option.
    1. The `xhrAlways` callback option always gets called on XHR request completion.
  1. If a template selector is defined, render the template into the specified location. If `api.loading` was set, the loading element will quickly fade out first. The `xhrDone` callback option is invoked, API events are published, and `triggerAutoLoad($target)` is called.
  1. Cache the XHR response if requested; otherwise cache the view (and thus the response too) if requested.

### API Callback Params

When invoking events or invoking callbacks for `apiCallback`, `apiBeforeRender`, and `apiAfterRender`, a `params` argument is passed to the handler. It contains the following properties:

  - `$origin` - The jQuery object the Payload.js API originated on.
  - `$target` - The jQuery object pointed to by `$origin`'s `[data-selector]` attribute.
  - `api` - The API object described in [API Object and HTML Attributes](#api-object-and-html-attributes).

If the API call involves making a XHR request the following additional attributes are abilable on the "params" object:

  - `response` - API response
  - `status` - jQuery status result
  - `jqXHR` - jQuery XHR response object
  - `html` - template HTML (undefined until HTML is rendered)
  - `api` -  The API object described in [API Object and HTML Attributes](#api-object-and-html-attributes).

### API Object and HTML Attributes

The API object defined below is passed within the API params to the various callback methods. The various options are controlled through HTML `data-` attributes on the `$origin` object, which points to a `$target` object for template rendering.

  - `href` - $origin `href` attribute; for reference
  - `url` -  $origin `data-url` or `action` (form) attribute; Used as API URL if set
  - `method` - $origin `data-method` or `method` attribute; HTTP method to use in API call (default: `'get'`)
  - `cacheRequest` - $origin `data-cache-request` attribute; if `true` flag XHR request to be cached
  - `cacheResponse` - $origin `data-cache-response` attribute; if `true` use cached response from Payload.js
  - `cacheView` - $origin `data-cache-view` attribute; if `true` used cached view from Payload.js instead of rerendering the HTML, and skip performing API calls
  - `type` - jquery XHR request type (default: `'json'`)
  - `selector` - $origin `data-selector` attribute; jQuery selector for the API $target that a template will be loaded into
  - `template` - $origin "data-template" attribute; name of the Handlebars template to load into the location specified by `data-selector` (overrides `data-partial` if also set)
  - `partial` - $origin `data-partial` attribute; name of the Handlebars partial template to load into the location specified by `data-selector`
  - `events` - $origin `data-publish` attribute; space-separated list of events to have published to Payload.js subscribers
  - `requestData` - combination of JSON serialized form data and any JSON-encoded values within $origin `data-form` attribute
  - `templateData` - See [Template Data](#template-data) below
  - `loading` - $origin `data-loading` attribute; if "true" (or the `loadingDefault` option is true) the `$target` element will be cleared and have the `loadingHtml` from Payload.js options inserted during API request handling.

### Template Data

Every Handlebars template always has the following data available:

  - `app` - Any custom application data set at `Payload.appData`
  - `request` - href, url, method, and cacheKey for the API call
  - `view` - A dictionary of all `data-*` attributes from `$origin`

## Payload.js Object Properties

  - `options` - Current set of options (see [Payload.js Options](#payloadjs-options))
  - `appData` - Object for storing custom application data; provided as `app` within template data
  - `cache` - Object containing `response` and `view` caches.