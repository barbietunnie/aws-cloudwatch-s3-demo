import fs from 'fs';
import appRoot from 'app-root-path';
import CWLogsWritable from 'cwlogs-writable';
import config from '../config.json';

const dataDir = appRoot.resolve('data/combined.log');
console.log(dataDir);

const streamLogs = () => {
    console.log('Config: ', config);

    return new Promise(resolve => {
        console.time('streamLogs'); // debug

        // Make stream name as unique as possible (see "Picking LogStream Names").
        const streamName = 'bao-de-log-stream/' + Date.now()
            + '/' + Math.round(Math.random() * 4026531839 + 268435456).toString(16);

        const writableStream = new CWLogsWritable({
            logGroupName: 'desktop-events-log-group',
            logStreamName: streamName,

            // Options passed to the AWS.CloudWatchLogs service.
            cloudWatchLogsOptions: {
                // Change the AWS region as needed.
                region: 'eu-west-1',

                // Example authenticating using access key.
                accessKeyId: config.access_key,
                secretAccessKey: config.secret_key
            }
        });

        const logFile = appRoot.resolve('data/combined.log');
        const stream = fs.createReadStream(logFile, 'utf-8');
        stream.on('data', data => {
            // console.log(data);
            // console.log(data.split(/\n/)[0]);

            data.split(/\n/).forEach(row => {
                row = row.replace(/^\s+|\s+$/g, ''); // replace spaces and newlines
                if(row) {
                    console.log(row);
                    console.log("\n");

                    writableStream.write(row);
                }
            });

            stream.destroy();
        });
        stream.on('close', () => {
            console.log('Finished reading file');
            console.timeEnd('streamLogs');
            writableStream.end();
            resolve();
        });
    });
};

streamLogs();
