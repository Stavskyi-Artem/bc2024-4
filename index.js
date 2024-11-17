const { Command } = require('commander');
const http = require('http');
const { promises: fs } = require('fs');
const path = require('path');

const program = new Command();

program
    .requiredOption('--host <host>', 'адреса сервера')
    .requiredOption('--port <number>', 'порт сервера')
    .requiredOption('--cache <path>', 'шлях до директорії з кешем');

program.parse(process.argv);

const options = program.opts();

const cacheDir = options.cache;

const server = http.createServer(async (req, res) => {
    const urlParts = req.url.split('/');
    const httpCode = urlParts[1];

    if (!httpCode.match(/^\d{3}$/)) {
        res.statusCode = 400;
        res.end('Bad Request');
        return;
    }

    const filePath = path.join(cacheDir, `${httpCode}.jpg`);

    switch (req.method) {
        case 'GET':
            try {
                const fileData = await fs.readFile(filePath);
                res.setHeader('Content-Type', 'image/jpeg');
                res.statusCode = 200;
                res.end(fileData);
            } catch (err) {
                res.statusCode = 404;
                res.end('Not Found');
            }
            break;

        default:
            res.statusCode = 405;
            res.end('Method Not Allowed');
            break;
    }
});

server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено на ${options.host}:${options.port}`);
});