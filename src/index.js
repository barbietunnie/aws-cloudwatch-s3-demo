import fs from 'fs';
import appRoot from 'app-root-path';
import CWLogsWritable from 'cwlogs-writable';
import zlib from 'zlib';
import archiver from 'archiver';
import config from '../config.json';
import AWS from 'aws-sdk';

const dataDir = appRoot.resolve('data/combined.log');
console.log(dataDir);

const streamLogs = () => {
    console.log('Config: ', config);

    return new Promise(resolve => {
        console.time('streamLogs'); // debug

        // Make stream name as unique as possible (see "Picking LogStream Names").
        const streamName = 'appname-log-stream/' + Date.now()
            + '/' + Math.round(Math.random() * 4026531839 + 268435456).toString(16);

        const writableStream = new CWLogsWritable({
            logGroupName: 'appname-log-group',
            logStreamName: streamName,

            // Options passed to the AWS.CloudWatchLogs service.
            cloudWatchLogsOptions: {
                // Change the AWS region as needed.
                region: 'eu-west-1',
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

/**
 * Compress files in the 'data/storage' directory excluding
 * hidden files and 'auth.json' file.
 * Uses the in-built 'zlib' library to archive it's contents, however, the contents
 * of the zipped archive cannot be expanded manually for one reason or the other.
 * The other implementation that uses 'archiver' is better
 *
 * @param onFinish func - The function to be invoked when the compression is completed
 */
const compressAppData = () => {
    const appDataDir = appRoot.resolve('data/storage');
    const destArchive = appRoot.resolve('data/' +
        Math.round(Math.random() * 4026531839 + 268435456).toString(16) + '.tar.gz'); // change later to a temp dir
    console.log(`Directory: ${appDataDir}`);
    console.log(`Destination Archive: ${destArchive}\n`);

    const outputStream = fs.createWriteStream(destArchive);
    const gzip = zlib.createGzip();

    fs.readdir(appDataDir, (err, files) => {
        console.log(`${files.length} file(s) were found in the directory: `);
        files.forEach((file) => {
            console.log(`- ${appDataDir}/${file}`);
        });

        let ind = 0;
        Promise.all(files.map((file, index) => {
            // Skip hidden files and the authentication file
            if (!file.endsWith('.json') || file === 'auth.json' || ind > 0)
                return new Promise(resolve => {
                    resolve();
                });

            console.log(`${ind}. ${file}`);
            ind++;

            return new Promise((resolve, reject) => {
                console.log(`Reading ${appDataDir}/${file}...`);
                const inputStream = fs.createReadStream(`${appDataDir}/${file}`);

                inputStream.pipe(gzip).pipe(outputStream).on('finish', err => {
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

/**
 * Compress files in the 'data/storage' directory excluding
 * hidden files and 'auth.json' file.
 * Uses 'archiver' library to archive it's contents
 *
 * @param onFinish func - The function to be invoked when the compression is completed
 */
const compressAppData2 = (onFinish) => {
    const appDataDir = appRoot.resolve('data/storage');
    const destArchive = appRoot.resolve('data/' +
        Math.round(Math.random() * 4026531839 + 268435456).toString(16) + '.zip'); // change later to a temp dir
    console.log(`Directory: ${appDataDir}`);
    console.log(`Destination Archive: ${destArchive}\n`);

    const archive = archiver('zip', {
        gzip: true,
        zlib: { level: 9 }
    });
    const outputStream = fs.createWriteStream(destArchive);
    archive.on('error', function(err) {
        throw err;
    });
    outputStream.on('close', function() {
        console.log(archive.pointer() + ' total bytes written');

        if (onFinish) {
            onFinish(destArchive);
        }
    });
    archive.pipe(outputStream);

    console.time('zip');
    fs.readdir(appDataDir, (err, files) => {
        console.log(`${files.length} file(s) were found in the directory: `);
        files.forEach((file) => {
            console.log(`- ${appDataDir}/${file}`);
        });

        Promise.all(files.map((file) => {
            // Skip hidden files and sensitive-file.json file
            if (!file.endsWith('.json') || file === 'sensitive-file.json')
                return new Promise(resolve => {
                    resolve();
                });

            return new Promise((resolve) => {
                archive.file(`${appDataDir}/${file}`, { name: file });
                resolve();
            });
        })).then(() => archive.finalize());
    });
};

const uploadToS3 = (filePath, destFilename, callback) => {
    const s3 = new AWS.S3({
        accessKeyId: config.access_key,
        secretAccessKey: config.secret_key,
        region: 'eu-west-1'
    });

    fs.readFile(filePath, (err, data) => {
        if (err)
            throw err;

        s3.upload({
                Bucket: 'my-bucket-name',
                Key: destFilename,
                Body: data
                // ACL: 'public-read' // change later
        }, (err, res) => {
            if (err)
                throw err;

            if(callback)
                callback(res);
        });
    });
};

// streamLogs();
// compressAppData();
compressAppData2((zipFile) => {
    console.log(`***   Compression completed! - '${zipFile}'   ***`);
    console.timeEnd('zip');
    console.time('upload');
    uploadToS3(zipFile, `appname-data-${Math.round(Math.random() * 4026531839 + 268435456).toString(16)}.zip`, () => {
        console.log('Successfully uploaded file!');
        console.timeEnd('upload');
    });
});
