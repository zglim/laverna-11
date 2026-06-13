/* global define, describe, it, expect, beforeEach */
define([
    'modules/markdown/libs/markdown-it-task'
], function(Task) {
    'use strict';

    describe('modules/markdown/libs/markdown-it-task', function() {

        // -----------------------------------------------------------------
        // toggle()
        // -----------------------------------------------------------------

        describe('.toggle()', function() {

            it('toggles an unchecked task to checked', function() {
                var result = Task.toggle({
                    content : '- [ ] Buy milk\n- [ ] Walk dog',
                    taskId  : 1
                });
                expect(result).to.contain('[x] Buy milk');
                expect(result).to.contain('[ ] Walk dog');
            });

            it('toggles a checked task to unchecked', function() {
                var result = Task.toggle({
                    content : '- [x] Buy milk\n- [ ] Walk dog',
                    taskId  : 1
                });
                expect(result).to.contain('[ ] Buy milk');
                expect(result).to.contain('[ ] Walk dog');
            });

            it('toggles the second task when taskId is 2', function() {
                var result = Task.toggle({
                    content : '- [ ] First\n- [ ] Second\n- [ ] Third',
                    taskId  : 2
                });
                expect(result).to.contain('[ ] First');
                expect(result).to.contain('[x] Second');
                expect(result).to.contain('[ ] Third');
            });

            it('handles upper-case X', function() {
                var result = Task.toggle({
                    content : '- [X] Done',
                    taskId  : 1
                });
                expect(result).to.contain('[ ] Done');
            });

            it('returns content unchanged when taskId exceeds task count', function() {
                var original = '- [ ] Only one';
                var result = Task.toggle({content: original, taskId: 99});
                expect(result).to.equal(original);
            });

            it('handles tasks with underscore and dash markers', function() {
                var result1 = Task.toggle({content: '[_] Under', taskId: 1});
                expect(result1).to.contain('[x] Under');

                var result2 = Task.toggle({content: '[-] Dash', taskId: 1});
                expect(result2).to.contain('[x] Dash');
            });

            it('preserves surrounding content', function() {
                var result = Task.toggle({
                    content : '# Title\n\nSome text\n\n- [ ] Task here\n\nMore text',
                    taskId  : 1
                });
                expect(result).to.contain('# Title');
                expect(result).to.contain('Some text');
                expect(result).to.contain('[x] Task here');
                expect(result).to.contain('More text');
            });
        });

        // -----------------------------------------------------------------
        // Pattern matching
        // -----------------------------------------------------------------

        describe('patterns', function() {

            it('pattern matches common task syntax', function() {
                expect(Task.pattern.test('[ ] unchecked')).to.be.true;
                expect(Task.pattern.test('[x] checked')).to.be.true;
                expect(Task.pattern.test('[X] checked')).to.be.true;
                expect(Task.pattern.test('[_] underscore')).to.be.true;
                expect(Task.pattern.test('[-] dash')).to.be.true;
            });

            it('pattern does not match invalid syntax', function() {
                expect(Task.pattern.test('[z] invalid')).to.be.false;
                expect(Task.pattern.test('[] no space')).to.be.false;
            });

            it('globPattern finds all tasks in multiline content', function() {
                var content = '- [ ] one\n- [x] two\n- [ ] three';
                var matches = content.match(Task.globPattern);
                expect(matches).to.have.length(3);
            });
        });

        // -----------------------------------------------------------------
        // init() – plugin interface
        // -----------------------------------------------------------------

        describe('.init()', function() {

            it('is a function', function() {
                expect(Task.init).to.be.a('function');
            });
        });
    });
});
