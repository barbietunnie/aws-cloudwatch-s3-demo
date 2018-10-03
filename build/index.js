'use strict';

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _appRootPath = require('app-root-path');

var _appRootPath2 = _interopRequireDefault(_appRootPath);

var _cwlogsWritable = require('cwlogs-writable');

var _cwlogsWritable2 = _interopRequireDefault(_cwlogsWritable);

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

streamLogs();
