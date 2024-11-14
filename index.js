const { Command } = require('commander');
const http = require('http');

const program = new Command();

program
    .requiredOption('--host <host>', 'адреса сервера')
    .requiredOption('--port <number>', 'порт сервера')
    .requiredOption('--cache <path>', 'шлях до директорії з кешем');

program.parse(process.argv);

const options = program.opts();

const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8'); // Додано заголовок Content-Type
    res.end('Сервер працює');
});

server.listen(options.port, options.host, () => {
    console.log(`Сервер запущено на ${options.host}:${options.port}`);
});