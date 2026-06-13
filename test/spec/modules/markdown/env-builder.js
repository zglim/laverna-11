/* global define, describe, it, expect, beforeEach */
define([
    'modules/markdown/libs/env-builder'
], function(EnvBuilder) {
    'use strict';

    describe('modules/markdown/libs/env-builder', function() {

        describe('.normalize()', function() {

            it('returns default shape when env is empty', function() {
                var result = EnvBuilder.normalize({});
                expect(result).to.deep.equal({
                    tags          : [],
                    files         : [],
                    tasks         : [],
                    taskAll       : 0,
                    taskCompleted : 0
                });
            });

            it('returns default shape when env is undefined', function() {
                var result = EnvBuilder.normalize();
                expect(result.tags).to.be.an('array').that.is.empty;
                expect(result.files).to.be.an('array').that.is.empty;
                expect(result.tasks).to.be.an('array').that.is.empty;
                expect(result.taskAll).to.equal(0);
                expect(result.taskCompleted).to.equal(0);
            });

            it('deduplicates tags', function() {
                var result = EnvBuilder.normalize({
                    tags: ['todo', 'work', 'todo', 'work', 'personal']
                });
                expect(result.tags).to.have.length(3);
                expect(result.tags).to.include.members(['todo', 'work', 'personal']);
            });

            it('deduplicates files', function() {
                var result = EnvBuilder.normalize({
                    files: ['abc-123', 'def-456', 'abc-123']
                });
                expect(result.files).to.have.length(2);
                expect(result.files).to.include.members(['abc-123', 'def-456']);
            });

            it('passes through tasks array', function() {
                var result = EnvBuilder.normalize({
                    tasks: ['Buy milk', 'Walk dog']
                });
                expect(result.tasks).to.deep.equal(['Buy milk', 'Walk dog']);
            });

            it('computes taskAll from tasks length', function() {
                var result = EnvBuilder.normalize({
                    tasks: ['one', 'two', 'three']
                });
                expect(result.taskAll).to.equal(3);
            });

            it('passes through taskCompleted', function() {
                var result = EnvBuilder.normalize({
                    tasks: ['one', 'two'],
                    taskCompleted: 1
                });
                expect(result.taskCompleted).to.equal(1);
            });

            it('defaults taskCompleted to 0 when not set', function() {
                var result = EnvBuilder.normalize({
                    tasks: ['one']
                });
                expect(result.taskCompleted).to.equal(0);
            });

            it('defaults taskAll to 0 when tasks is absent', function() {
                var result = EnvBuilder.normalize({});
                expect(result.taskAll).to.equal(0);
            });

            it('ignores unknown env fields', function() {
                var result = EnvBuilder.normalize({
                    tags: ['a'],
                    randomField: 'should be ignored'
                });
                expect(result).to.not.have.property('randomField');
            });

            it('handles all fields populated at once', function() {
                var result = EnvBuilder.normalize({
                    tags          : ['tag1', 'tag2', 'tag1'],
                    files         : ['f1', 'f2'],
                    tasks         : ['task1', 'task2', 'task3'],
                    taskCompleted : 2
                });
                expect(result.tags).to.deep.equal(['tag1', 'tag2']);
                expect(result.files).to.deep.equal(['f1', 'f2']);
                expect(result.tasks).to.have.length(3);
                expect(result.taskAll).to.equal(3);
                expect(result.taskCompleted).to.equal(2);
            });
        });
    });
});
