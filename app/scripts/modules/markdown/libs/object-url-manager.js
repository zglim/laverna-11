/* global define, URL, webkitURL */
define([
    'underscore'
], function(_) {
    'use strict';

    var urlAPI = (typeof URL !== 'undefined' ? URL : webkitURL);

    /**
     * Manages the lifecycle of ObjectURLs created for file attachments.
     *
     * Previously, object URL creation was buried inside the file plugin
     * and revocation was called from the renderer, which coupled two
     * unrelated concerns and made it easy to leak URLs or revoke ones
     * still in use.
     *
     * This class centralises:
     *  - creation   (with deduplication – same file ID reuses its URL)
     *  - revocation of stale URLs (files no longer attached to a model)
     *  - full teardown (e.g. when the renderer is destroyed)
     */
    function ObjectURLManager() {
        this._urls = {};
    }

    _.extend(ObjectURLManager.prototype, {

        /**
         * Return the URL already associated with `id`, or `undefined`.
         */
        get: function(id) {
            return this._urls[id];
        },

        /**
         * Whether we currently hold a URL for `id`.
         */
        has: function(id) {
            return !!this._urls[id];
        },

        /**
         * Create (or reuse) an ObjectURL for a file object.
         *
         * @param  {Object} file  Must expose `id` and `src` (a Blob/File).
         * @return {string}       The ObjectURL.
         */
        createForFile: function(file) {
            if (this._urls[file.id]) {
                return this._urls[file.id];
            }
            var url = urlAPI.createObjectURL(file.src);
            this._urls[file.id] = url;
            return url;
        },

        /**
         * Revoke every URL whose file ID is *not* present in `files`.
         *
         * Call this before each render so that URLs belonging to files
         * that have been detached from the model are released promptly.
         *
         * @param {Array} files  Current file objects (each has an `id`).
         */
        revokeStale: function(files) {
            var activeIds = _.pluck(files || [], 'id');

            _.each(this._urls, function(url, id) {
                if (!_.contains(activeIds, id)) {
                    urlAPI.revokeObjectURL(url);
                    delete this._urls[id];
                }
            }, this);
        },

        /**
         * Revoke every URL held by this manager.
         */
        revokeAll: function() {
            _.each(this._urls, function(url) {
                urlAPI.revokeObjectURL(url);
            });
            this._urls = {};
        },

        /**
         * Return a shallow clone of the current URL map.
         *
         * Useful for passing a snapshot into the markdown-it `env`
         * without giving plugins a mutable reference to the internal
         * store.
         */
        snapshot: function() {
            return _.clone(this._urls);
        }
    });

    return ObjectURLManager;

});
