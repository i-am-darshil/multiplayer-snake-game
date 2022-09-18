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

const state = initGame();

io.on('connection', client => {
  console.log("connection")
  client.emit('init', {data: "Initializing Game"})
  startGameInterval(client);
});

function startGameInterval(client) {
  const intervalId = setInterval(() => {
    client.emit('gameState', JSON.stringify(state));
  }, 1000 / FRAME_RATE);
}


httpServer.listen(process.env.PORT || 3000);