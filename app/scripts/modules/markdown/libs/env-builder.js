/* global define */
define([
    'underscore'
], function(_) {
    'use strict';

    /**
     * Normalizes the raw env object produced by markdown-it plugins
     * into a consistent, predictable shape.
     *
     * Every render / parse pass accumulates data on `env` (tags from the
     * hashtag plugin, file IDs from the file plugin, task labels and
     * completion counts from the task plugin).  This module collapses
     * that ad-hoc structure into a single well-defined result so that
     * callers never have to guess which fields are present.
     */
    var EnvBuilder = {

        /**
         * Normalize an env object produced by markdown-it rendering.
         *
         * @param  {Object} env  Raw env object accumulated during render.
         * @return {Object}      Normalized result with guaranteed fields.
         */
        normalize: function(env) {
            env = env || {};

            var tags    = env.tags  ? _.uniq(env.tags)   : [],
                files   = env.files ? _.uniq(env.files)  : [],
                tasks   = env.tasks || [],
                taskAll = tasks.length,
                done    = env.taskCompleted || 0;

            return {
                tags          : tags,
                files         : files,
                tasks         : tasks,
                taskAll       : taskAll,
                taskCompleted : done
            };
        }
    };

    return EnvBuilder;

});
