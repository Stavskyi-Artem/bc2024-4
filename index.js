// index.js
const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const { Command } = require("commander");

const program = new Command();

// Налаштування командного рядка
program
    .requiredOption("-h, --host <host>", "Адреса сервера")
    .requiredOption("-p, --port <port>", "Порт сервера", parseInt)
    .requiredOption("-c, --cache <cache>", "Шлях до директорії для кешу")
    .parse(process.argv);

const { host, port, cache } = program.opts();

// Перевірка на існування директорії кешу
fs.mkdir(cache, { recursive: true }).catch((err) => {
    console.error("Помилка створення кеш-директорії:", err.message);
    process.exit(1);
});

// Створення HTTP сервера
const server = http.createServer(async (req, res) => {
    const { method, url } = req;

    // URL повинен мати формат /<код>
    const code = url.slice(1);
    const filePath = path.join(cache, `${code}.jpg`);

    try {
        switch (method) {
            case "GET":
                // Читання файлу з кешу
                const image = await fs.readFile(filePath);
                res.writeHead(200, { "Content-Type": "image/jpeg" });
                res.end(image);
                break;

            case "PUT":
                // Запис файлу в кеш
                const chunks = [];
                req.on("data", (chunk) => chunks.push(chunk));
                req.on("end", async () => {
                    const body = Buffer.concat(chunks);
                    await fs.writeFile(filePath, body);
                    res.writeHead(201, { "Content-Type": "text/plain" });
                    res.end("Created");
                });
                break;

            case "DELETE":
                // Видалення файлу з кешу
                await fs.unlink(filePath);
                res.writeHead(200, { "Content-Type": "text/plain" });
                res.end("Deleted");
                break;

            default:
                // Метод не підтримується
                res.writeHead(405, { "Content-Type": "text/plain" });
                res.end("Method Not Allowed");
                break;
        }
    } catch (err) {
        if (err.code === "ENOENT") {
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
        } else {
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal Server Error");
            console.error(err.message);
        }
    }
});

// Запуск сервера
server.listen(port, host, () => {
    console.log(`Сервер запущено на http://${host}:${port}`);
});
