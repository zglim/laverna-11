/* global define, describe, it, expect, beforeEach, afterEach, sinon, URL */
define([
    'modules/markdown/libs/object-url-manager'
], function(ObjectURLManager) {
    'use strict';

    describe('modules/markdown/libs/object-url-manager', function() {
        var mgr,
            createStub,
            revokeStub;

        beforeEach(function() {
            mgr = new ObjectURLManager();

            // Stub the URL API so we don't create real blob URLs.
            createStub = sinon.stub(URL, 'createObjectURL').returns('blob:http://fake/abc');
            revokeStub = sinon.stub(URL, 'revokeObjectURL');
        });

        afterEach(function() {
            createStub.restore();
            revokeStub.restore();
        });

        // -----------------------------------------------------------------
        // Creation
        // -----------------------------------------------------------------

        describe('#createForFile()', function() {

            it('creates a new ObjectURL for an unseen file', function() {
                var url = mgr.createForFile({id: 'f1', src: {}});
                expect(url).to.equal('blob:http://fake/abc');
                expect(createStub.calledOnce).to.be.true;
            });

            it('reuses the URL for the same file ID', function() {
                createStub.onFirstCall().returns('blob:http://fake/first');
                createStub.onSecondCall().returns('blob:http://fake/second');

                var url1 = mgr.createForFile({id: 'f1', src: {}});
                var url2 = mgr.createForFile({id: 'f1', src: {}});

                expect(url1).to.equal('blob:http://fake/first');
                expect(url2).to.equal('blob:http://fake/first');
                expect(createStub.calledOnce).to.be.true;
            });

            it('creates separate URLs for different file IDs', function() {
                createStub.onFirstCall().returns('blob:http://fake/1');
                createStub.onSecondCall().returns('blob:http://fake/2');

                mgr.createForFile({id: 'f1', src: {}});
                mgr.createForFile({id: 'f2', src: {}});

                expect(createStub.calledTwice).to.be.true;
            });
        });

        // -----------------------------------------------------------------
        // Query
        // -----------------------------------------------------------------

        describe('#get() / #has()', function() {

            it('returns undefined / false for unknown IDs', function() {
                expect(mgr.get('nope')).to.be.undefined;
                expect(mgr.has('nope')).to.be.false;
            });

            it('returns the URL / true for known IDs', function() {
                mgr.createForFile({id: 'f1', src: {}});
                expect(mgr.has('f1')).to.be.true;
                expect(mgr.get('f1')).to.be.a('string');
            });
        });

        // -----------------------------------------------------------------
        // Revocation
        // -----------------------------------------------------------------

        describe('#revokeStale()', function() {

            it('revokes URLs whose IDs are not in the active list', function() {
                createStub.onFirstCall().returns('blob:http://fake/1');
                createStub.onSecondCall().returns('blob:http://fake/2');

                mgr.createForFile({id: 'f1', src: {}});
                mgr.createForFile({id: 'f2', src: {}});

                // Only f1 is still active.
                mgr.revokeStale([{id: 'f1'}]);

                expect(revokeStub.calledOnce).to.be.true;
                expect(revokeStub.firstCall.args[0]).to.equal('blob:http://fake/2');
                expect(mgr.has('f2')).to.be.false;
                expect(mgr.has('f1')).to.be.true;
            });

            it('revokes nothing when all files are still active', function() {
                mgr.createForFile({id: 'f1', src: {}});
                mgr.revokeStale([{id: 'f1'}]);
                expect(revokeStub.called).to.be.false;
            });

            it('revokes everything when active list is empty', function() {
                createStub.onFirstCall().returns('blob:http://fake/1');
                createStub.onSecondCall().returns('blob:http://fake/2');

                mgr.createForFile({id: 'f1', src: {}});
                mgr.createForFile({id: 'f2', src: {}});

                mgr.revokeStale([]);
                expect(revokeStub.calledTwice).to.be.true;
            });

            it('handles null/undefined gracefully', function() {
                mgr.createForFile({id: 'f1', src: {}});
                mgr.revokeStale(null);
                // Should treat null as empty → revoke all.
                expect(revokeStub.calledOnce).to.be.true;
            });
        });

        describe('#revokeAll()', function() {

            it('revokes every stored URL', function() {
                createStub.onFirstCall().returns('blob:http://fake/1');
                createStub.onSecondCall().returns('blob:http://fake/2');

                mgr.createForFile({id: 'f1', src: {}});
                mgr.createForFile({id: 'f2', src: {}});

                mgr.revokeAll();

                expect(revokeStub.calledTwice).to.be.true;
                expect(mgr.has('f1')).to.be.false;
                expect(mgr.has('f2')).to.be.false;
            });

            it('is safe to call when empty', function() {
                mgr.revokeAll();
                expect(revokeStub.called).to.be.false;
            });
        });

        // -----------------------------------------------------------------
        // Snapshot
        // -----------------------------------------------------------------

        describe('#snapshot()', function() {

            it('returns a shallow clone', function() {
                mgr.createForFile({id: 'f1', src: {}});
                var snap = mgr.snapshot();

                expect(snap).to.have.property('f1');

                // Mutating the snapshot must not affect the manager.
                snap.f1 = 'tampered';
                expect(mgr.get('f1')).not.to.equal('tampered');
            });

            it('returns an empty object when nothing stored', function() {
                expect(mgr.snapshot()).to.deep.equal({});
            });
        });
    });
});
