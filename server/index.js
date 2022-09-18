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

let state = {};

io.on('connection', client => {
  console.log("connection")
  state = initGame();
  client.on('keydown', handleKeydown);
  client.on('close', (reason) => {
    console.log("Socket closed with reason:", reason)
  })
  client.emit('init', {data: "Initializing Game"})
  startGameInterval(client);

  function handleKeydown(keyCode) {

    try {
      keyCode = parseInt(keyCode);
    } catch(e) {
      console.error(e);
      return;
    }

    const vel = getUpdatedVelocity(keyCode);

    if (vel) {
      state.players.vel = vel;
    }
  }
});

function startGameInterval(client) {
  const intervalId = setInterval(() => {
    let winner = gameLoop(state);
    if (!winner) {
      client.emit('gameState', JSON.stringify(state));
    } else {
      clearInterval(intervalId);
      client.emit('gameOver', JSON.stringify({msg: "Game over"}));
    }
  }, 1000 / FRAME_RATE);
}


httpServer.listen(process.env.PORT || 3000);