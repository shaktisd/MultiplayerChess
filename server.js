var url = require('url');
var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
var server;
var cache = {};

server = http.createServer(function(request, response){
    if (request.url == '/') {
        filePath = 'public/index.html';
      } else {
        filePath = 'public' + request.url;
      }

      var absPath = './' + filePath;
      serveStatic(response, cache, absPath);
 }),

send404 = function(res){
    res.writeHead(404);
    res.write('404');
    res.end();
};


function serveStatic(response, cache, absPath) {
	if (cache[absPath]) {
		sendFile(response, absPath, cache[absPath]);
	} else {
		fs.exists(absPath, function(exists) {
			if (exists) {
				fs.readFile(absPath, function(err, data) {
					if (err) {
						send404(response);
					} else {
						cache[absPath] = data;
						sendFile(response, absPath, data);
					}
				});
			} else {
				send404(response);
			}
		});
	}
}

function sendFile(response, filePath, fileContents) {
	response.writeHead(200, {
		"content-type" : mime.lookup(path.basename(filePath))
	});
	response.end(fileContents);
}


server.listen(9191);

// use socket.io
var io = require('socket.io').listen(server);

//turn off debug
io.set('log level', 1);

// define interactions with client
io.sockets.on('connection', function(socket) {
	//recieve client data
	socket.on('client_data', function(data) {
		process.stdout.write('from: ' + data.from + ' to: ' + data.to + ' promotion: ' + data.promotion);
		socket.broadcast.emit('updated_move', {
			'from' : data.from,
			'to' : data.to,
			'promotion' : 'q' // NOTE: always promote to a queen for example simplicity
		});
	});
});