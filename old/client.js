// test-client.js
const io = require("socket.io-client");

// Host client
const hostSocket = io("http://localhost:3001");
let gamePin = null;

hostSocket.on("connect", () => {
    console.log("Host connected");
    hostSocket.emit("host:createGame");
});

hostSocket.on("host:gameCreated", (data) => {
    gamePin = data.pin;
    console.log("Game created with PIN:", gamePin);

    // Simulate a player joining after 2 seconds
    setTimeout(() => {
        const playerSocket = io("http://localhost:3001");
        playerSocket.emit("player:joinGame", {
            pin: gamePin,
            name: "TestPlayer",
        });

        playerSocket.on("player:joined", () => {
            console.log("Player joined successfully");

            // Start game after player joins
            setTimeout(() => {
                hostSocket.emit("host:startGame", { pin: gamePin });
            }, 1000);
        });

        playerSocket.on("game:question", (question) => {
            console.log("Received question:", question);
            // Answer after 2 seconds
            setTimeout(() => {
                playerSocket.emit("player:answer", {
                    pin: gamePin,
                    answerIndex: question.correctIndex,
                });
            }, 2000);
        });
    }, 2000);
});

hostSocket.on("host:playerList", (data) => {
    console.log("Current players:", data.players);
});
