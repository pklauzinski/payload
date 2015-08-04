# Overview

Payload.js creates a global "Payload" object to automate API requests and rendering Handlebars template. Payload.js's behaviors are controlled at by initializing the object by calling "Payload.deliver()" and by setting various HTML data attributes on DOM objects.

When DOM objects imbued with Payload.js' selectors are activated an "API request" is performed, which involves making an XHR request and/or rendering a template. Payload.js also contains template/response caching and an event system as additional means of integration.


## Selectors

Payload.js automatically binds to HTML elements based on the following selectors:

  - **Links** (activated on click)
    - a[data-selector]
    - a[data-url]
    - button[data-selector]
    - button[data-url]
  - **Forms** (activated on submit)
    - form[data-selector]
    - form[data-url]

Payload.js selectors can also contain the "data-auto-load" attribute to cause them to be automatically invoked on page/template load. Selectors are use to invoke API calls and/or render templates when they are 


## Payload.js Options

  - **apiCallback** (params) - Called during API request handling before XHR requests (but after loading a template if no XHR request is required). See "API Callback Params" above for more information about the arguments.
  - **apiOnClick** ($origin, jqEvent) - Invoked on API link activation; if it returns a false value is returned Payload.js will skip performing an API request.
  - **apiOnSubmit** ($origin, jqEvent) - Invoked on API form submission; if it returns a false value is returned Payload.js will skip performing an API request.
  - **apiBeforeRender** (params) - Invoked just before rendering a template or fetching cached HTML.
  - **apiAfterRender** (params) - Invoked just after rendering a template or fetching cached HTML.
  - **apiResponseParent** - If set, unserialized XHR response objects will use the specified property as the response data (e.g. if all API responses contain '{"response": ...}').
  - **context** - Payload.js will only monitor events on the given DOM object. Defaults to "document.body".
  - **dataNamespace** - If set, Payload will look for "data-$prefix-" attributes instead of "data-" attributes.
  - **debug** -
  - **loadingHtml** - The default HTML to insert into API $targets with the "loading" flag set (default: '<small>Loading...</small>')
  - **loadingDefault** - If set to false, the API $target will not be cleared at the start (default: true)
  - **subscribers** - List of events and callback functions to pass to "Payload.addSubscribers" method.
  - **timeout** - Timeout value, in seconds, before XHR requests are aborted.
  - **xhrAlways** (params) - Called after each XHR request, regardless of success/failure.
  - **xhrBeforeSend** (params) - Called before each XHR request.
  - **xhrDone** (params) - Called after each successful XHR request.
  - **xhrFail** (params) - Called after each failed XHR request.


## Primary Methods

  - **deliver** (options) - Used to initialize the initial options to Payload.js and start monitoring the Payload.js context for events; see "Payload.js Options" below.
  - **apiRequest** ($origin) - Automatically called when a selector is activated. May also be called explicitly by passing in a jQuery object with the proper data attributes. See "API Request Handling" for more information about this method.
  - **triggerAutoLoad** ($element) - Perform an API call on any DOM nodes containing the attribute "data-auto-load" set to "true". If $element is given, trigger auto-load on the parameter instead of on the Payload.js $context.
  - **publish** (event_name, arguments) - Publish a Payload.js. Any arguments given will pass through to the event handlers subscribed to the event named.
  - **subscribe** (event_name, function) - Subscribe to a Payload.js event. When the specified event is published the function provided will be invoked and passed event-specific arguments.
  - **unsubscribe** (event_name, function) - Stop subscribing to a Payload.js event.
  - **addSubscribers** - (subscribers) - Subscribe multiple functions to an array of events: subscribers={events: [], methods: []}.
  - **clearCache** (type, key) - Based on the type, either the cached "response" or "view" data will be cleared for the given key. If no type is specified all caches are cleared. If a type is specified, but no key then all items within that type of cache are cleared.


## Helper Methods

  - **merge** (options) - Used to update the current set of options.
  - **serializeObject** ($form) - Serializes form data into an object, automatically creating arrays for form fields containing the same name.
  - **debug** () - 


## API Request Handling

