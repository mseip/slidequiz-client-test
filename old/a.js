
// server.js
const path = require("path");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const redis = require("./redis");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

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

    await redis.hSet(`game:${pin}`, {
      hostId: socket.id,
      currentQuestionIndex: -1
    });

    await redis.set(`game:${pin}:questions`, JSON.stringify(sampleQuestions));
    await redis.del(`game:${pin}:players`);

    socket.join(pin);
    socket.emit("host:gameCreated", { pin });
  });

  // Player joins
  socket.on("player:joinGame", async ({ pin, name }) => {
    const exists = await redis.exists(`game:${pin}`);
    if (!exists) {
      socket.emit("player:joinError", { message: "Game not found" });
      return;
    }

    const playerData = JSON.stringify({ name, score: 0 });
    await redis.hSet(`game:${pin}:players`, socket.id, playerData);

    socket.join(pin);
    socket.emit("player:joined", { pin, name });

    const hostId = await redis.hGet(`game:${pin}`, "hostId");
    const players = await redis.hGetAll(`game:${pin}:players`);
    io.to(hostId).emit("host:playerList", {
      players: Object.values(players).map(JSON.parse)
    });
  });

  // Host starts game
  socket.on("host:startGame", async ({ pin }) => {
    const hostId = await redis.hGet(`game:${pin}`, "hostId");
    if (hostId !== socket.id) return;

    await redis.hSet(`game:${pin}`, "currentQuestionIndex", 0);

    const questions = JSON.parse(await redis.get(`game:${pin}:questions`));
    const q = questions[0];

    io.to(pin).emit("game:question", q);
  });

  // Player answers
  socket.on("player:answer", async ({ pin, answerIndex }) => {
    const questions = JSON.parse(await redis.get(`game:${pin}:questions`));
    const index = parseInt(await redis.hGet(`game:${pin}`, "currentQuestionIndex"));
    const q = questions[index];

    const playerRaw = await redis.hGet(`game:${pin}:players`, socket.id);
    if (!playerRaw) return;

    const player = JSON.parse(playerRaw);
    if (answerIndex === q.correctIndex) {
      player.score += 100;
    }

    await redis.hSet(`game:${pin}:players`, socket.id, JSON.stringify(player));

    const hostId = await redis.hGet(`game:${pin}`, "hostId");
    const players = await redis.hGetAll(`game:${pin}:players`);
    io.to(hostId).emit("host:playerList", {
      players: Object.values(players).map(JSON.parse)
    });
  });

  // Host moves to next question
  socket.on("host:nextQuestion", async ({ pin }) => {
    const hostId = await redis.hGet(`game:${pin}`, "hostId");
    if (hostId !== socket.id) return;

    let index = parseInt(await redis.hGet(`game:${pin}`, "currentQuestionIndex"));
    index++;

    const questions = JSON.parse(await redis.get(`game:${pin}:questions`));

    if (index >= questions.length) {
      const players = await redis.hGetAll(`game:${pin}:players`);
      io.to(pin).emit("game:over", {
        players: Object.values(players).map(JSON.parse)
      });
      return;
    }

    await redis.hSet(`game:${pin}`, "currentQuestionIndex", index);
    io.to(pin).emit("game:question", questions[index]);
  });

  // Cleanup on disconnect
  socket.on("disconnect", async () => {
    const keys = await redis.keys("game:*:players");

    for (const key of keys) {
      const pin = key.split(":")[1];

      const hostId = await redis.hGet(`game:${pin}`, "hostId");
      if (hostId === socket.id) {
        io.to(pin).emit("game:ended");
        await redis.del(`game:${pin}`);
        await redis.del(`game:${pin}:players`);
        await redis.del(`game:${pin}:questions`);
        continue;
      }

      const removed = await redis.hDel(`game:${pin}:players`, socket.id);
      if (removed) {
        const players = await redis.hGetAll(`game:${pin}:players`);
        io.to(hostId).emit("host:playerList", {
          players: Object.values(players).map(JSON.parse)
        });
      }
    }
  });
});

server.listen(3000);
