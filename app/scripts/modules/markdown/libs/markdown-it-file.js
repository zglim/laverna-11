/* global define */
define([
    'underscore'
], function(_) {
    'use strict';

    /**
     * File-link plugin for Markdown-it.
     *
     * Responsibility: replace `#file:<id>` pseudo-URLs found in link `href`
     * and image `src` attributes with real ObjectURLs so that the browser
     * can display or download attached files.
     *
     * URL *lifecycle* (creation, revocation, deduplication) is handled by
     * `ObjectURLManager`; the plugin only reads from `env.objectURLManager`
     * and records which file IDs were referenced so that EnvBuilder can
     * include them in the normalised result.
     *
     * Env contract:
     *   env.objectURLManager – ObjectURLManager instance (injected by renderer)
     *   env.modelData        – note model data with `.files` array
     *   env.files            – Array<string> file IDs referenced during render
     */
    var File = {

        pattern: /#file:([a-z0-9\-])+/,

        // -----------------------------------------------------------------
        // Public API
        // -----------------------------------------------------------------

        /**
         * Register the plugin with a Markdown-it instance.
         */
        init: function(md) {
            var origImage = md.renderer.rules.image;

            md.renderer.rules.link_open = function(tokens, idx, opt, env, self) {  // jshint ignore:line
                File._replaceLink(tokens, idx, opt, env);
                return self.renderToken(tokens, idx, opt);
            };

            md.renderer.rules.image = function(tokens, idx, opt, env, self) {
                File._replaceLink(tokens, idx, opt, env);
                return origImage(tokens, idx, opt, env, self);
            };
        },

        // -----------------------------------------------------------------
        // Internals
        // -----------------------------------------------------------------

        /**
         * If the link/image attribute matches a `#file:` pseudo-URL, resolve
         * it to a real ObjectURL via the env's ObjectURLManager.
         */
        _replaceLink: function(tokens, idx, options, env) {
            var type = (tokens[idx].type === 'image' ? 'src' : 'href'),
                attrIdx = tokens[idx].attrIndex(type);

            if (attrIdx < 0) {
                return;
            }

            var attr = tokens[idx].attrs[attrIdx];

            if (!File.pattern.test(attr[1])) {
                return;
            }

            var id = attr[1].match(File.pattern)[0].replace('#file:', '');

            // Always record referenced file IDs.
            if (env) {
                env.files = env.files || [];
                env.files.push(id);
            }

            if (!env || !env.objectURLManager || !env.modelData) {
                return;
            }

            File._resolveURL(attr, id, env);
        },

        /**
         * Look up the file in modelData and obtain (or create) an ObjectURL
         * from the manager.
         */
        _resolveURL: function(attr, id, env) {
            var file = _.findWhere(env.modelData.files, {id: id});

            if (!file) {
                return;
            }

            attr[1] = env.objectURLManager.createForFile(file);
        }
    };

    return File;

});
