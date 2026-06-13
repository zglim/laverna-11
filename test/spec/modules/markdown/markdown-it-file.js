/* global define, describe, it, expect */
define([
    'modules/markdown/libs/markdown-it-file'
], function(File) {
    'use strict';

    describe('modules/markdown/libs/markdown-it-file', function() {

        describe('pattern', function() {

            it('matches #file: followed by hex-dash IDs', function() {
                expect(File.pattern.test('#file:abc-123')).to.be.true;
                expect(File.pattern.test('#file:0a1b2c3d')).to.be.true;
            });

            it('does not match unrelated hrefs', function() {
                expect(File.pattern.test('http://example.com')).to.be.false;
                expect(File.pattern.test('#tag')).to.be.false;
                expect(File.pattern.test('#file')).to.be.false;
            });
        });

        describe('.init()', function() {

            it('is a function', function() {
                expect(File.init).to.be.a('function');
            });
        });

        describe('._replaceLink()', function() {

            // Build a minimal token structure that mimics what markdown-it
            // passes to renderer rules.
            function makeToken(type, attrValue) {
                var attrName = (type === 'image') ? 'src' : 'href';
                return {
                    type      : type,
                    attrs     : [[attrName, attrValue]],
                    attrIndex : function(name) {
                        for (var i = 0; i < this.attrs.length; i++) {
                            if (this.attrs[i][0] === name) { return i; }
                        }
                        return -1;
                    }
                };
            }

            it('records file IDs on env.files when pattern matches', function() {
                var env    = {};
                var tokens = [makeToken('link_open', '#file:abc-123')];

                File._replaceLink(tokens, 0, {}, env);

                expect(env.files).to.deep.equal(['abc-123']);
            });

            it('does nothing when the href does not match', function() {
                var env    = {};
                var tokens = [makeToken('link_open', 'http://example.com')];

                File._replaceLink(tokens, 0, {}, env);

                expect(env.files).to.be.undefined;
            });

            it('resolves URL via objectURLManager when available', function() {
                var fileObj = {id: 'abc-123', src: {}};
                var env = {
                    modelData        : {files: [fileObj]},
                    objectURLManager : {
                        createForFile : function(f) {
                            return 'blob:http://fake/' + f.id;
                        }
                    }
                };
                var tokens = [makeToken('image', '#file:abc-123')];

                File._replaceLink(tokens, 0, {}, env);

                expect(tokens[0].attrs[0][1]).to.equal('blob:http://fake/abc-123');
                expect(env.files).to.deep.equal(['abc-123']);
            });

            it('does not resolve when file is not in modelData', function() {
                var env = {
                    modelData        : {files: []},
                    objectURLManager : {
                        createForFile : function() { return 'blob:http://fake/x'; }
                    }
                };
                var tokens = [makeToken('link_open', '#file:missing-id')];

                File._replaceLink(tokens, 0, {}, env);

                // href should remain unchanged.
                expect(tokens[0].attrs[0][1]).to.equal('#file:missing-id');
            });

            it('does not resolve when modelData is absent', function() {
                var env = {
                    objectURLManager : {createForFile: function() { return 'x'; }}
                };
                var tokens = [makeToken('link_open', '#file:abc-123')];

                File._replaceLink(tokens, 0, {}, env);

                expect(tokens[0].attrs[0][1]).to.equal('#file:abc-123');
                expect(env.files).to.deep.equal(['abc-123']);
            });
        });
    });
});
