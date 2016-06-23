!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.domjs=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
    'use strict';

    var forEach       = Array.prototype.forEach
        , map           = Array.prototype.map
        , slice         = Array.prototype.slice
        , keys          = Object.keys
        , reserved      = require('es5-ext/lib/reserved')
        , isFunction    = require('es5-ext/lib/Function/is-function')
        , partial       = require('es5-ext/lib/Function/prototype/partial')
        , dscope        = require('./dscope')
        , compact       = require('es5-ext/lib/Array/prototype/compact')
        , contains      = require('es5-ext/lib/Array/prototype/contains')
        , flatten       = require('es5-ext/lib/Array/prototype/flatten')
        , isList        = require('es5-ext/lib/Object/is-list')
        , isPlainObject = require('es5-ext/lib/Object/is-plain-object')
        , isObject      = require('es5-ext/lib/Object/is-object')
        , oForEach      = require('es5-ext/lib/Object/for-each')
        , oMap          = require('es5-ext/lib/Object/map')
        , toArray       = require('es5-ext/lib/Array/from')
        , isNode        = require('./is-node')

        , renameReserved, nodeMap, nextInit;

    renameReserved = (function (rename) {
        return function (scope) {
            Object.keys(scope).forEach(rename, scope);
        };
    }(function (key) {
        if (contains.call(reserved, key)) {
            this['_' + key] = this[key];
            delete this[key];
        }
    }));

    nodeMap = (function (create) {
        return {
            _cdata: create('createCDATASection'),
            _comment: create('createComment'),
            _text: create('createTextNode')
        };
    }(function (method) {
        return function (str) {
            return this.df.appendChild(this.document[method](str || ''));
        };
    }));

    nodeMap._element = function (name) {
        this.createElement(name, this.processArguments(slice.call(arguments, 1)));
    };
    nodeMap._direct = function () {
        forEach.call(arguments, this.df.appendChild, this.df);
    };
    nodeMap._detached = function () {
        return this.processChildren(toArray(arguments)).map(function (el) {
            if (el.parentNode) {
                el.parentNode.removeChild(el);
            }
            return el;
        });
    };

    nextInit = function (document, extRequire) {
        this.document = document;
        this.require = extRequire || require;
        this.df = this.document.createDocumentFragment();
        this.map = oMap(this.map, function (value) {
            return isFunction(value) ? value.bind(this) : value;
        }, this);
        return this;
    };

    module.exports = {
        init: (function (setCreate) {
            return function (elMap) {
                this.map = {};
                // attach node methods
                keys(nodeMap).forEach(function (key) {
                    this.map[key] = nodeMap[key];
                }, this);
                // attach element methods
                elMap.forEach(setCreate, this);
                renameReserved(this.map);
                this.map._map = this.map;

                this.init = nextInit;
                this.idMap = {};
                return this;
            };
        }(function (name) {
            this.map[name] = this.getCreate(name);
        })),
        build: function (f) {
            var df, predf;
            predf = this.df;
            df = this.df = this.document.createDocumentFragment();
            dscope(isFunction(f) ? f : partial.call(this.require, f), this.map);
            if (predf) {
                this.df = predf;
            }
            return df;
        },
        processArguments: function (args) {
            args = toArray(args);
            return [isPlainObject(args[0]) ? args.shift() : {}, args];
        },
        getCreate: function (name) {
            return function () {
                return this.getUpdate(this.createElement(name,
                    this.processArguments(arguments)));
            };
        },
        getUpdate: function (el) {
            return function f() {
                if (!arguments.length) {
                    return el;
                }
                this.updateElement(el, this.processArguments(arguments));
                return f;
            }.bind(this);
        },
        createElement: function (name, data) {
            return this.updateElement(this.df.appendChild(
                this.document.createElement(name)
            ), data);
        },
        processChildren: function (children) {
            return compact.call(flatten.call(children.map(function self(child) {
                if (isFunction(child)) {
                    child = child();
                } else if (!isNode(child) && isList(child) && isObject(child)) {
                    return map.call(child, self, this);
                } else if ((typeof child === "string") || (typeof child === "number")) {
                    child = this.document.createTextNode(child);
                }
                return child;
            }, this)));
        },
        updateElement: function (el, data) {
            var attrs = data[0], children = data[1], self = this;
            oForEach(attrs, function (value, name) {
                this.setAttribute(el, name, value);
            }, this);
            this.processChildren(children).forEach(el.appendChild, el);
            return el;
        },
        setAttribute: function (el, name, value) {
            if ((value == null) || (value === false)) {
                return;
            } else if (value === true) {
                value = name;
            }
            if (name === 'id') {
                if (this.idMap[value]) {
                    console.warn("Duplicate HTML element id: '" + value + "'");
                } else {
                    this.idMap[value] = el;
                }
            }
            el.setAttribute(name, value);
        },
        getById: function (id) {
            var current = this.document.getElementById(id);
            !this.idMap[id] && (this.idMap[id] = current);
            return current || this.idMap[id];
        }
    };

},{"./dscope":2,"./is-node":4,"es5-ext/lib/Array/from":5,"es5-ext/lib/Array/prototype/compact":6,"es5-ext/lib/Array/prototype/contains":7,"es5-ext/lib/Array/prototype/flatten":9,"es5-ext/lib/Function/is-function":12,"es5-ext/lib/Function/prototype/partial":14,"es5-ext/lib/Object/for-each":18,"es5-ext/lib/Object/is-list":20,"es5-ext/lib/Object/is-object":21,"es5-ext/lib/Object/is-plain-object":22,"es5-ext/lib/Object/map":24,"es5-ext/lib/reserved":29}],2:[function(require,module,exports){
// Dynamic scope for given function
// Pollutes global scope for time of function call

    'use strict';

    var keys     = Object.keys
        , global   = require('es5-ext/lib/global')
        , reserved = require('es5-ext/lib/reserved').all

        , set, unset;

    set = function (scope, cache) {
        keys(scope).forEach(function (key) {
            if (global.hasOwnProperty(key)) {
                cache[key] = global[key];
            }
            global[key] = scope[key];
        });
    };

    unset = function (scope, cache) {
        keys(scope).forEach(function (key) {
            if (cache.hasOwnProperty(key)) {
                global[key] = cache[key];
            } else {
                delete global[key];
            }
        });
    };

    module.exports = function (fn, scope) {
        var result, cache = {};
        set(scope, cache);
        result = fn();
        unset(scope, cache);
        return result;
    };

},{"es5-ext/lib/global":28,"es5-ext/lib/reserved":29}],3:[function(require,module,exports){
    'use strict';

    var isFunction = require('es5-ext/lib/Function/is-function')
        , d          = require('es5-ext/lib/Object/descriptor')
        , domjs      = require('./domjs')

        , html5js
        , superSetAttribute = domjs.setAttribute;

    html5js = Object.create(domjs, {
        setAttribute: d(function (el, name, value) {
            if ((name.slice(0, 2) === 'on') && isFunction(value)) {
                el.setAttribute(name, name);
                el[name] = value;
            } else {
                superSetAttribute.call(this, el, name, value);
            }
        })
    }).init(['a', 'abbr', 'address', 'area', 'article', 'aside', 'audio',
        'b', 'bdi', 'bdo', 'blockquote', 'br', 'button', 'canvas', 'caption', 'cite',
        'code', 'col', 'colgroup', 'command', 'datalist', 'dd', 'del', 'details',
        'device', 'dfn', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption',
        'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header',
        'hgroup', 'hr', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'keygen',
        'label', 'legend', 'li', 'link', 'map', 'mark', 'menu', 'meter', 'nav',
        'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param',
        'pre', 'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section',
        'select', 'small', 'source', 'span', 'strong', 'style', 'sub', 'summary',
        'sup', 'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time',
        'tr', 'track', 'ul', 'var', 'video', 'wbr']);

    module.exports = function (document, require) {
        return Object.create(html5js).init(document, require);
    };

},{"./domjs":1,"es5-ext/lib/Function/is-function":12,"es5-ext/lib/Object/descriptor":17}],4:[function(require,module,exports){
// Whether object is DOM node

    'use strict';

    module.exports = function (x) {
        return (x && (typeof x.nodeType === "number") &&
            (typeof x.nodeName === "string")) || false;
    };

},{}],5:[function(require,module,exports){
    'use strict';

    var isArray       = Array.isArray
        , slice         = Array.prototype.slice
        , isArguments   = require('../Function/is-arguments');

    module.exports = function (obj) {
        if (isArray(obj)) {
            return obj;
        } else if (isArguments(obj)) {
            return (obj.length === 1) ? [obj[0]] : Array.apply(null, obj);
        } else {
            return slice.call(obj);
        }
    };

},{"../Function/is-arguments":11}],6:[function(require,module,exports){
// Inspired by: http://documentcloud.github.com/underscore/#compact

    'use strict';

    var filter = Array.prototype.filter;

    module.exports = function () {
        return filter.call(this, Boolean);
    };

},{}],7:[function(require,module,exports){
    'use strict';

    var indexOf = require('./e-index-of');

    module.exports = function (searchElement) {
        return indexOf.call(this, searchElement, arguments[1]) > -1;
    };

},{"./e-index-of":8}],8:[function(require,module,exports){
    'use strict';

    var indexOf = Array.prototype.indexOf
        , isNaN   = require('../../Number/is-nan')
        , ois     = require('../../Object/is')
        , value   = require('../../Object/valid-value');

    module.exports = function (searchElement) {
        var i;
        if (!isNaN(searchElement) && (searchElement !== 0)) {
            return indexOf.apply(this, arguments);
        }

        for (i = (arguments[1] >>> 0); i < (value(this).length >>> 0); ++i) {
            if (this.hasOwnProperty(i) && ois(searchElement, this[i])) {
                return i;
            }
        }
        return -1;
    };

},{"../../Number/is-nan":15,"../../Object/is":23,"../../Object/valid-value":26}],9:[function(require,module,exports){
    'use strict';

    var isArray   = Array.isArray
        , forEach   = Array.prototype.forEach
        , push      = Array.prototype.push;

    module.exports = function flatten() {
        var r = [];
        forEach.call(this, function (x) {
            push.apply(r, isArray(x) ? flatten.call(x) : [x]);
        });
        return r;
    };

},{}],10:[function(require,module,exports){
    'use strict';

    module.exports = function () {
        return arguments;
    };

},{}],11:[function(require,module,exports){
    'use strict';

    var toString = Object.prototype.toString

        , id = toString.call(require('./arguments')());

    module.exports = function (x) {
        return toString.call(x) === id;
    };

},{"./arguments":10}],12:[function(require,module,exports){
    'use strict';

    var toString = Object.prototype.toString

        , id = toString.call(require('./noop'));

    module.exports = function (f) {
        return (typeof f === "function") && (toString.call(f) === id);
    };

},{"./noop":13}],13:[function(require,module,exports){
    'use strict';

    module.exports = function () {};

},{}],14:[function(require,module,exports){
    'use strict';

    var apply    = Function.prototype.apply
        , callable = require('../../Object/valid-callable')
        , toArray  = require('../../Array/from');

    module.exports = function () {
        var fn = callable(this)
            , args = toArray(arguments);

        return function () {
            return apply.call(fn, this, args.concat(toArray(arguments)));
        };
    };

},{"../../Array/from":5,"../../Object/valid-callable":25}],15:[function(require,module,exports){
    'use strict';

    module.exports = function (value) {
        return (value !== value);
    };

},{}],16:[function(require,module,exports){
// Internal method, used by iteration functions.
// Calls a function for each key-value pair found in object
// Optionally takes compareFn to iterate object in specific order

    'use strict';

    var call       = Function.prototype.call
        , keys       = Object.keys
        , isCallable = require('./is-callable')
        , callable   = require('./valid-callable')
        , value      = require('./valid-value');

    module.exports = function (method) {
        return function (obj, cb) {
            var list, thisArg = arguments[2], compareFn = arguments[3];
            value(obj);
            callable(cb);

            list = keys(obj);
            if (compareFn) {
                list.sort(isCallable(compareFn) ? compareFn : undefined);
            }
            return list[method](function (key, index) {
                return call.call(cb, thisArg, obj[key], key, obj, index);
            });
        };
    };

},{"./is-callable":19,"./valid-callable":25,"./valid-value":26}],17:[function(require,module,exports){
    'use strict';

    var isCallable = require('./is-callable')
        , callable   = require('./valid-callable')
        , contains   = require('../String/prototype/contains')

        , d;

    d = module.exports = function (dscr, value) {
        var c, e, w;
        if (arguments.length < 2) {
            value = dscr;
            dscr = null;
        }
        if (dscr == null) {
            c = w = true;
            e = false;
        } else {
            c = contains.call(dscr, 'c');
            e = contains.call(dscr, 'e');
            w = contains.call(dscr, 'w');
        }

        return { value: value, configurable: c, enumerable: e, writable: w };
    };

    d.gs = function (dscr, get, set) {
        var c, e;
        if (isCallable(dscr)) {
            set = (get == null) ? undefined : callable(get);
            get = dscr;
            dscr = null;
        } else {
            get = (get == null) ? undefined : callable(get);
            set = (set == null) ? undefined : callable(set);
        }
        if (dscr == null) {
            c = true;
            e = false;
        } else {
            c = contains.call(dscr, 'c');
            e = contains.call(dscr, 'e');
        }

        return { get: get, set: set, configurable: c, enumerable: e };
    };

},{"../String/prototype/contains":27,"./is-callable":19,"./valid-callable":25}],18:[function(require,module,exports){
    'use strict';

    module.exports = require('./_iterate')('forEach');

},{"./_iterate":16}],19:[function(require,module,exports){
// Inspired by: http://www.davidflanagan.com/2009/08/typeof-isfuncti.html

    'use strict';

    var forEach = Array.prototype.forEach.bind([]);

    module.exports = function (obj) {
        var type;
        if (!obj) {
            return false;
        }
        type = typeof obj;
        if (type === 'function') {
            return true;
        }
        if (type !== 'object') {
            return false;
        }

        try {
            forEach(obj);
            return true;
        } catch (e) {
            if (e instanceof TypeError) {
                return false;
            }
            throw e;
        }
    };

},{}],20:[function(require,module,exports){
    'use strict';

    var isFunction = require('../Function/is-function')
        , isObject   = require('./is-object');

    module.exports = function (x) {
        return ((x != null) && (typeof x.length === 'number') &&

                // Just checking ((typeof x === 'object') && (typeof x !== 'function'))
                // won't work right for some cases, e.g.:
                // type of instance of NodeList in Safari is a 'function'

            ((isObject(x) && !isFunction(x)) || (typeof x === "string"))) || false;
    };

},{"../Function/is-function":12,"./is-object":21}],21:[function(require,module,exports){
    'use strict';

    var map = { function: true, object: true };

    module.exports = function (x) {
        return ((x != null) && map[typeof x]) || false;
    };

},{}],22:[function(require,module,exports){
    'use strict';

    var getPrototypeOf = Object.getPrototypeOf
        , prototype      = Object.prototype
        , toString       = prototype.toString

        , id = {}.toString();

    module.exports = function (value) {
        return (value && (typeof value === 'object') &&
            (getPrototypeOf(value) === prototype) && (toString.call(value) === id)) ||
            false;
    };

},{}],23:[function(require,module,exports){
// Implementation credits go to:
// http://wiki.ecmascript.org/doku.php?id=harmony:egal

    'use strict';

    module.exports = function (x, y) {
        return (x === y) ?
            ((x !== 0) || ((1 / x) === (1 / y))) :
            ((x !== x) && (y !== y));
    };

},{}],24:[function(require,module,exports){
    'use strict';

    var forEach = require('./for-each');

    module.exports = function (obj, cb) {
        var o = {};
        forEach(obj, function (value, key) {
            o[key] = cb.call(this, value, key, obj);
        }, arguments[2]);
        return o;
    };

},{"./for-each":18}],25:[function(require,module,exports){
    'use strict';

    var isCallable = require('./is-callable');

    module.exports = function (fn) {
        if (!isCallable(fn)) {
            throw new TypeError(fn + " is not a function");
        }
        return fn;
    };

},{"./is-callable":19}],26:[function(require,module,exports){
    'use strict';

    module.exports = function (value) {
        if (value == null) {
            throw new TypeError("Cannot use null or undefined");
        }
        return value;
    };

},{}],27:[function(require,module,exports){
    'use strict';

    var indexOf = String.prototype.indexOf;

    module.exports = function (searchString) {
        return indexOf.call(this, searchString, arguments[1]) > -1;
    };

},{}],28:[function(require,module,exports){
    'use strict';

    module.exports = new Function("return this")();

},{}],29:[function(require,module,exports){
    'use strict';

    var freeze  = Object.freeze

        , keywords, future, futureStrict, all;

// 7.6.1.1 Keywords
    keywords = freeze(['break', 'case', 'catch', 'continue', 'debugger', 'default', 'delete', 'do',
        'else', 'finally', 'for', 'function', 'if', 'in', 'instanceof', 'new',
        'return', 'switch', 'this', 'throw', 'try', 'typeof', 'var', 'void', 'while',
        'with']);

// 7.6.1.2 Future Reserved Words
    future = freeze(['class', 'const', 'enum', 'exports', 'extends', 'import', 'super'])

// Future Reserved Words (only in strict mode)
    futureStrict = freeze(['implements', 'interface', 'let', 'package', 'private', 'protected', 'public',
        'static', 'yield']);

    all = module.exports = keywords.concat(future, futureStrict);
    all.keywords = keywords;
    all.future = future;
    all.futureStrict = futureStrict;
    freeze(all);

},{}]},{},[3])(3)
});