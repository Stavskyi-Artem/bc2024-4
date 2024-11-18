// Імпортуємо необхідні модулі
const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const { Command } = require('commander');
const superagent = require('superagent');

// Ініціалізація Commander.js
const program = new Command();
program
    .requiredOption('-h, --host <host>', 'Server host')
    .requiredOption('-p, --port <port>', 'Server port', parseInt)
    .requiredOption('-c, --cache <path>', 'Cache directory')
    .parse(process.argv);

const { host, port, cache } = program.opts();

// Перевіряємо, чи існує директорія для кешу
(async () => {
    try {
        await fs.mkdir(cache, { recursive: true });
    } catch (err) {
        console.error(`Error creating cache directory: ${err.message}`);
        process.exit(1);
    }
})();

// Функція для обробки запитів
const requestHandler = async (req, res) => {
    const method = req.method;
    const code = req.url.slice(1); // Витягуємо HTTP код із URL
    const filePath = path.join(cache, `${code}.jpg`);

    switch (method) {
        case 'GET':
            try {
                const file = await fs.readFile(filePath);
                res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                res.end(file);
            } catch (err) {
                if (err.code === 'ENOENT') {
                    try {
                        // Якщо файлу немає в кеші, робимо запит до http.cat
                        const response = await superagent.get(`https://http.cat/${code}`);
                        const image = response.body;

                        // Зберігаємо картинку в кеш
                        await fs.writeFile(filePath, image);
                        res.writeHead(200, { 'Content-Type': 'image/jpeg' });
                        res.end(image);
                    } catch (fetchError) {
                        res.writeHead(404, { 'Content-Type': 'text/plain' });
                        res.end('Not Found');
                    }
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                }
            }
            break;

        case 'PUT':
            try {
                const body = [];
                req.on('data', chunk => body.push(chunk));
                req.on('end', async () => {
                    const image = Buffer.concat(body); // Формуємо бінарні дані з тіла запиту

                    // Перевіряємо, чи є дані (якщо файл порожній, не зберігаємо)
                    if (image.length === 0) {
                        res.writeHead(400, { 'Content-Type': 'text/plain' });
                        res.end('Bad Request: No image data');
                        return;
                    }

                    // Зберігаємо зображення у кеш
                    await fs.writeFile(filePath, image);

                    // Відповідаємо клієнту
                    res.writeHead(201, { 'Content-Type': 'text/plain' });
                    res.end('Created');
                });
            } catch (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
            }
            break;


        case 'DELETE':
            try {
                await fs.unlink(filePath);
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('OK');
            } catch (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Not Found');
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                }
            }
            break;

        default:
            res.writeHead(405, { 'Content-Type': 'text/plain' });
            res.end('Method Not Allowed');
            break;
    }
};

// Створюємо та запускаємо сервер
const server = http.createServer(requestHandler);
server.listen(port, host, () => {
    console.log(`Server running at http://${host}:${port}/`);
});