Once a selector has been activated Payload.js perform any API calls requested and render the template specified. Your app can interact with Payload.js via various callback methods and by "subscribing" to API events. Upon completion of rendering a template Payload.js will call "Payload.triggerAutoLoad($target)".

When performing an API request Payload.js will also manage showing and hiding loading indicators. If the "data-loading" attribute is set to "true" (or the "loadingDefault" option is true) the "$target" element will be cleared and have the "loadingHtml" inserted. Otherwise Payload.js will look for an element with the attribute "data-role" set to "loading" and call "show()" on it.


### API Request Flow

Note that DOM objects must either perform an API call by having "api.url" set (see the "API object" below) or specifying a template to load.

  1. Publish events with "pre" namespace to allow any preparation work to happen.
  1. Fetch and set cached view if requested.
  1. Invoke "apiCallback" method set in Payload.js options (see "API Callback Params" below).
  1. If no API URL was specified or a cached view was used, publish the API events and trigger autoload.
  1. Show any configured loading indicators.
  1. Perform the XHR request.
    1. Failures will invoke the "xhrFail" callback option.
    1. The "xhrAlways" callback option always gets called on XHR request completion.
  1. If a template selector is defined, render the template into the specified location. If "api.loading" was set, the loading element will quickly fade out first. The "xhrDone" callback option is invoked, API events are published, and "triggerAutoLoad($target)" is called.
  1. Cache the XHR response if requested; otherwise cache the view (and thus the response too) if requested.



### API Callback Params

When invoking events or invoking callbacks for apiCallback, apiBeforeRender, and apiAfterRender a `params` argument is passed to the handler. It contains the following properties:

  - **$origin** - The jQuery object the Payload.js API originated on.
  - **$target** - The jQuery object pointed to by $origin's `[data-selector]` attribute.
  - **api** - The API object described in "API Object and Data Attributes".

If the API call involves making an XHR request the following additional attributes are abilable on the "params" object:

  - **response** - API response
  - **status** - jQuery status result
  - **jqXHR** - jQuery XHR response object
  - **html** - template HTML (undefined until HTML is rendered)
  - **api** -  The API object described in "API Object and Data Attributes".


### API Object & HTML Attributes

The API object defined below is passed within the API params to the various callback methods. The various options are controlled through HTML attributes on the "$origin" object, which points to a "$target" object for template rendering.

  - **href** - $origin "href" attribute; for refrence
  - **url** -  $origin "data-url" or "action" attribute; Used as API URL if set
  - **method** - $origin "data-method" or "method" attribute; HTTP method to use in API call (default: "get")
  - **cacheRequest** - $origin "data-cache-request" attribute; if "true" flag XHR request to be cached
  - **cacheResponse** - $origin "data-cache-response" attribute; if "true" use cached response from Payload.js
  - **cacheView** - $origin "data-cache-view" attribute; if "true" used cached view from Payload.js instead of rerendering the HTML, and skip performing API calls
  - **type** - jquery XHR request type (default: 'json')
  - **selector** - $origin "data-type" attribute; jQuery selector for the API $target that a template will be loaded into
  - **template** - $origin "data-template" attribute; name of the Handlebars template to load into the location specified by "data-selector" (overrides "data-partial" if also set)
  - **partial** - $origin "data-partial" attribute; name of the Handlebars partial template to load into the location specified by "data-selector"
  - **events** - $origin "data-publish" attribute; space-separated list of events to have published to Payload.js subscribers
  - **requestData** - combination of JSON serialized form data and any JSON-encoded values within $origin "data-form" attribute
  - **templateData** - See "Template Data" below
  - **loading** - $origin "data-loading" attribute; if "true" (or the "loadingDefault" option is true) the "$target" element will be cleared and have the "loadingHtml" from Payload.js options inserted during API request handling.


### Template Data

Every Handlebars template always has the following data available:

  - **app** - Any custom application data set at "Payload.appData"
  - **request** - href, url, method, and cacheKey for the API call
  - **view** - A dictionary of all "data-*" attributes from $origin


## Payload.js Object Properties

  - **options** - Current set of options (see Options below)
  - **appData** -Object for storing custom application data; provided as "app" within template data
  - **cache** - Object containing "response" and "view" caches.
