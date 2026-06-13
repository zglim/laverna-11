/* global define, describe, it, expect, before, beforeEach, afterEach, sinon, URL */
define([
    'modules/markdown/libs/markdown-it'
], function(Markdown) {
    'use strict';

    describe('modules/markdown/libs/markdown-it (core)', function() {
        var md,
            createStub,
            revokeStub;

        before(function() {
            md = new Markdown();
        });

        beforeEach(function() {
            createStub = sinon.stub(URL, 'createObjectURL').returns('blob:http://fake/stub');
            revokeStub = sinon.stub(URL, 'revokeObjectURL');
        });

        afterEach(function() {
            createStub.restore();
            revokeStub.restore();
            // Start each test with a clean URL manager.
            md.objectURLManager.revokeAll();
        });

        // -----------------------------------------------------------------
        // render()
        // -----------------------------------------------------------------

        describe('#render()', function() {

            it('returns a promise that resolves with HTML', function(done) {
                md.render({content: 'Hello **world**'})
                    .then(function(html) {
                        expect(html).to.be.a('string');
                        expect(html).to.contain('<strong>world</strong>');
                        done();
                    })
                    .done();
            });

            it('renders headings', function(done) {
                md.render({content: '# Title'})
                    .then(function(html) {
                        expect(html).to.contain('<h1');
                        expect(html).to.contain('Title');
                        done();
                    })
                    .done();
            });

            it('renders task checkboxes', function(done) {
                md.render({content: '- [ ] Buy milk'})
                    .then(function(html) {
                        expect(html).to.contain('type="checkbox"');
                        expect(html).to.contain('Buy milk');
                        done();
                    })
                    .done();
            });

            it('renders checked tasks', function(done) {
                md.render({content: '- [x] Done'})
                    .then(function(html) {
                        expect(html).to.contain('checked="checked"');
                        done();
                    })
                    .done();
            });

            it('renders hashtag links', function(done) {
                md.render({content: 'Some #tag here'})
                    .then(function(html) {
                        expect(html).to.contain('class="label label-default"');
                        expect(html).to.contain('#/notes/f/tag/q/tag');
                        done();
                    })
                    .done();
            });

            it('renders responsive tables', function(done) {
                var table = '| A | B |\n|---|---|\n| 1 | 2 |';
                md.render({content: table})
                    .then(function(html) {
                        expect(html).to.contain('table-responsive');
                        done();
                    })
                    .done();
            });

            it('replaces #file: links when modelData has matching files', function(done) {
                md.render({
                    content : '![img](#file:abc-123)',
                    files   : [{id: 'abc-123', src: {}}]
                })
                .then(function(html) {
                    expect(html).to.contain('blob:http://fake/stub');
                    done();
                })
                .done();
            });

            it('calls revokeStale when model has an id', function(done) {
                var spy = sinon.spy(md.objectURLManager, 'revokeStale');

                md.render({id: 'note-1', content: 'text', files: []})
                    .then(function() {
                        expect(spy.calledOnce).to.be.true;
                        spy.restore();
                        done();
                    })
                    .done();
            });

            it('does not call revokeStale when model has no id', function(done) {
                var spy = sinon.spy(md.objectURLManager, 'revokeStale');

                md.render({content: 'text'})
                    .then(function() {
                        expect(spy.called).to.be.false;
                        spy.restore();
                        done();
                    })
                    .done();
            });

            it('handles string-like model (just content)', function(done) {
                md.render({content: 'plain text'})
                    .then(function(html) {
                        expect(html).to.contain('plain text');
                        done();
                    })
                    .done();
            });
        });

        // -----------------------------------------------------------------
        // parse()
        // -----------------------------------------------------------------

        describe('#parse()', function() {

            it('returns normalised env with all fields', function(done) {
                md.parse('Hello')
                    .then(function(env) {
                        expect(env).to.have.property('tags').that.is.an('array');
                        expect(env).to.have.property('files').that.is.an('array');
                        expect(env).to.have.property('tasks').that.is.an('array');
                        expect(env).to.have.property('taskAll').that.is.a('number');
                        expect(env).to.have.property('taskCompleted').that.is.a('number');
                        done();
                    })
                    .done();
            });

            it('extracts tags', function(done) {
                md.parse('#tag1 and #tag2 and #tag1')
                    .then(function(env) {
                        expect(env.tags).to.include('tag1');
                        expect(env.tags).to.include('tag2');
                        // Deduplicated.
                        var tag1Count = env.tags.filter(function(t) { return t === 'tag1'; }).length;
                        expect(tag1Count).to.equal(1);
                        done();
                    })
                    .done();
            });

            it('counts tasks', function(done) {
                md.parse('- [ ] one\n- [x] two\n- [ ] three')
                    .then(function(env) {
                        expect(env.taskAll).to.equal(3);
                        expect(env.taskCompleted).to.equal(1);
                        expect(env.tasks).to.deep.equal(['one', 'two', 'three']);
                        done();
                    })
                    .done();
            });

            it('returns zeros when there are no tasks', function(done) {
                md.parse('Just text')
                    .then(function(env) {
                        expect(env.taskAll).to.equal(0);
                        expect(env.taskCompleted).to.equal(0);
                        expect(env.tasks).to.be.empty;
                        done();
                    })
                    .done();
            });

            it('extracts file references', function(done) {
                md.parse('![img](#file:abc-123) and [link](#file:def-456)')
                    .then(function(env) {
                        expect(env.files).to.include('abc-123');
                        expect(env.files).to.include('def-456');
                        done();
                    })
                    .done();
            });

            it('deduplicates file references', function(done) {
                md.parse('![a](#file:abc-123) ![b](#file:abc-123)')
                    .then(function(env) {
                        var count = env.files.filter(function(f) { return f === 'abc-123'; }).length;
                        expect(count).to.equal(1);
                        done();
                    })
                    .done();
            });
        });

        // -----------------------------------------------------------------
        // taskToggle()
        // -----------------------------------------------------------------

        describe('#taskToggle()', function() {

            it('toggles a task and returns updated content + env', function(done) {
                md.taskToggle({
                    content : '- [ ] Buy milk\n- [ ] Walk dog',
                    taskId  : 1
                })
                .then(function(result) {
                    expect(result.content).to.contain('[x] Buy milk');
                    expect(result.content).to.contain('[ ] Walk dog');
                    expect(result.taskAll).to.equal(2);
                    expect(result.taskCompleted).to.equal(1);
                    expect(result.tasks).to.deep.equal(['Buy milk', 'Walk dog']);
                    done();
                })
                .done();
            });

            it('toggles checked task back to unchecked', function(done) {
                md.taskToggle({
                    content : '- [x] Already done',
                    taskId  : 1
                })
                .then(function(result) {
                    expect(result.content).to.contain('[ ] Already done');
                    expect(result.taskCompleted).to.equal(0);
                    done();
                })
                .done();
            });

            it('includes tags in result', function(done) {
                md.taskToggle({
                    content : '- [ ] #urgent Task',
                    taskId  : 1
                })
                .then(function(result) {
                    expect(result.tags).to.include('urgent');
                    done();
                })
                .done();
            });

            it('includes files in result', function(done) {
                md.taskToggle({
                    content : '- [ ] See [doc](#file:abc-123)',
                    taskId  : 1
                })
                .then(function(result) {
                    expect(result.files).to.include('abc-123');
                    done();
                })
                .done();
            });

            it('toggles correct task by ID', function(done) {
                md.taskToggle({
                    content : '- [ ] First\n- [ ] Second\n- [ ] Third',
                    taskId  : 2
                })
                .then(function(result) {
                    expect(result.content).to.contain('[ ] First');
                    expect(result.content).to.contain('[x] Second');
                    expect(result.content).to.contain('[ ] Third');
                    expect(result.taskCompleted).to.equal(1);
                    done();
                })
                .done();
            });
        });
    });
});
