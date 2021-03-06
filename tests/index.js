var expect = require('chai').expect;
var TreeSync = require('../');
var quickTemp = require('quick-temp');
var walkSync = require('walk-sync');
var fs = require('fs');

describe('TreeSync', function() {
  var tmp;

  beforeEach(function() {
    tmp = quickTemp.makeOrRemake(this, 'tmpDestDir');
  });

  afterEach(function() {
    quickTemp.remove(this, 'tmpDestDir');
  });

  describe('fixtures/one', function() {
    var treeSync;

    beforeEach(function() {
      treeSync = new TreeSync(__dirname + '/fixtures/', tmp);
    });

    describe('nothing -> populated', function() {
      it('file content', function() {
        expect(walkSync(tmp)).to.deep.equal([]);

        treeSync.sync();

        expect(walkSync(tmp)).to.deep.equal([
            'one/',
            'one/bar/',
            'one/bar/bar.txt',
            'one/foo.txt',
        ]);
      });
    });

    describe('input(same) -> input(same)', function() {
      beforeEach(function() {
        treeSync.sync(); // setup initial
      });

      it('has stable output (mtime, size, mode, relativePath)', function() {
        var beforeTree = walkSync.entries(tmp);

        expect(beforeTree.length).to.eql(4);

        treeSync.sync();

        var afterTree = walkSync.entries(tmp);

        expect(afterTree.length).to.eql(4);
        expect(beforeTree).to.deep.equal(afterTree);
      });
    });

    describe('input(same) -> input(same + newFile)', function() {
      var newFilePath = __dirname + '/fixtures/one/added-file.js';

      beforeEach(function() {
        treeSync.sync(); // setup initial
      });

      afterEach(function() {
        fs.unlinkSync(newFilePath);
      });

      it('has stable output (mtime, size, mode, relativePath)', function() {
        var beforeTree = walkSync.entries(tmp);

        expect(beforeTree.length).to.eql(4);

        fs.writeFileSync(newFilePath, 'OMG'); // add file
        treeSync.sync();

        var afterTree = walkSync.entries(tmp);

        expect(afterTree.length).to.eql(5);
        expect(beforeTree).to.not.deep.equal(afterTree);

        var addedEntry = afterTree.filter(function(entry) {
          return entry['relativePath'] === 'one/added-file.js';
        })[0];

        expect(addedEntry).to.have.property('mode', 33188);
        expect(addedEntry).to.have.property('relativePath', 'one/added-file.js');

        treeSync.sync();

        expect(afterTree).to.deep.equal(walkSync.entries(tmp));
      });
    });

    describe('input(same) -> input(same - file)', function() {
      var removedFilePath = __dirname + '/fixtures/one/foo.txt';
      var removedFileContent = fs.readFileSync(removedFilePath);

      beforeEach(function() {
        treeSync.sync();                // setup initial
        fs.unlinkSync(removedFilePath); // remove file
        treeSync.sync();                // re-sync to apply change
      });

      afterEach(function() {
        fs.writeFileSync(removedFilePath, removedFileContent);
      });

      it('has stable output (mtime, size, mode, relativePath)', function() {
        var entries = walkSync.entries(tmp);

        expect(entries).to.have.deep.property('0.relativePath', 'one/');
        expect(entries).to.have.deep.property('0.mode', 16877);

        expect(entries).to.have.deep.property('1.relativePath', 'one/bar/');
        expect(entries).to.have.deep.property('1.mode', 16877);

        expect(entries).to.have.deep.property('2.relativePath', 'one/bar/bar.txt');
        expect(entries).to.have.deep.property('2.mode', 33188);

        expect(entries.length).to.eql(3);
      });
    });
  });
});
