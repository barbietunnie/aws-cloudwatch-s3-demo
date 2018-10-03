'use strict';

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _appRootPath = require('app-root-path');

var _appRootPath2 = _interopRequireDefault(_appRootPath);

var _cwlogsWritable = require('cwlogs-writable');

var _cwlogsWritable2 = _interopRequireDefault(_cwlogsWritable);

var _zlib = require('zlib');

var _zlib2 = _interopRequireDefault(_zlib);

var _archiver = require('archiver');

var _archiver2 = _interopRequireDefault(_archiver);

var _config = require('../config.json');

var _config2 = _interopRequireDefault(_config);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var dataDir = _appRootPath2.default.resolve('data/combined.log');
console.log(dataDir);

var streamLogs = function streamLogs() {
    console.log('Config: ', _config2.default);

    return new Promise(function (resolve) {
        console.time('streamLogs'); // debug

        // Make stream name as unique as possible (see "Picking LogStream Names").
        var streamName = 'bao-de-log-stream/' + Date.now() + '/' + Math.round(Math.random() * 4026531839 + 268435456).toString(16);

        var writableStream = new _cwlogsWritable2.default({
            logGroupName: 'desktop-events-log-group',
            logStreamName: streamName,

            // Options passed to the AWS.CloudWatchLogs service.
            cloudWatchLogsOptions: {
                // Change the AWS region as needed.
                region: 'eu-west-1',

                // Example authenticating using access key.
                accessKeyId: _config2.default.access_key,
                secretAccessKey: _config2.default.secret_key
            }
        });

        var logFile = _appRootPath2.default.resolve('data/combined.log');
        var stream = _fs2.default.createReadStream(logFile, 'utf-8');
        stream.on('data', function (data) {
            // console.log(data);
            // console.log(data.split(/\n/)[0]);

            data.split(/\n/).forEach(function (row) {
                row = row.replace(/^\s+|\s+$/g, ''); // replace spaces and newlines
                if (row) {
                    console.log(row);
                    console.log("\n");

                    writableStream.write(row);
                }
            });

            stream.destroy();
        });
        stream.on('close', function () {
            console.log('Finished reading file');
            console.timeEnd('streamLogs');
            writableStream.end();
            resolve();
        });
    });
};

var compressAppData = function compressAppData() {
    var appDataDir = _appRootPath2.default.resolve('data/storage');
    var destArchive = _appRootPath2.default.resolve('data/' + Math.round(Math.random() * 4026531839 + 268435456).toString(16) + '.tar.gz'); // change later to a temp dir
    console.log('Directory: ' + appDataDir);
    console.log('Destination Archive: ' + destArchive + '\n');

    var outputStream = _fs2.default.createWriteStream(destArchive);
    var gzip = _zlib2.default.createGzip();

    _fs2.default.readdir(appDataDir, function (err, files) {
        console.log(files.length + ' file(s) were found in the directory: ');
        files.forEach(function (file) {
            console.log('- ' + appDataDir + '/' + file);
        });

        var ind = 0;
        Promise.all(files.map(function (file, index) {
            // Skip hidden files and the authentication file
            if (!file.endsWith('.json') || file === 'auth.json' || ind > 0) return new Promise(function (resolve) {
                resolve();
            });

            console.log(ind + '. ' + file);
            ind++;

            return new Promise(function (resolve, reject) {
                console.log('Reading ' + appDataDir + '/' + file + '...');
                var inputStream = _fs2.default.createReadStream(appDataDir + '/' + file);

                inputStream.pipe(gzip).pipe(outputStream).on('finish', function (err) {
                    if (err) {
                        console.error(err);
                        return reject(err);
                    }

                    resolve();
                });
            });
        })).then(console.log('Compression completed'));
    });
};

var compressAppData2 = function compressAppData2() {
    var appDataDir = _appRootPath2.default.resolve('data/storage');
    var destArchive = _appRootPath2.default.resolve('data/' + Math.round(Math.random() * 4026531839 + 268435456).toString(16) + '.zip'); // change later to a temp dir
    console.log('Directory: ' + appDataDir);
    console.log('Destination Archive: ' + destArchive + '\n');

    var archive = (0, _archiver2.default)('zip', {
        gzip: true,
        zlib: { level: 9 }
    });
    var outputStream = _fs2.default.createWriteStream(destArchive);
    archive.pipe(outputStream);

    _fs2.default.readdir(appDataDir, function (err, files) {
        console.log(files.length + ' file(s) were found in the directory: ');
        files.forEach(function (file) {
            console.log('- ' + appDataDir + '/' + file);
        });

        Promise.all(files.map(function (file, index) {
            // Skip hidden files and the authentication file
            if (!file.endsWith('.json') || file === 'auth.json') return new Promise(function (resolve) {
                resolve();
            });

            return new Promise(function (resolve, reject) {
                archive.file(appDataDir + '/' + file, { name: file });
                resolve();
            });
        })).then(function () {
            return archive.finalize();
        });
    });
};

// streamLogs();
// compressAppData();
compressAppData2();
