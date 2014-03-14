var url = require('url');
var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');

var server;
var cache = {};
var roomlist = {};
var roompgn = {};

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
	if (false) {
		sendFile(response, absPath, cache[absPath]);
	} else {
		fs.exists(absPath, function(exists) {
			if (exists) {
				fs.readFile(absPath, function(err, data) {
					if (err) {
						send404(response);
					} else {
						//cache[absPath] = data;
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
		,"Cache-Control" : "max-age=604800"
	});
	response.end(fileContents);
}


var port = Number(process.env.PORT || 9091);
server.listen(port);
console.log("Running server on port " + port);

// use socket.io
var io = require('socket.io').listen(server);

//turn off debug
io.set('log level', 1);

// define interactions with client
io.sockets.on('connection', function(socket) {
	// once a client has connected, we expect to get a ping from them saying what room they want to join
    socket.on('join', function(data) {
    	console.log("######## Request from client " + socket.id + " to join room "  + data.room + " color " + data.color);
        socket.join(data.room);
        roomlist[socket.id] = data.room;
        socket.emit('join_pgn',{'pgn' : roompgn[data.room]});
        console.log("######## Client " + socket.id + " Joined  "  + data.room + " color " + data.color);
        
        
    });
	//recieve client data
	socket.on('client_data', function(data) {
		console.log('client_data received ' + 'from: ' + data.from + ' to: ' + data.to + ' promotion: ' + data.promotion +  ' pgn ' + data.pgn + '\n');
		socket.broadcast.to(roomlist[socket.id]).emit('updated_move', {
			'from' : data.from,
			'to' : data.to,
			'promotion' : 'q' // NOTE: always promote to a queen for example simplicity
		});
		roompgn[roomlist[socket.id]] = data.pgn;
		console.log('updated_move sent from ' + socket.id  + 'to room ' + roomlist[socket.id] + '\n');
	});
});
