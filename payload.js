/*!
 * Payload.js - Javascript Single Page Application Driver
 * http://payloadjs.com
 *
 * Copyright (c) 2015-2016, Philip Klauzinski (http://gui.ninja)
 * Released under the MIT license
 * http://www.opensource.org/licenses/mit-license.php
 *
 * @author Philip Klauzinski
 * @version 0.3.6
 * @requires jQuery v1.7+
 * @preserve
 */
(function(root, factory) {

    'use strict';

    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['jquery'], factory);
    } else if (typeof exports === 'object') {
        // Node
        module.exports = factory(require('jquery'));
    } else {
        // Browser globals
        root.Payload = factory(root, root.jQuery);
    }

}(this, function(window, $) {

    'use strict';

    /**
     * Payload.js constructor function
     *
     * @constructor
     */
    var Payload = function() {

        var _this = this,

            /**
             * Will be set to given application DOM context
             *
             * @private
             */
            _$context,

            /**
             * Track the name of the last template that was loaded
             *
             * @type {string}
             * @private
             */
            _lastTemplate = '',

            /**
             * Default options
             *
             * @type {{}}
             * @private
             */
            _options = {
                apiAccessToken: '',
                apiAfterRender: $.noop,
                apiBeforeRender: $.noop,
                apiCallback: $.noop,
                apiOnClick: function() {
                    return true;
                },
                apiOnSubmit: function() {
                    return true;
                },
                apiResponseParent: '',
                context: document.body || null,
                dataNamespace: '',
                debug: false,
                loadingDefault: true,
                loadingHtml: '<small>Loading...</small>',
                partialsNamespace: Handlebars.partials,
                storeAppData: true,
                subscribers: [], // [ {events: [], methods: [] } ]
                templatesNamespace: Handlebars.templates,
                timeout: 0,
                xhrAlways: $.noop,
                xhrBeforeSend: $.noop,
                xhrDone: $.noop,
                xhrFail: $.noop
            },

            _dataPrefix = 'data-' + (_options.dataNamespace ? $.trim(_options.dataNamespace) + '-' : ''),

            _selectors = {
                API_FORM: 'form[' + _dataPrefix + 'selector],form[' + _dataPrefix + 'url]',
                API_LINK: 'a[' + _dataPrefix + 'selector],a[' + _dataPrefix + 'url],button[' + _dataPrefix + 'selector],button[' + _dataPrefix + 'url]',
                AUTO_LOAD: '[' + _dataPrefix + 'auto-load="true"]',
                CLICK: '[' + _dataPrefix + 'click]',
                LOADING: '[' + _dataPrefix + 'role="loading"]'
            },

            _cache = {
                response: {},
                view: {}
            },

            _payloadEvents = [
                'init',
                'apiBeforeRender',
                'apiAfterRender',
                'xhrAlways',
                'xhrBeforeSend',
                'xhrDone',
                'xhrFail'
            ],

            _$payloadEvents = $({}),

            _$userEvents = $({}),

            /**
             * Stores registered Payload components
             * If a component is unregistered, it will be removed from this object
             *
             * @type {{}}
             * @private
             */
            _components = {},

            /**
             * Safe console debug
             * http://webtopian.com/safe-firebug-console-in-javascript
             *
             * @param m
             * @private
             */
            _debug = function(m) {
                var args, sMethod;
                if (_options.debug && typeof console === 'object' && (typeof m === 'object' || typeof console[m] === 'function')) {
                    if (typeof m === 'object') {
                        for (sMethod in m) {
                            if (typeof console[sMethod] === 'function') {
                                args = (typeof m[sMethod] === 'string' || (typeof m[sMethod] === 'object' && m[sMethod].length === undefined)) ? [m[sMethod]] : m[sMethod];
                                console[sMethod].apply(console, args);
                            } else {
                                console.log(m[sMethod]);
                            }
                        }
                    } else {
                        console[m].apply(console, Array.prototype.slice.call(arguments, 1));
                    }
                }
            },

            /**
             * Throw Payload.js specific error
             *
             * @param text
             * @private
             */
            _error = function(text) {
                throw 'Payload.js: ' + text;
            },

            /**
             * Publish Payload internal event
             *
             * @private
             */
            _pub = function() {
                _$payloadEvents.trigger.apply(_$payloadEvents, arguments);
            },

            /**
             * Subscribe to Payload internal event
             *
             * @private
             */
            _sub = function() {
                _$payloadEvents.on.apply(_$payloadEvents, arguments);
            },

            /**
             * Unsubscribe from Payload internal event
             *
             * @private
             */
            _unsub = function() {
                _$payloadEvents.off.apply(_$payloadEvents, arguments);
            },
            /**
             * Internal JSON API for localStorage
             *
             * @type {{}}
             * @private
             */
            _storage = {
                /**
                 * Safely store obj to localStorage under specified id
                 *
                 * @param id
                 * @param obj
                 */
                set: function(id, obj) {
                    if (window.localStorage && localStorage.setItem) {
                        try {
                            localStorage.setItem(id, JSON.stringify(obj));
                        } catch (err) {
                            _this.debug('warn', err);
                        }
                    } else {
                        _this.debug('warn', 'localStorage not available');
                    }
                },

                /**
                 * Safely get object in localStorage under specified id
                 *
                 * @param id
                 */
                get: function(id) {
                    var storage = {};
                    if (window.localStorage && localStorage.getItem) {
                        try {
                            storage = JSON.parse(localStorage.getItem(id));
                        } catch (err) {
                            _this.debug(err);
                        }
                    } else {
                        _this.debug('warn', 'localStorage not available');
                    }
                    return storage;
                },

                /**
                 * Safely remove localStorage item under specified id
                 *
                 * @param id
                 */
                remove: function(id) {
                    if (window.localStorage && localStorage.removeItem) {
                        localStorage.removeItem(id);
                    } else {
                        _this.debug('warn', 'localStorage not available');
                    }
                }
            },

        // Delegation methods

            _delegateApiRequests = function() {
                _$context.on('click.api-request auto-load.api-request', _selectors.API_LINK, function(e) {
                    var $this = $(this);
                    e.preventDefault();
                    if ($this.prop('disabled') || $this.hasClass('disabled')) {
                        return;
                    }
                    if (_options.apiOnClick($this, e)) {
                        _this.apiRequest($this);
                    }
                }).on('submit.api-request', _selectors.API_FORM, function(e) {
                    var $this = $(this);
                    e.preventDefault();
                    if (_options.apiOnSubmit($this, e)) {
                        _this.apiRequest($this);
                    }
                });
            },

            _delegateClicks = function() {
                _$context.on('click.click', _selectors.CLICK, function(e) {
                    var $this = $(this),
                        $click = $($this.attr(_dataPrefix + 'click'));

                    e.preventDefault();
                    $click.click();
                });
            },

            _delegateUnload = function() {
                $(window).on('beforeunload.payload', function() {
                    if (_options.storeAppData) {
                        _storage.set('payload.appData', _this.appData);
                    }
                });
            },

            _initDelegatedBehaviors = function() {
                _delegateApiRequests();
                _delegateClicks();
                _delegateUnload();
            },

            /**
             * Initialization
             *
             * @returns {Payload}
             * @private
             */
            _initialize = function() {
                _$context = $(_options.context);
                if (!_$context.length) {
                    _error('Selector "' + _options.context + '" not found');
                }
                _initDelegatedBehaviors();
                if (_options.subscribers.length) {
                    _this.addSubscribers(_options.subscribers);
                }
                if (_options.storeAppData) {
                    _this.appData = _storage.get('payload.appData');
                }
                return _this;
            },

            /**
             * Process view caching
             *
             * @param $origin
             * @param api
             * @param templateName
             * @private
             */
            _cacheView = function($origin, api, templateName) {
                var selector = api.selector,
                    $selector = $(selector),
                    key, current;

                if (templateName === _lastTemplate && $origin.closest(selector).length) {
                    return;
                }

                if (_cache.view[selector]) {
                    for (key in _cache.view[selector]) {
                        if (_cache.view[selector].hasOwnProperty(key) && _cache.view[selector][key].html === null) {
                            _cache.view[selector][key].html = $selector.contents().detach();
                            current = key;
                            break;
                        }
                    }
                } else if (api.cacheView) {
                    _cache.view[selector] = {};
                }

                if (api.cacheView) {
                    if (_cache.view[selector][templateName] && templateName !== current) {
                        _cache.view[selector][templateName].html = null;
                    } else if (!_cache.view[selector][templateName]) {
                        _cache.view[selector][templateName] = {
                            html: null,
                            done: $.noop
                        };
                    }
                    _lastTemplate = templateName;
                } else {
                    _lastTemplate = null;
                }
            },

            /**
             * Publish the user defined events for a given API request
             *
             * @param params
             * @param namespace
             * @private
             */
            _publishUserEvents = function(params, namespace) {
                var i = 0,
                    event_name;

                for (; i < params.api.events.length; i++) {
                    event_name = params.api.events[i];
                    if (namespace) {
                        event_name += '.' + namespace;
                    }
                    _this.publish(event_name, [params] || []);
                }
            }

            ; // End private var declaration

        /**
         *
         * Public vars and methods
         *
         */

        this.options = _options;

        /**
         * Stores registered Payload components and gives public access to them, if needed
         * Additionally, if a component is unregistered, it will be removed from this object
         *
         * @type {{}}
         */
        this.components = {};

        /**
         * This object is supplied for storing custom data within your app
         * It is exposed within templates via the "app" namespace
         *
         * @type {{}}
         */
        this.appData = {};

        /**
         * Expose the internal _cache object for external editing
         *
         * @type {{response: {}, view: {}}}
         */
        this.cache = _cache;

        /**
         * Expose the internal _debug method for external use
         *
         * @type {_debug}
         */
        this.debug = _debug;

        /**
         * Expose internal storage API
         *
         * @type {{}}
         */
        this.storage = _storage;

        /**
         * Deliver Payload API functionality to the specified context
         *
         * @param opts
         */
        this.deliver = function(opts) {
            if (typeof(opts) === 'function') {
                _options.apiCallback = opts;
            } else if (typeof(opts) === 'object') {
                _this.merge(opts);
            } else if (typeof(opts) === 'string') {
                _options.context = opts;
            }
            return _initialize();
        };

        /**
         * Merge the current options with the given new options
         *
         * @param opts
         * @returns {*}
         */
        this.merge = function(opts) {
            return $.extend(_options, opts);
        };

        /**
         * Make an API request via the given jQuery $origin object
         * This method is called internally when a Payload API object is interacted with in the DOM
         * It may also be called directly by supplying any jQuery object with the appropriate attributes
         *
         * @param $origin
         * @todo - break this up into more granular methods
         */
        this.apiRequest = function($origin) {
            var api = {
                    href: $origin.attr('href'),
                    url: $origin.attr(_dataPrefix + 'url') || $origin.attr('action'),
                    method: ($origin.attr(_dataPrefix + 'method') || $origin.attr('method') || 'get').toLowerCase(),
                    cacheRequest: $origin.attr(_dataPrefix + 'cache-request') || false,
                    cacheResponse: $origin.attr(_dataPrefix + 'cache-response') || false,
                    cacheView: $origin.attr(_dataPrefix + 'cache-view') || false,
                    type: $origin.attr(_dataPrefix + 'type') || 'json',
                    selector: $origin.attr(_dataPrefix + 'selector') || false,
                    template: _options.templatesNamespace[$origin.attr(_dataPrefix + 'template')] || false,
                    partial: _options.partialsNamespace[$origin.attr(_dataPrefix + 'partial')] || false,
                    events: $origin.attr(_dataPrefix + 'publish') ? $origin.attr(_dataPrefix + 'publish').split(' ') : [],
                    requestData: $.extend({}, _this.serializeObject($origin), JSON.parse($origin.attr(_dataPrefix + 'form') || '{}')),
                    timeout: $origin.attr(_dataPrefix + 'timeout') || _options.timeout,
                    templateData: {
                        app: _this.appData,
                        view: $origin.data()
                    }
                },
                templateName = $origin.attr(_dataPrefix + 'template') || $origin.attr(_dataPrefix + 'partial'),
                api_request, $selector, $loading, $load, html, templateData, params;

            // Add the request payload to the template data under "request" namespace
            api.templateData.request = $.extend({
                href: api.href,
                url: api.url,
                method: api.method,
                cacheKey: api.url + $origin.serialize()
            }, api.requestData);
            // Grab a reference to its easier to refer to the cache key
            // ... which may be modified by the "pre" events below
            api_request = api.templateData.request;

            // If caching is invoked and this is the last template loaded, do nothing
            if (api.cacheView && _lastTemplate === templateName) {
                return;
            }

            api.loading = ($origin.attr(_dataPrefix + 'loading') ?
                JSON.parse($origin.attr(_dataPrefix + 'loading')) : _options.loadingDefault);

            // Begin template sequence
            if (api.url || api.selector && (api.template || api.partial)) {
                $selector = $(api.selector);
                $loading = $origin.find('[' + _dataPrefix + 'role="loading"]');
                params = {
                    $origin: $origin,
                    $target: $selector,
                    api: api
                };
                // fire off a ".pre" name-spaced event to allow last-minute setup to occur
                _publishUserEvents(params, 'pre');

                if (api.cacheView &&
                    _cache.view[api.selector] &&
                    _cache.view[api.selector][templateName] &&
                    _cache.view[api.selector][templateName].html !== null
                ) {
                    html = _cache.view[api.selector][templateName].html;
                    _cacheView($origin, api, templateName);
                    _options.apiBeforeRender(params);
                    _pub('apiBeforeRender', [params]);
                    $selector.html(html);
                    _options.apiAfterRender(params);
                    _pub('apiAfterRender', [params]);
                    _cache.view[api.selector][templateName].done();
                    api.url = false;
                } else if (!api.url) {
                    _options.apiBeforeRender(params);
                    _pub('apiBeforeRender', [params]);
                    html = api.template ? api.template(api.templateData) : api.partial(api.templateData);
                    $selector.html(html);
                    _options.apiAfterRender(params);
                    _pub('apiAfterRender', [params]);
                    _cacheView($origin, api, templateName);
                }

                _options.apiCallback(params);

                if (!api.url) {
                    _publishUserEvents(params);
                    _this.triggerAutoLoad($selector.find(_selectors.AUTO_LOAD));
                    return;
                }

                _cacheView($origin, api, templateName);

                if (api.cacheResponse &&
                    _cache.response[api_request.cacheKey] &&
                    _cache.response[api_request.cacheKey].data &&
                    _cache.response[api_request.cacheKey].done
                ) {
                    templateData = $.extend({}, _cache.response[api_request.cacheKey].data, api.templateData);
                    params.response = _cache.response[api_request.cacheKey].response;
                    _options.apiBeforeRender(params);
                    _pub('apiBeforeRender', [params]);
                    html = api.template ? api.template(templateData) : api.partial(templateData);
                    $selector.html(html);
                    _options.apiAfterRender(params);
                    _pub('apiAfterRender', [params]);
                    _cache.response[api_request.cacheKey].done();
                    _publishUserEvents(params);
                    _this.triggerAutoLoad($selector.find(_selectors.AUTO_LOAD));
                    return;
                }

                // Begin AJAX sequence

                // Set selector as busy, and show loading indicator if available
                $selector.attr('aria-busy', true);
                if (api.loading) {
                    $load = $(_options.loadingHtml).attr(_dataPrefix + 'role', 'loading');
                    $selector.empty().prepend($load);
                } else if ($loading.length) {
                    $loading.show();
                }

                // Is there an access token?
                if (_options.apiAccessToken) {
                    api.requestData.access_token = _options.apiAccessToken;
                }

                $.ajax({
                    url: api.url,
                    type: api.method,
                    dataType: api.type,
                    data: (api.method === 'get') ? api.requestData : JSON.stringify(api.requestData),
                    contentType: 'application/json',
                    cache: api.cacheRequest,
                    timeout: api.timeout,
                    beforeSend: function(jqXHR, settings) {
                        var params = {
                            jqXHR: jqXHR,
                            settings: settings,
                            $origin: $origin,
                            $target: $selector,
                            api: api
                        };
                        if (_options.apiAccessToken) {
                            jqXHR.setRequestHeader('Authorization', 'Bearer ' + _options.apiAccessToken);
                        }
                        _options.xhrBeforeSend(params);
                        _pub('xhrBeforeSend', [params]);
                    }
                }).done(function(response, status, jqXHR) {
                    var responseData = _options.apiResponseParent ? response[_options.apiResponseParent] : response,
                        templateData = $.extend({}, api.templateData, $.isArray(responseData) ? {data: responseData} : responseData),
                        params = {
                            response: response,
                            status: status,
                            jqXHR: jqXHR,
                            $origin: $origin,
                            $target: $selector,
                            html: undefined, // filled in below after HTML is rendered
                            api: $.extend(api, {templateData: templateData})
                        },
                        xhrDone = function() {
                            _options.xhrDone(params);
                            _pub('xhrDone', [params]);
                            _this.triggerAutoLoad($selector.find(_selectors.AUTO_LOAD));
                        };

                    if ($selector.length && api.loading) {
                        $selector.find(_selectors.LOADING).first().fadeOut(100, function() {
                            _options.apiBeforeRender(params);
                            _pub('apiBeforeRender', [params]);
                            html = templateName ? (api.template ? api.template(templateData) : api.partial(templateData)) : false;
                            params.html = html;
                            $selector.html(html);
                            _options.apiAfterRender(params);
                            _pub('apiAfterRender', [params]);
                            xhrDone();
                            _publishUserEvents(params);
                        });
                    } else {
                        if ($selector.length) {
                            _options.apiBeforeRender(params);
                            _pub('apiBeforeRender', [params]);
                            html = templateName ? (api.template ? api.template(templateData) : api.partial(templateData)) : false;
                            params.html = html;
                            $selector.html(html);
                            _options.apiAfterRender(params);
                            _pub('apiAfterRender', [params]);
                        }
                        xhrDone();
                        _publishUserEvents(params);
                    }

                    if (api.cacheResponse) {
                        _cache.response[api_request.cacheKey] = {
                            response: response,
                            data: templateData,
                            done: xhrDone
                        };
                    } else if (api.cacheView) {
                        _cache.view[api.selector][templateName].done = xhrDone;
                    }
                }).fail(function(jqXHR, status, error) {
                    var params = {
                        jqXHR: jqXHR,
                        status: status,
                        error: error,
                        $origin: $origin,
                        $target: $selector,
                        api: api
                    };
                    _options.xhrFail(params);
                    _pub('xhrFail', [params]);
                }).always(function(responseORjqXHR, status, jqXHRorError) {
                    var success = (status === 'success'),
                        params = {
                            response: success ? responseORjqXHR : null,
                            jqXHR: (status === 'success') ? jqXHRorError : responseORjqXHR,
                            status: status,
                            error: success ? null : jqXHRorError,
                            $origin: $origin,
                            $target: $selector,
                            api: api
                        };

                    _options.xhrAlways(params);
                    _pub('xhrAlways', [params]);
                    // Remove selector busy status
                    $selector.removeAttr('aria-busy');
                });
            }
        };

        /**
         * Trigger the 'auto-load' event on given jQuery object
         * When no argument is passed, trigger 'auto-load' if found within the app context
         *
         * @param $e
         */
        this.triggerAutoLoad = function($e) {
            if ($e !== undefined) {
                if ($e instanceof $ && $e.length) {
                    $e.trigger('auto-load');
                }
            } else {
                _$context.find(_selectors.AUTO_LOAD).trigger('auto-load');
            }
        };

        /**
         * Publish a custom event
         * based on https://github.com/cowboy/jquery-tiny-pubsub
         */
        this.publish = function() {
            _debug('info', '"' + arguments[0] + '"', 'event published.');
            _$userEvents.trigger.apply(_$userEvents, arguments);
        };

        /**
         * Subscribe to a custom event
         * based on https://github.com/cowboy/jquery-tiny-pubsub
         */
        this.subscribe = function() {
            _$userEvents.on.apply(_$userEvents, arguments);
        };

        /**
         * Unsubscribe from a custom event
         * based on https://github.com/cowboy/jquery-tiny-pubsub
         */
        this.unsubscribe = function() {
            _$userEvents.off.apply(_$userEvents, arguments);
        };

        /**
         * Subscribe custom events to given methods in array of {events: [], methods: []} objects
         *
         * @param subscribers
         * @public
         */
        this.addSubscribers = function(subscribers) {
            $.each(subscribers, function(i, val) {
                if (val.events) {
                    if (typeof val.events === 'string') {
                        val.events = [val.events];
                    }
                } else {
                    return;
                }
                if (val.methods) {
                    if (typeof val.methods === 'function') {
                        val.methods = [val.methods];
                    }
                } else {
                    return;
                }
                $.each(val.events, function(j, ev) {
                    $.each(val.methods, function(k, func) {
                        _this.subscribe(ev, func);
                    });
                });
            });
        };

        /**
         * Convert given form input data to an object
         *
         * @param $form
         * @returns {{}}
         */
        this.serializeObject = function($form) {
            var o = {},
                a = $form.serializeArray();

            $.each(a, function() {
                if (o[this.name] !== undefined) {
                    if (!o[this.name].push) {
                        o[this.name] = [o[this.name]];
                    }
                    o[this.name].push(this.value || '');
                } else {
                    o[this.name] = this.value || '';
                }
            });
            return o;
        };

        /**
         * Clear cache of specified type ('response' or 'view') and optionally a single key
         * To clear all cache, pass no parameters
         *
         * @param type
         * @param key
         */
        this.clearCache = function(type, key) {
            if (type === undefined) {
                _cache = {
                    response: {},
                    view: {}
                };
            } else if (type === 'response') {
                if (key === undefined) {
                    _cache.response = {};
                } else {
                    delete _cache.response[key];
                }
            } else if (type === 'view') {
                if (key === undefined) {
                    _cache.view = {};
                } else {
                    delete _cache.view[key];
                }
            } else {
                return _error('clearCache() - Incorrect type defined');
            }
        };

        /**
         * Register a Payload.js component by supplying the name (str) and options (obj)
         *
         * @param name
         * @param options
         * @returns {*}
         */
        this.registerComponent = function(name, options) {
            var i = 0;
            if (_components[name] !== undefined) {
                return _error('registerComponent() - "' + name + '" component already exists');
            }
            if (options === undefined) {
                return _error('registerComponent() - "' + name + '" component options not defined');
            }
            _components[name] = options;
            for (; i < _payloadEvents.length; i++) {
                if (options[_payloadEvents[i]]) {
                    _sub(_payloadEvents[i] + '.' + name, options[_payloadEvents[i]]);
                }
            }
            _pub('init.' + name);
            return _components[name];
        };

        /**
         * Unregister a previously registered Payload.js component by supplying the name (str)
         *
         * @param name
         * @returns {boolean}
         */
        this.unregisterComponent = function(name) {
            if (_components[name] === undefined) {
                return _error('unregisterComponent() - "' + name + '" component does not exist');
            }
            _unsub('.' + name);
            return delete _components[name];
        };

    };

    return new Payload();

}));