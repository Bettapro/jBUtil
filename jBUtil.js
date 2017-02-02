/*
 jBUtil v0.0.1
 Copyright 2016 Alberto Bettin
 Released under the MIT license
 */


(function () {

    // avoid moltiple jB initialization
    if (window.jB !== undefined) {
        console.warn("jB has been already defined!");
        return;
    }

    // base jB, nothing more than a function and its prototype
    var _jB = function () {
        return this;
    };

    _jB.prototype = {};


    //**************************************************************************
    // jB base config

    _jB.prototype.config = {
        segmentBaseRoot: "",
        segmentIgnoreBaseRoot: "",
        segmentSiteRoot: "",
        sessionExpiredUrl: "",
        silentMode: false
    };

    //**************************************************************************
    // jB functions

    /**
     * Count entities attributes
     * @param {array, object, string, whatever} el the entity to count
     * @returns {Number} the count number
     */
    _jB.prototype.count = function (el) {
        switch (typeof el) {
            case "object":
                var size = 0;
                for (var key in el) {
                    if (el.hasOwnProperty(key))
                        size++;
                }
                return size;
            case "array":
            default:
                return el.length;
        }
    };

    /**
     * Convert string get from an object
     * 
     * @param {type} source the object containing params
     * @returns {String} "get" string
     */
    _jB.prototype.param = function (source) {
        if (typeof jQuery !== 'undefined') {
            return jQuery.param.apply(this, arguments);
        }

        var array = [];

        for (var key in source) {
            array.push(encodeURIComponent(key) + "=" + encodeURIComponent(source[key]));
        }

        return array.join("&");
    };

    /**
     * Extend two or more objects
     * 
     * if first param is true - deep mode is enebled
     * 
     * 
     * @returns {jBUtilL#8._jB}
     */
    _jB.prototype.extend = function () {
        if (typeof jQuery !== 'undefined') {
            return jQuery.extend.apply(this, arguments);
        }
        var options, name, src, copy, copyIsArray, clone, target = arguments[0] || {},
                i = 1,
                length = arguments.length,
                deep = false;

        // Handle a deep copy situation
        if (typeof target === "boolean") {
            deep = target;

            // Skip the boolean and the target
            target = arguments[i] || {};
            i++;
        }

        // Handle case when target is a string or something (possible in deep copy)
        if (typeof target !== "object" && typeof target !== "function") {
            target = {};
        }

        // Extend jQuery itself if only one argument is passed
        if (i === length) {
            target = this;
            i--;
        }

        for (; i < length; i++) {

            // Only deal with non-null/undefined values
            if ((options = arguments[i]) != null) {

                // Extend the base object
                for (name in options) {
                    src = target[name];
                    copy = options[name];

                    // Prevent never-ending loop
                    if (target === copy) {
                        continue;
                    }

                    // Recurse if we're merging plain objects or arrays
                    if (deep && copy && ((copyIsArray = Array.isArray(copy)) || typeof copy === 'object')) {

                        if (copyIsArray) {
                            copyIsArray = false;
                            clone = src && Array.isArray(src) ? src : [];

                        } else {
                            clone = src && typeof src === 'object' ? src : {};
                        }

                        // Never move original objects, clone them
                        target[name] = jB.extend(deep, clone, copy);

                        // Don't bring in undefined values
                    } else if (copy !== undefined) {
                        target[name] = copy;
                    }
                }
            }
        }

        // Return the modified object
        return target;
    };

    /**
     * Improved xhr call function, reduce some annoying configs and code required by
     * the original version
     * 
     * @param {object} para
     * @returns {undefined} -
     */
    _jB.prototype.fetch = function (para) {
        var default_params = {
            timeout: false,
            data: {},
            callback: function (obj) {
                if (!jB.config.silentMode) {
                    console.warn("No fetch-callback defined, server returns: " + obj);
                }
            },
            silent_mode: false
        };
        var response = {
            elapsedTime: 0,
            response: null,
            status: -1,
            msg: ""
        };
        var params = jB.extend({}, default_params, para);
        if (params.call === undefined || params.call === '') {
            response.status = 400;
            response.msg = 'Invalid xhr_call parameters';
            if (!params.silent_mode) {
                console.log('Core_util.fetch ' + response.status + ' response from ' + params.xhr_call + ' after ' + response.elapsedTime + 's');
            }
            params.callback(response);
            return;
        }

        var xhr = new XMLHttpRequest();
        if (jB.count(params.data) > 0) {
            // set post request with data
            xhr.open('POST', jB.siteUrl(params.call), true);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
            xhr.send(jB.param(params.data));
        } else {
            xhr.open('GET', jB.siteUrl(params.call), true);
            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            xhr.send();
        }

        var send_time = Date.now();
        jB.wait({
            sync_function: function () {
                return xhr.readyState === 4;
            },
            sync_clock: 50,
            timeout: params.timeout,
            silent_mode: true,
            done_callback: function () {
                response.status = xhr.status;
                response.elapsedTime = (Date.now() - send_time) / 1000;
                // check for login redirection
                if (xhr.responseURL === jB.siteUrl('admin/users/login')) {
                    response.status = 406;
                    response.msg = "The session has been expired, please reload the page.";
                    if (!params.silent_mode) {
                        // session lost, need to login again
                        alert('The session has been expired, please reload the page.');
                        console.log('Core_util.fetch ' + response.status + ' (Redirect) response from ' + params.call + ' after ' + response.elapsedTime.toFixed(2) + 's');
                    }
                    params.callback(response);
                    return;
                }

                //try to parse JSON response
                try {
                    response.response = JSON.parse(xhr.responseText);
                } catch (e) {
                    response.status = 406;
                    if (!params.silent_mode) {
                        console.log('Core_util.fetch ' + response.status + ' (Not Acceptable) response from ' + params.call + ' after ' + response.elapsedTime.toFixed(2) + 's');
                    }
                    params.callback(response);
                    return;
                }

                if (!params.silent_mode) {
                    console.log('Core_util.fetch ' + response.status + ' response from ' + params.call + ' after ' + response.elapsedTime.toFixed(2) + 's');
                }

                params.callback(response);
            },
            timeout_callback: function () {
                if (!params.silent_mode) {
                    console.log('Core_util.fetch ' + response.status + '(Timeout) response from ' + params.call + ' after ' + params.timeout.toFixed(2) + 's');
                }
                xhr.abort();
                response.status = 504;
                params.callback(response);
            }
        });
    };

    /**
     * Busy waiting implementation 
     * 
     * @param {object} para
     * @returns {undefined}
     */
    _jB.prototype.wait = function (para) {
        var default_params = {
            sync_name: '',
            sync_clock: 250,
            sync_function: function () {
                return false;
            },
            timeout: false,
            silent_mode: false,
            done_callback: function () {
                if (!jB.config.silentMode) {
                    console.warn("No wait-done_callback defined");
                }
            },
            timeout_callback: function () {
            },
            clock_callback: function () {
            }
        };
        var params = jB.extend({}, default_params, para);
        var start_time = Date.now();

        var clockInterval, timeoutTimer;

        clockInterval = setInterval(function () {
            routine();
        }, params.sync_clock);


        if (params.timeout !== false && params.timeout > 0) {
            timeoutTimer = setInterval(function () {
                clearInterval(clockInterval);
                if (!params.silent_mode) {
                    console.log('Core_util.busy_waiting action (' + params.sync_name + ') timeout');
                }
                params.timeout_callback();
            }, params.timeout);
        }

        var routine = function () {
            if (params.sync_function() !== false) {
                clearInterval(clockInterval);
                if (params.timeout === false || params.timeout <= 0) {
                    clearTimeout(timeoutTimer);
                }
                if (!params.silent_mode) {
                    var elapsed_time = (Date.now() - start_time) / 1000;
                    console.log('Core_util.busy_waiting action (' + params.sync_name + ') done after ' + elapsed_time.toFixed(2) + 's');
                }
                params.done_callback();
                return;
            }

            params.clock_callback();
        };
    };

    /**
     * Return the segment at required index (based on current url)
     * 
     * @param {type} index
     * @returns {jBUtilL#8._jB.prototype.segment.segments}
     */
    _jB.prototype.segment = function (index) {
        //remove character # at the end of the url
        var sanitizedUrlMatch = _sanitizeUrl(window.location.href);
        if (sanitizedUrlMatch.warn) {
            if (!this.config.silentMode) {
                console.warn("Current Url contains strange symbol");
            }
        }
        
        console.log(index);

        var sCount = 0;
        var segments = sanitizedUrlMatch.sanitized.replace(this.baseUrl(), "").split('/');
        console.log(segments);
        
        for (var i = index >= 0 ? 0 : (segments.length - 1); (index < 0 || i < segments.length) && (index >= 0 || i >= 0); index >= 0 ? i++ : i-- ) {
            if (segments[i].length <= 0) {
                continue;
            }
            if((index >= 0 && sCount >= index - 1) || (index < 0 && sCount >= (-1 * index) - 1)){
                return segments[i];
            }
            sCount++;
        }
        if (!this.config.silentMode) {
            console.warn("Invalid segment index, " + segments.length + "/" + index);
        }
        return null;
    };

    /**
     * Return the base url, use  if you what to create resource url
     * 
     * @param {string} url - optional - the string you what to add at the end of base url
     * @returns {string}
     */
    _jB.prototype.baseUrl = function (url) {
        var configBaseUrl = this.config.segmentBaseRoot ? _escapeSpecialCharRegex(this.config.segmentBaseRoot) : '';
        var configBaseEscapeUrl = this.config.segmentIgnoreBaseRoot ? _escapeSpecialCharRegex(this.config.segmentIgnoreBaseRoot) : '';

        var sanitizedUrlMatch = _sanitizeUrl(window.location.href);
        if (sanitizedUrlMatch.warn) {
            if (!this.config.silentMode) {
                console.warn("Current Url contains strange symbol");
            }
        }

        var baseRegex = new RegExp("(.*" + (configBaseUrl ? configBaseUrl : '') + ")" + (configBaseEscapeUrl ? '\/+' + configBaseEscapeUrl : ''));

        var homePath = sanitizedUrlMatch.sanitized.match(baseRegex)[1];
        if (homePath === null && !this.config.silentMode) {
            console.warn("Empty Base Url, please check 'config.segmentUrlRoot'");
        }
        if (url !== undefined) {
            homePath += (url.indexOf('/') !== 0 ? '/' : '') + url;
        }
        return homePath;
    };

    /**
     * Return the site url, use if you what to create resource url
     * 
     * @param {string} url - optional - the string you what to add at the end of site url
     * @returns {string}
     */
    _jB.prototype.siteUrl = function (url) {
        var configSiteUrl = this.config.segmentSiteRoot ? _escapeSpecialCharRegex(this.config.segmentSiteRoot) : '';
        //remove character # at the end of the url
        var sanitizedUrlMatch = _sanitizeUrl(window.location.href);
        if (sanitizedUrlMatch.warn) {
            if (!this.config.silentMode) {
                console.warn("Current Url contains strange symbol");
            }
        }

        var baseRegex = new RegExp("(.*\/+" + configSiteUrl + ")");
        var homePath = sanitizedUrlMatch.sanitized.match(baseRegex)[1];
        if (homePath === null && !this.config.silentMode) {
            console.warn("Empty Site Url, please check 'config.segmentUrlRoot'");
        }
        if (url !== undefined) {
            homePath += (url.indexOf('/') !== 0 ? '/' : '') + url;
        }
        return homePath;
    };

    /**
     * Return the human readable name of the browser 
     * @returns {String} the browser
     * Should be:
     *  - Chrome
     *  - Firefox
     *  - Safari
     *  - IE <version>
     */
    _jB.prototype.browserName = function () {
        var is_chrome = navigator.userAgent.indexOf('Chrome') > -1;
        var is_firefox = navigator.userAgent.indexOf('Firefox') > -1;
        var is_safari = navigator.userAgent.indexOf("Safari") > -1;
        var is_opera = navigator.userAgent.toLowerCase().indexOf("op") > -1;
        if ((is_chrome) && (is_safari)) {
            is_safari = false;
        }
        if ((is_chrome) && (is_opera)) {
            is_chrome = false;
        }

        if (is_chrome) {
            return 'Chrome';
        }
        if (is_firefox) {
            return 'Firefox';
        }

        if (is_safari) {
            return 'Safari';
        }

        var ua = window.navigator.userAgent;

        var msie = ua.indexOf('MSIE ');
        if (msie > 0) {
            // IE 10 or older => return version number
            return 'IE ' + parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
        }

        var trident = ua.indexOf('Trident/');
        if (trident > 0) {
            // IE 11 => return version number
            var rv = ua.indexOf('rv:');
            return 'IE ' + parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
        }

        var edge = ua.indexOf('Edge/');
        if (edge > 0) {
            // Edge (IE 12+) => return version number
            return 'IE ' + parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
        }

        if (is_opera) {
            return 'Opera';
        }
    };

    /**
     * Check if we're running on a mobile device of not
     * @returns {Boolean}
     */
    _jB.prototype.isMobile = function () {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Windows Phone|Opera Mini/i.test(navigator.userAgent);
    };

    /**
     * Round number to specified precision
     * @param {number} number the number to round
     * @param {number} precision the number of decimals we want to use
     * @returns {number} the rounded number
     */
    _jB.prototype.round = function (number, precision) {
        if (precision === undefined) {
            precision = 2;
        }
        return Math.round(number * Math.pow(10, precision)) / Math.pow(10, precision);
    };

    /**
     * Check if a value is a number or not
     * 
     * @param {type} number the number, we hope
     * @returns {Boolean} true if it is a number, false otherwise
     */
    _jB.prototype.isNumeric = function (number) {
        return !isNaN(parseFloat(number)) && isFinite(number);
    };
    
    /**
     * Extract a number from a mixed data
     * 
     * @param {type} i the variable to use
     * @returns {mixed} the number, null if no number can be returned
     */
    _jB.prototype.parseNum = function (i) {
        if (typeof i === 'string') {
            // remove ' , uses as separator
            i = i.replace(/\'/g, '');

            //replace , whit .
            var n = i.replace(/\,/g, '.');
            //search first number
            var n_c = n.match(/[-]?[0-9\.]+/);
            if (n_c === null) {
                return false;
            }
            //search for int number
            if (n_c[0].match(/\.([0-9]+$)/) === null) {
                return parseInt(n_c[0].replace(/\./g, ''));
            }
            //search for decimal number
            var regex = /([-]?[0-9.]*)\.([0-9]+)$/;
            var match = regex.exec(n_c[0]);
            return parseFloat((match[1].replace(/\./g, '') + '.' + match[2]));
        } else if (typeof i === 'number') {
            //nothig to do
            return i;
        } else {
            // doesn't know what to do

            return false;
        }
    };

    /**
     * Parse a string that contains a well formatted date, null if the string wasn't recognized
     * @param {string} string the date to parser
     * @returns {Date} the parsed date
     */
    _jB.prototype.parseDate = function (string) {
        // date dd/mm/yyyy hh:ii:ss
        var date_regex = string.match(/([0-9]{1,2})[\-\/]{1}([0-9]{1,2})[\-\/]{1}([0-9]{4}) ([0-9]{2}):([0-9]{2}):([0-9]{2})/);
        if (date_regex !== null && date_regex.length >= 7) {
            return new Date(date_regex[3], parseInt(date_regex[2]) - 1, date_regex[1], date_regex[4], date_regex[5], date_regex[6]);
        }
        //  date dd/mm/yyyy
        var date_regex = string.match(/([0-9]{1,2})[\-\/]{1}([0-9]{1,2})[\-\/]{1}([0-9]{4})/);
        if (date_regex !== null && date_regex.length >= 4) {
            return new Date(date_regex[3], parseInt(date_regex[2]) - 1, date_regex[1], 12, 0, 0);
        }
        // date mm/yyyy
        date_regex = string.match(/([0-9]{1,2})[\-\/]{1}([0-9]{4})/);
        if (date_regex !== null && date_regex.length >= 3) {
            return new Date(date_regex[2], date_regex[1] - 1, 01, 12, 0, 0);
        }
        // date yyyy-mm-dd
        date_regex = string.match(/([0-9]{4})[\-]([0-9]{4})[\-]([0-9]{4})/);
        if (date_regex !== null && date_regex.length >= 3) {
            return new Date(date_regex[1], date_regex[2] - 1, date_regex[3], 12, 0, 0);
        }
        return new Date(Date.parse(string));
    };

    /**
     * 
     * 
     * @param {type} format the format to use for the date
     * - dd day 2 digits
     * - mm month 2 digits
     * - YYYY year 4 digits
     * - HH hour 2 digits
     * - ii minutes 2 digits
     * - ss seconds 2 digits
     * @param {Date} date the Date object to use, if undefined the current date will be used
     * @returns {String} the formatted date
     */
    _jB.prototype.formatDate = function (format, date) {
        if (date === undefined) {
            date = new Date();
        }
        var year = date.getFullYear(), month = date.getMonth() + 1, day = date.getDate();
        var hour = date.getHours(), minutes = date.getMinutes() + 1, seconds = date.getSeconds();

        var formatted_date = format.replace('dd', day > 9 ? day : ('0' + day))
                .replace('mm', month > 9 ? month : ('0' + month))
                .replace('YYYY', year)
                .replace('HH', hour)
                .replace('ii', minutes)
                .replace('ss', seconds);

        return formatted_date;
    };




    //**************************************************************************
    // private methods - centralized functions


    /**
     * Create a string with escaped special char, ready to be used as regex component
     * @param {string} value
     * @returns {string}
     */
    var _escapeSpecialCharRegex = function (value) {
        return value.replace('/', '\\\/')
                .replace('.', '\\\.');
    };

    /**
     * Sanitize url, return url whithout any "undesired" stuff (particular chars ..)
     * 
     * @param {strinf} url the url to sanitize
     * @returns {object} the response canatinig the following keys
     *  - sanitized - what you're looking for, the sanitized url
     *  - warning - true if the sanitize function found some "undesired" stuff
     */
    var _sanitizeUrl = function (url) {
        var sanitizedMatch = url.match(/^(.*[a-zA-Z0-9])([\/\#\?]*)$/);

        return {
            sanitized: sanitizedMatch[1],
            warn: sanitizedMatch[2].length
        };
    };

    //**************************************************************************
    // ready to expose jB to the world  
    window.jB = new _jB();


})();


