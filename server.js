var url = require('url');
var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');

var server;
var cache = {};
var roomlist = {};
var roompgn = {};
var blackTeamMoves = [];
var whiteTeamMoves = [];
var teamWhite = [];
var teamBlack = [];


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
        console.log('roomlist ' + roomlist);
        if(data.color == 'white'){
        	teamWhite.push(socket.id);	
        }
        if(data.color == 'black'){
        	teamBlack.push(socket.id);
        }
        
        console.log('Team White ' + teamWhite + '\n' + 'Team Black ' + teamBlack);
        
    });
	//recieve client data
	socket.on('client_data', function(data) {
		console.log('client_data received ' + 'from: ' + data.from + ' to: ' + data.to + ' promotion: ' + data.promotion +  ' pgn ' + data.pgn + '\n');
		/*socket.broadcast.to(roomlist[socket.id]).emit('updated_move', {
			'from' : data.from,
			'to' : data.to,
			'promotion' : 'q' // NOTE: always promote to a queen for example simplicity
		});*/
		roompgn[roomlist[socket.id]] = data.pgn;
		console.log('updated_move sent from ' + socket.id  + ' to room ' + roomlist[socket.id] + '\n');
	});
	
	// receive move data
	socket.on('move_score_data', function(data){
		console.log('move_score_data received socket.id ' + socket.id  + ' data.fen ' + data.fen + ' data.score ' + data.score);
		data.id = socket.id;
		if(data.playwithcolor == 'white'){
			whiteTeamMoves.push(data);
			whiteTeamMoves.sort(function(a,b){return b.score - a.score;});
			if(areAllPlayersOfSameSideDone(whiteTeamMoves,teamWhite)){
				broadCastTeamMove(socket, whiteTeamMoves[0].from,whiteTeamMoves[0].to);
			}
		}
		
		if(data.playwithcolor == 'black'){
			blackTeamMoves.push(data);
			blackTeamMoves.sort(function(a,b){return a.score - b.score;});
			if(areAllPlayersOfSameSideDone(blackTeamMoves,teamBlack)){
				broadCastTeamMove(socket, blackTeamMoves[0].from,blackTeamMoves[0].to);
			}
		}
		console.log('blackTeamMoves');
		console.log(JSON.stringify(blackTeamMoves , null , "\t"));
		console.log('whiteTeamMoves');
		console.log(JSON.stringify(whiteTeamMoves , null , "\t"));
		
				
	});
	
});

function areAllPlayersOfSameSideDone(teamMoves,team){
	var countOfTeamMembersDoneWithTheirMove = 0;
	for(var i=0; i<teamMoves.length ;i++){
		for(var j=0;j<team.length ;j++){
			if(team[j] == teamMoves[i].id){
				countOfTeamMembersDoneWithTheirMove++;
				console.log(team[j] + ' DONE : countOfTeamMembersDoneWithTheirMove ' + countOfTeamMembersDoneWithTheirMove);
			}
		}
	}
	if(countOfTeamMembersDoneWithTheirMove == team.length){
		return true;
	}else {
		return false;
	}
}

function broadCastTeamMove(socket, from, to){
	var broadCastTeamMove = {
			'from' : from,
			'to' : to,
			'promotion' : 'q' // NOTE: always promote to a queen for example simplicity
		};
	console.log('team_move ' + JSON.stringify(broadCastTeamMove));
	socket.broadcast.to(roomlist[socket.id]).emit('team_move', broadCastTeamMove);
}

function compare(a,b){
	if(a.score > b.score){
		return 1;
	}else if (a.score < b.score){
		return -1;
	}else {
		return 0 ;
	}
}
