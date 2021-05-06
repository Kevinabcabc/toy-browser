const http = require('http');
const path  =require('path');
const fs = require('fs');

http.createServer(async (request, response) => {
  console.log(1);
  let body = [];
  request.on('err', (err) => {
    console.error(err);
  }).on('data', (chunk) => {
    console.log('chunk', chunk);
    body.push(chunk);
  }).on('end', () => {
    body = Buffer.concat(body).toString();
    console.log('body:', body);
    response.writeHead(200, {'Content-Type': 'text/html'});
    const data = fs.readFileSync(path.join(__dirname, './public/index.html'));
    response.end(data);
  })
}).listen(8080, () => {
  console.log('server 8080 start');
});
