/* global define */
define([
    'underscore'
], function(_) {
    'use strict';

    /**
     * Task plugin for Markdown-it.
     *
     * Responsibility: recognise task-list syntax (`[ ] label` / `[x] label`)
     * and convert it to interactive checkbox HTML.
     *
     * The plugin also exposes a pure `toggle` helper that flips the checked
     * state of a specific task in raw Markdown source – used by the
     * `task:toggle` request path.
     *
     * Env contract (accumulated during render, normalised by EnvBuilder):
     *   env.tasks         – Array<string>  labels of every task encountered
     *   env.taskCompleted – number         count of checked tasks
     */
    var Task = {

        pattern     : /\[(X|\s|\_|\-)?\]\s(.*)/i,
        globPattern : /\[(X|\s|\_|\-)?\]\s(.*)/gi,

        // -----------------------------------------------------------------
        // Public API
        // -----------------------------------------------------------------

        /**
         * Register the plugin with a Markdown-it instance.
         */
        init: function(md) {
            md.core.ruler.push('task', Task._buildRule(md));
            md.renderer.rules.task_tag = Task._renderTask;  // jshint ignore:line
        },

        /**
         * Toggle the checked state of the task at `data.taskId` (1-based)
         * inside `data.content` and return the updated Markdown string.
         *
         * @param  {Object} data         `{ content: string, taskId: number }`
         * @return {string}              Updated Markdown content.
         */
        toggle: function(data) {
            var count   = 0,
                content = data.content;

            content = content.replace(Task.globPattern, function(match, checked, value) {
                count++;

                if (count !== data.taskId) {
                    return match;
                }

                checked = (checked === 'x' || checked === 'X') ? ' ' : 'x';
                return '[' + checked + '] ' + value;
            });

            return content;
        },

        // -----------------------------------------------------------------
        // Internals
        // -----------------------------------------------------------------

        /**
         * Build the core rule that rewrites inline text tokens containing
         * task syntax into dedicated `task_tag` tokens.
         */
        _buildRule: function(md) {
            var arrayReplaceAt = md.utils.arrayReplaceAt;

            return function(state) {
                var count = 0;

                _.each(state.tokens, function(token) {

                    // Non-inline tokens may still contain task text in their
                    // raw content (e.g. inside paragraphs); count them so that
                    // IDs stay sequential.
                    if (token.type !== 'inline') {
                        var matches = token.content.match(Task.globPattern);
                        if (matches) {
                            count += matches.length;
                        }
                        return;
                    }

                    _.each(token.children, function(child, i) {
                        if (child.type === 'text' && Task.pattern.test(child.content)) {
                            count++;
                            token.children = arrayReplaceAt(
                                token.children,
                                i,
                                Task._replaceToken(child, state.Token, count)
                            );
                        }
                    });
                });
            };
        },

        /**
         * Replace a text token with a `task_tag` token.
         */
        _replaceToken: function(original, Token, id) {
            var matches = original.content.match(Task.pattern),
                value   = matches[1],
                label   = matches[2],
                checked = (value === 'X' || value === 'x'),
                token;

            token = new Token('task_tag', '', 0);
            token.meta = {
                label   : label,
                checked : checked,
                id      : id
            };
            token.children = [];

            return [token];
        },

        /**
         * Render a `task_tag` token to checkbox HTML.
         * Also accumulates task stats on `env`.
         */
        _renderTask: function(tokens, id, options, env) {
            var m = tokens[id].meta;

            if (env) {
                env.tasks = env.tasks || [];
                env.tasks.push(m.label);

                if (m.checked) {
                    env.taskCompleted = (env.taskCompleted || 0) + 1;
                }
                else {
                    // Ensure the counter exists even when no task is checked.
                    env.taskCompleted = env.taskCompleted || 0;
                }
            }

            return '<label class="task task--checkbox">' +
                '<input data-task="' + m.id + '" type="checkbox"' +
                (m.checked ? 'checked="checked"' : '') +
                ' class="checkbox--input" />' +
                '<svg class="checkbox--svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
                '<path class="checkbox--path" d="M16.667,62.167c3.109,5.55,7.217,10.591,10.926,15.75 c2.614,3.636,5.149,7.519,8.161,10.853c-0.046-0.051,1.959,2.414,2.692,2.343c0.895-0.088,6.958-8.511,6.014-7.3 c5.997-7.695,11.68-15.463,16.931-23.696c6.393-10.025,12.235-20.373,18.104-30.707C82.004,24.988,84.802,20.601,87,16"></path>' +
                '</svg>' +
                '<span class="checkbox--text">' + m.label + '</span></label>';
        }
    };

    return Task;

});
