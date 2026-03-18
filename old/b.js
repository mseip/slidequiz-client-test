// server.js
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// In-memory storage
const games = new Map(); // key: pin, value: { hostId, currentQuestionIndex }
const gameQuestions = new Map(); // key: pin, value: array of questions
const gamePlayers = new Map(); // key: pin, value: Map of socketId -> { name, score }

const sampleQuestions = [
  { question: "2 + 2?", options: ["1","2","3","4"], correctIndex: 3 },
  { question: "Capital of France?", options: ["Berlin","Madrid","Paris","Rome"], correctIndex: 2 }
];

function generatePin() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

io.on("connection", (socket) => {

  // Host creates a game
  socket.on("host:createGame", async () => {
    const pin = generatePin();

    games.set(pin, {
      hostId: socket.id,
      currentQuestionIndex: -1
    });

    gameQuestions.set(pin, [...sampleQuestions]);
    gamePlayers.set(pin, new Map());

    socket.join(pin);
    socket.emit("host:gameCreated", { pin });
  });

  // Player joins
  socket.on("player:joinGame", async ({ pin, name }) => {
    if (!games.has(pin)) {
      socket.emit("player:joinError", { message: "Game not found" });
      return;
    }

    const players = gamePlayers.get(pin);
    players.set(socket.id, { name, score: 0 });

    socket.join(pin);
    socket.emit("player:joined", { pin, name });

    const game = games.get(pin);
    const playerList = Array.from(players.values());
    
    io.to(game.hostId).emit("host:playerList", {
      players: playerList
    });
  });

  // Host starts game
  socket.on("host:startGame", async ({ pin }) => {
    const game = games.get(pin);
    if (!game || game.hostId !== socket.id) return;

    game.currentQuestionIndex = 0;
    games.set(pin, game);

    const questions = gameQuestions.get(pin);
    const q = questions[0];

    io.to(pin).emit("game:question", q);
  });

  // Player answers
  socket.on("player:answer", async ({ pin, answerIndex }) => {
    const game = games.get(pin);
    if (!game) return;

    const questions = gameQuestions.get(pin);
    const q = questions[game.currentQuestionIndex];
    
    const players = gamePlayers.get(pin);
    const player = players.get(socket.id);
    
    if (!player) return;

    if (answerIndex === q.correctIndex) {
      player.score += 100;
    }

    players.set(socket.id, player);
    
    const playerList = Array.from(players.values());
    io.to(game.hostId).emit("host:playerList", {
      players: playerList
    });
  });

  // Host moves to next question
  socket.on("host:nextQuestion", async ({ pin }) => {
    const game = games.get(pin);
    if (!game || game.hostId !== socket.id) return;

    let index = game.currentQuestionIndex + 1;
    const questions = gameQuestions.get(pin);

    if (index >= questions.length) {
      const players = gamePlayers.get(pin);
      const playerList = Array.from(players.values());
      io.to(pin).emit("game:over", {
        players: playerList
      });
      return;
    }

    game.currentQuestionIndex = index;
    games.set(pin, game);
    
    io.to(pin).emit("game:question", questions[index]);
  });

  // Cleanup on disconnect
  socket.on("disconnect", async () => {
    // Check if disconnected socket was a host
    for (const [pin, game] of games.entries()) {
      if (game.hostId === socket.id) {
        io.to(pin).emit("game:ended");
        games.delete(pin);
        gameQuestions.delete(pin);
        gamePlayers.delete(pin);
        break;
      }
    }

    // Check if disconnected socket was a player
    for (const [pin, players] of gamePlayers.entries()) {
      if (players.has(socket.id)) {
        players.delete(socket.id);
        
        const game = games.get(pin);
        if (game) {
          const playerList = Array.from(players.values());
          io.to(game.hostId).emit("host:playerList", {
            players: playerList
          });
        }
        break;
      }
    }
  });
});

server.listen(3001, () => {
  console.log("Server running on port 3001");
});
