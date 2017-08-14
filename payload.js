/*!
 * Payload.js - Javascript Single Page Application Driver
 * @see {@link http://payloadjs.com}
 *
 * @copyright 2015-2017, Philip Klauzinski
 * @license Released under the MIT license (http://www.opensource.org/licenses/mit-license.php)
 * @author Philip Klauzinski (http://webtopian.com)
 * @version 0.5.3
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
        root.Payload = factory(root.jQuery);
    }

}(this, function($) {

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
                context: 'body',
                dataNamespace: '',
                debug: false,
                loadingDefault: true,
                loadingHtml: '<small>Loading...</small>',
                partials: (typeof Handlebars === 'undefined') ? {} : Handlebars.partials,
                subscribers: [], // [ {events: [], methods: [] } ]
                templates: (typeof Handlebars === 'undefined') ? {} : Handlebars.templates,
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
                AUTO_LOAD: '[' + _dataPrefix + 'auto-load]',
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
                            if (m.hasOwnProperty(sMethod)) {
                                if (typeof console[sMethod] === 'function') {
                                    args = (typeof m[sMethod] === 'string' || (typeof m[sMethod] === 'object' && m[sMethod].length === undefined)) ? [m[sMethod]] : m[sMethod];
                                    console[sMethod].apply(console, args);
                                } else {
                                    console.log(m[sMethod]);
                                }
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
             * Test if browser storage API is both supported and available
             *
             * @param type
             * @returns {boolean}
             * @private
             */
            _storageAvailable = function(type) {
                try {
                    var storage = window[type],
                        name = '__storage_test__';

                    storage.setItem(name, 1);
                    storage.removeItem(name);
                    return true;
                } catch (e) {
                    return false;
                }
            },

            /**
             * Internal JSON API for localStorage
             *
             * @type {{}}
             * @private
             */
            _storage = {
                /**
                 * Safely store obj to localStorage or sessionStorage under specified id
                 * Defaults to localStorage. Pass optional _type param as 'session' to access sessionStorage.
                 *
                 * @param id
                 * @param obj
                 * @param _type
                 */
                set: function(id, obj, _type) {
                    var type = _type === 'session' ? 'sessionStorage' : 'localStorage';
                    if (_storageAvailable(type)) {
                        window[type].setItem(id, JSON.stringify(obj));
                    } else {
                        _this.debug('warn', type + ' not available');
                    }
                    return obj;
                },

                /**
                 * Safely get object in localStorage or sessionStorage under specified id
                 * Defaults to localStorage. Pass optional _type param as 'session' to access sessionStorage.
                 *
                 * @param id
                 * @param _type
                 */
                get: function(id, _type) {
                    var type = _type === 'session' ? 'sessionStorage' : 'localStorage',
                        storage = {};

                    if (_storageAvailable(type)) {
                        storage = JSON.parse(window[type].getItem(id));
                    } else {
                        _this.debug('warn', type + ' not available');
                    }
                    // storage could be null, so return {} if so
                    return storage || {};
                },

                /**
                 * Safely remove localStorage or sessionStorage item under specified id
                 * Defaults to localStorage. Pass optional _type param as 'session' to access sessionStorage.
                 *
                 * @param id
                 * @param _type
                 */
                remove: function(id, _type) {
                    var type = _type === 'session' ? 'sessionStorage' : 'localStorage';
                    if (_storageAvailable(type)) {
                        window[type].removeItem(id);
                        return true;
                    } else {
                        _this.debug('warn', type + ' not available');
                        return false;
                    }
                }
            },

            /**
             * Shortcut methods for accessing _storage API as sessionStorage only
             *
             * @type {{}}
             * @private
             */
            _session = {
                set: function(id, obj) {
                    return _storage.set(id, obj, 'session');
                },
                get: function(id) {
                    return _storage.get(id, 'session');
                },
                remove: function(id) {
                    return _storage.remove(id, 'session');
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
                }).on('submit.api-request auto-load.api-request', _selectors.API_FORM, function(e) {
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

            _initDelegatedBehaviors = function() {
                _delegateApiRequests();
                _delegateClicks();
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
                return _this;
            },

            /**
             * Publish the user defined events for a given API request
             *
             * @param params
             * @param namespace
             * @private
             */
            _publishUserEvents = function(params, namespace) {
                var i, event_name;
                for (i = 0; i < params.api.events.length; i++) {
                    event_name = params.api.events[i] + '.' + (namespace || 'afterRender');
                    _this.publish(event_name, [params]);
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
         * Expose internal storage API with only sessionStorage
         *
         * @type {{}}
         */
        this.session = _session;

        /**
         * Deliver Payload API functionality to the specified context
         *
         * @param opts
         * @returns {Payload}
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
         * Optionally pass in data as second parameter to be sent with request
         *
         * @param $origin
         * @param data
         * @returns {Payload}
         * @todo - break this up into more granular methods
         */
        this.apiRequest = function($origin, data) {
            var api = {
                    href: $origin.attr('href'),
                    url: $origin.attr(_dataPrefix + 'url') || $origin.attr('action'),
                    method: ($origin.attr(_dataPrefix + 'method') || $origin.attr('method') || 'get').toLowerCase(),
                    cacheRequest: $origin.attr(_dataPrefix + 'cache-request') || false,
                    cacheResponse: $origin.attr(_dataPrefix + 'cache-response') || false,
                    type: $origin.attr(_dataPrefix + 'type') || 'json',
                    selector: $origin.attr(_dataPrefix + 'selector') || false,
                    template: _options.templates[$origin.attr(_dataPrefix + 'template')] || false,
                    partial: _options.partials[$origin.attr(_dataPrefix + 'partial')] || false,
                    events: $origin.attr(_dataPrefix + 'publish') ? $origin.attr(_dataPrefix + 'publish').split(' ') : [],
                    requestData: $.extend(
                        data !== undefined && data.constructor === Array ? [] : {},
                        _this.serializeObject($origin), data || {},
                        JSON.parse($origin.attr(_dataPrefix + 'form') || '{}')
                    ),
                    timeout: $origin.attr(_dataPrefix + 'timeout') || _options.timeout,
                    templateData: {
                        app: _this.appData,
                        view: $origin.data()
                    },
                    token: $origin.attr(_dataPrefix + 'token') || _options.apiAccessToken || false
                },
                templateName = $origin.attr(_dataPrefix + 'template') || $origin.attr(_dataPrefix + 'partial'),
                api_request, $target, $loading, $load, html, templateData, params;

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

            api.loading = ($origin.attr(_dataPrefix + 'loading') ?
                JSON.parse($origin.attr(_dataPrefix + 'loading')) : _options.loadingDefault);

            // Begin template sequence
            if (api.url || api.selector && (api.template || api.partial)) {
                $target = $(api.selector);
                $loading = $origin.find('[' + _dataPrefix + 'role="loading"]');
                params = {
                    $origin: $origin,
                    $target: $target,
                    api: api
                };

                if (!api.url) {
                    // User events with "pre" namespace triggered before render
                    _publishUserEvents(params, 'beforeRender');
                    _options.apiBeforeRender(params);
                    _pub('apiBeforeRender', [params]);
                    html = api.template ? api.template(api.templateData) : api.partial(api.templateData);
                    $target.html(html);
                    _options.apiAfterRender(params);
                    _pub('apiAfterRender', [params]);
                }

                _options.apiCallback(params);

                if (!api.url) {
                    _publishUserEvents(params);
                    _this.triggerAutoLoad($target.find(_selectors.AUTO_LOAD));
                    return _this;
                }

                if (api.cacheResponse &&
                    _cache.response[api_request.cacheKey] &&
                    _cache.response[api_request.cacheKey].data &&
                    _cache.response[api_request.cacheKey].done
                ) {
                    templateData = $.extend({}, _cache.response[api_request.cacheKey].data, api.templateData);
                    params.response = _cache.response[api_request.cacheKey].response;
                    // User events with "pre" namespace triggered before render
                    _publishUserEvents(params, 'beforeRender');
                    _options.apiBeforeRender(params);
                    _pub('apiBeforeRender', [params]);
                    html = api.template ? api.template(templateData) : api.partial(templateData);
                    $target.html(html);
                    _options.apiAfterRender(params);
                    _pub('apiAfterRender', [params]);
                    _cache.response[api_request.cacheKey].done();
                    _publishUserEvents(params);
                    _this.triggerAutoLoad($target.find(_selectors.AUTO_LOAD));
                    return _this;
                }

                // Begin AJAX sequence

                // Set selector as busy, and show loading indicator if available
                $target.attr('aria-busy', true);
                if (api.loading) {
                    $load = $(_options.loadingHtml).attr(_dataPrefix + 'role', 'loading');
                    $target.empty().prepend($load);
                } else if ($loading.length) {
                    $loading.show();
                }

                $.ajax({
                    url: api.url,
                    type: api.method,
                    dataType: api.type,
                    data: (api.method === 'get') ? $.param(data || {}) : JSON.stringify(api.requestData),
                    contentType: 'application/json',
                    cache: api.cacheRequest,
                    timeout: api.timeout,
                    beforeSend: function(jqXHR, settings) {
                        var params = {
                            jqXHR: jqXHR,
                            settings: settings,
                            $origin: $origin,
                            $target: $target,
                            api: api
                        };
                        if (api.token) {
                            jqXHR.setRequestHeader('Authorization', api.token);
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
                            $target: $target,
                            html: undefined, // filled in below after HTML is rendered
                            api: $.extend(api, {templateData: templateData})
                        },
                        xhrDone = function() {
                            _options.xhrDone(params);
                            _pub('xhrDone', [params]);
                            _this.triggerAutoLoad($target.find(_selectors.AUTO_LOAD));
                        },
                        $loading = $target.find(_selectors.LOADING);

                    // User events with "pre" namespace triggered before render
                    _publishUserEvents(params, 'beforeRender');

                    if ($target.length && api.loading && $loading.length) {
                        $loading.fadeOut(100, function() {
                            _options.apiBeforeRender(params);
                            _pub('apiBeforeRender', [params]);
                            html = templateName ? (api.template ? api.template(templateData) : api.partial(templateData)) : false;
                            params.html = html;
                            $target.html(html);
                            _options.apiAfterRender(params);
                            _pub('apiAfterRender', [params]);
                            xhrDone();
                            _publishUserEvents(params);
                        });
                    } else {
                        if ($target.length) {
                            _options.apiBeforeRender(params);
                            _pub('apiBeforeRender', [params]);
                            html = templateName ? (api.template ? api.template(templateData) : api.partial(templateData)) : false;
                            params.html = html;
                            $target.html(html);
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
                    }
                }).fail(function(jqXHR, status, error) {
                    var params = {
                        jqXHR: jqXHR,
                        status: status,
                        error: error,
                        $origin: $origin,
                        $target: $target,
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
                            $target: $target,
                            api: api
                        };

                    _options.xhrAlways(params);
                    _pub('xhrAlways', [params]);
                    // Remove selector busy status
                    $target.removeAttr('aria-busy');
                });
            }
            return _this;
        };

        /**
         * Trigger the 'auto-load' event on given jQuery object
         * When no argument is passed, trigger 'auto-load' if found within the app context
         *
         * @param $e
         * @returns {Payload}
         */
        this.triggerAutoLoad = function($e) {
            if ($e !== undefined) {
                if ($e instanceof $ && $e.length) {
                    $e.each(function() {
                        _this.apiRequest($(this));
                    });
                }
            } else {
                _$context.find(_selectors.AUTO_LOAD).each(function() {
                    _this.apiRequest($(this));
                });
            }
            return _this;
        };

        /**
         * Publish a custom event
         * based on https://github.com/cowboy/jquery-tiny-pubsub
         *
         * @returns {Payload}
         */
        this.publish = function() {
            if (arguments[0].indexOf('.') === -1) {
                arguments[0] += '.afterRender';
            }
            _debug('info', '"' + arguments[0] + '"', 'event published.');
            _$userEvents.trigger.apply(_$userEvents, arguments);
            return _this;
        };

        /**
         * Subscribe to a custom event
         * based on https://github.com/cowboy/jquery-tiny-pubsub
         *
         * @returns {Payload}
         */
        this.subscribe = function() {
            var namespaceIndex = arguments[0].indexOf('.');
            if (namespaceIndex === -1) {
                arguments[0] += '.afterRender';
            } else if (arguments[0].substr(namespaceIndex) === '.pre') {
                // @todo: remove the check for 'pre' namespace in v1.0
                arguments[0] = arguments[0].replace('.pre', '.beforeRender');
                _debug('warn', 'ATTENTION: The user event \'pre\' namespace has been deprecated. Use \'beforeRender\' instead.');
            }
            _$userEvents.on.apply(_$userEvents, arguments);
            return _this;
        };

        /**
         * Unsubscribe from a custom event
         * based on https://github.com/cowboy/jquery-tiny-pubsub
         *
         * @returns {Payload}
         */
        this.unsubscribe = function() {
            _$userEvents.off.apply(_$userEvents, arguments);
            return _this;
        };

        /**
         * Subscribe custom events to given methods in array of {events: [], methods: []} objects
         *
         * @param subscribers
         * @returns {Payload}
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
            return _this;
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
         * @returns {Payload}
         */
        this.clearCache = function(type, key) {
            if (type === undefined) {
                _cache = {
                    response: {}
                };
            } else if (type === 'response') {
                if (key === undefined) {
                    _cache.response = {};
                } else {
                    delete _cache.response[key];
                }
            } else {
                return _error('clearCache() - Incorrect type defined');
            }
            return _this;
        };

        /**
         * Register a component by supplying the name (str) and options (obj)
         *
         * @param name
         * @param options
         * @returns {Payload}
         */
        this.registerComponent = function(name, options) {
            var i;
            if (_components[name] !== undefined) {
                return _error('registerComponent() - "' + name + '" component already exists');
            }
            if (options === undefined) {
                return _error('registerComponent() - "' + name + '" component options not defined');
            }
            _components[name] = options;
            for (i = 0; i < _payloadEvents.length; i++) {
                if (options[_payloadEvents[i]]) {
                    _sub(_payloadEvents[i] + '.' + name, options[_payloadEvents[i]]);
                }
            }
            _pub('init.' + name);
            return _this;
        };

        /**
         * Unregister a previously registered component by supplying the name (str)
         *
         * @param name
         * @returns {Payload}
         */
        this.unregisterComponent = function(name) {
            if (_components[name] === undefined) {
                return _error('unregisterComponent() - "' + name + '" component does not exist');
            }
            _unsub('.' + name);
            delete _components[name];
            return _this;
        };

    };

    return new Payload();

}));