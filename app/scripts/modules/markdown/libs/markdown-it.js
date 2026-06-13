/* global define */
define([
    'underscore',
    'q',
    'markdown-it',
    'prism/bundle',
    'markdown-it-san',
    'markdown-it-hash',
    'markdown-it-math',
    'markdown-it-imsize',
    'modules/markdown/libs/markdown-it-task',
    'modules/markdown/libs/markdown-it-file',
    'modules/markdown/libs/env-builder',
    'modules/markdown/libs/object-url-manager'
], function(_, Q, MarkdownIt, Prism, sanitizer, hash, math, imsize,
            task, file, EnvBuilder, ObjectURLManager) {
    'use strict';

    /**
     * Core Markdown renderer and parser.
     *
     * This is the *single* place that owns:
     *   - the Markdown-it instance and its plugin configuration
     *   - the ObjectURLManager that handles attachment URL lifecycles
     *   - the EnvBuilder that normalises plugin-produced env data
     *
     * Three public operations are exposed:
     *
     *   render(model)     – Markdown → HTML string (for preview / display)
     *   parse(content)    – Markdown → normalised env (tags, tasks, files)
     *   taskToggle(data)  – flip a checkbox in raw Markdown, then parse
     */
    function Markdown() {
        this.objectURLManager = new ObjectURLManager();

        this.md = new MarkdownIt({
            html      : true,
            xhtmlOut  : true,
            breaks    : true,
            linkify   : true,
            highlight : function(code, lang) {
                if (!Prism.languages[lang]) {
                    return '';
                }
                return Prism.highlight(code, Prism.languages[lang]);
            }
        });

        this._configure();
    }

    _.extend(Markdown.prototype, {

        // -----------------------------------------------------------------
        // Configuration
        // -----------------------------------------------------------------

        /**
         * Wire up Markdown-it plugins and custom renderer overrides.
         * Each plugin is responsible only for its own token-level work;
         * cross-cutting concerns (URL lifecycle, env normalisation) live
         * outside the plugins.
         */
        _configure: function() {
            this.md
                .use(sanitizer)
                .use(imsize)
                .use(math, {
                    inlineOpen       : '$',
                    inlineClose      : '$',
                    blockOpen        : '$$',
                    blockClose       : '$$',
                    renderingOptions : {},
                    inlineRenderer   : function(tokens) {
                        return '<span class="math inline">$' + tokens + '$</span>';
                    },
                    blockRenderer    : function(tokens) {
                        return '<div class="math block">$$' + tokens + '$$</div>';
                    }
                })
                .use(hash, {
                    hashtagRegExp : '[\\u0021-\\uFFFF\\w\\-]+|<3',
                    preceding     : '^|\\s'
                })
                .use(task.init)
                .use(file.init);

            // Responsive tables
            this.md.renderer.rules.table_open = function() {   // jshint ignore:line
                return '<div class="table-responsive"><table>';
            };
            this.md.renderer.rules.table_close = function() {  // jshint ignore:line
                return '</table></div>';
            };

            // Hashtag links – also accumulate tag names on env.
            this.md.renderer.rules.hashtag_open = function(tokens, idx, f, env) {  // jshint ignore:line
                var tagName = tokens[idx].content.toLowerCase();

                if (env) {
                    env.tags = env.tags || [];
                    env.tags.push(tagName);
                }

                return '<a href="#/notes/f/tag/q/' + tagName + '" class="label label-default">';
            };
        },

        // -----------------------------------------------------------------
        // Public API
        // -----------------------------------------------------------------

        /**
         * Render Markdown content to an HTML string.
         *
         * Side-effect: revokes ObjectURLs for files that are no longer
         * attached to the model.
         *
         * @param  {Object} model   Must expose `content`; may expose `id`
         *                          and `files` for URL lifecycle.
         * @return {Promise<string>}  Resolves with the rendered HTML.
         */
        render: function(model) {
            if (model.id) {
                this.objectURLManager.revokeStale(model.files);
            }

            var env = {
                modelData        : model,
                objectURLManager : this.objectURLManager
            };

            var html = this.md.render(_.unescape(model.content), env);
            return new Q(html);
        },

        /**
         * Parse Markdown and return normalised metadata (tags, tasks,
         * files, task counts).  No HTML is returned – the rendered output
         * is discarded.
         *
         * @param  {string} content  Raw Markdown.
         * @return {Promise<Object>} Resolves with EnvBuilder.normalize output.
         */
        parse: function(content) {
            var env = {};

            this.md.render(_.unescape(content), env);
            return new Q(EnvBuilder.normalize(env));
        },

        /**
         * Toggle the task at `data.taskId` in `data.content`, then parse
         * the updated content and return both the new Markdown source and
         * the normalised metadata.
         *
         * @param  {Object} data  `{ content: string, taskId: number }`
         * @return {Promise<Object>}  `{ content, tags, files, tasks, taskAll, taskCompleted }`
         */
        taskToggle: function(data) {
            data.content = _.unescape(data.content);
            data.content = task.toggle(data);

            return this.parse(data.content)
                .then(function(env) {
                    return _.extend({content: data.content}, env);
                });
        }
    });

    return Markdown;

});
