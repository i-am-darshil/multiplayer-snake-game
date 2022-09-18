// https://stackoverflow.com/questions/64725626/how-to-fix-400-error-bad-request-in-socket-io
const httpServer = require("http").createServer();
const io = require('socket.io')(httpServer,{
  cors: {
          origin: "http://127.0.0.1:5500",
          methods: ["GET", "POST"],
          credentials: true,
          transports: ['websocket', 'polling'],
  },
  allowEIO3: true
  })
const { FRAME_RATE } = require('./constants');
const { initGame, gameLoop, getUpdatedVelocity } = require('./game');
const { makeid } = require('./utils');

let state = {};
let clientRooms = {};

io.on('connection', client => {
  console.log("connection")
  // state = initGame();

  client.on('keydown', handleKeydown);
  client.on('close', (reason) => {
    console.log("Socket closed with reason:", reason)
  })
  client.on('newGame', handleNewGame);
  client.on('joinGame', handleJoinGame);

  client.emit('init', {data: "Initializing Game"})

  function handleJoinGame(roomName) {
    const room = io.of("/").adapter.rooms.get(roomName);

    let numClients = 0;
    if (room) {
      numClients = room.size
    }
    console.log("roomName, room, numClients", roomName, room,numClients)
    

    if (numClients === 0) {
      client.emit('unknownCode');
      return;
    } else if (numClients > 1) {
      client.emit('tooManyPlayers');
      return;
    }

    client.emit('gameCode', roomName);


    clientRooms[client.id] = roomName;

    client.join(roomName);
    client.number = 2;
    client.emit('init', 2);
    
    startGameInterval(roomName, client);
  }

  
  function handleNewGame() {
    let roomName = makeid(5);
    clientRooms[client.id] = roomName;
    client.emit('gameCode', roomName);

    state[roomName] = initGame();

    client.join(roomName);
    console.log("handleNewGame : roomName, io.sockets.adapter.rooms[roomName]", roomName, io.of("/").adapter.rooms.get(roomName))

    client.number = 1;
    client.emit('init', 1);
  }



  function handleKeydown(keyCode) {
    const roomName = clientRooms[client.id];
    if (!roomName) {
      return;
    }
    try {
      keyCode = parseInt(keyCode);
    } catch(e) {
      console.error(e);
      return;
    }

    const vel = getUpdatedVelocity(keyCode);

    if (vel) {
      state[roomName].players[client.number - 1].vel = vel;
    }
  }
});

function startGameInterval(roomName, client) {
  const intervalId = setInterval(() => {
    let winner = gameLoop(state[roomName]);
    if (!winner) {
      emitGameState(roomName, state[roomName], client)
    } else {
      emitGameOver(roomName, winner, client);
      state[roomName] = null;
      clearInterval(intervalId);
    }
  }, 1000 / FRAME_RATE);
}

function emitGameState(room, gameState, client) {
  // Send this event to everyone in the room.
  io.sockets.in(room)
    .emit('gameState', JSON.stringify(gameState));
}

function emitGameOver(room, winner,client) {
  io.sockets.in(room)
    .emit('gameOver', JSON.stringify({ winner }));
}


httpServer.listen(process.env.PORT || 3000);