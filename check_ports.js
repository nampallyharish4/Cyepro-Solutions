const http = require('http');

const ports = [3000, 5000];

ports.forEach(port => {
    const req = http.request({
        host: 'localhost',
        port: port,
        path: '/',
        method: 'GET'
    }, (res) => {
        console.log(`Port ${port} is responding with status code: ${res.statusCode}`);
        res.on('data', (d) => {});
    });

    req.on('error', (e) => {
        console.log(`Port ${port} is NOT responding: ${e.message}`);
    });

    req.end();
});
