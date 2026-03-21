const consola = require("consola");
const io = require("socket.io-client");
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

const client = io("http://localhost:3000");

let gCode = null;

function promptUser() {
    readline.question("\n", (action) => {
        const args = action.split(" ");

        switch (args[0]) {
            case "join":
                join(args[1], args[2]);
                break;
            case "answer":
                answer(args[1]);
                break;
            case "quit":
                process.exit(0);
        }

        promptUser();
    });
}

function join(id, username) {
    consola.log("joining ", id, username);
    gCode = id;

    client.emit("player:join", { code: id, username });
}

function answer(response) {
    consola.log("code ", gCode);
    client.emit("player:answer", { code: gCode, response });
}

client.on("connect", () => {
    client.on("error", (msg) => {
        consola.log("error: ", msg);
    });

    client.on("player:joined", (msg) => {
        consola.log("joined: ", msg);
    });

    client.on("player:kicked", (msg) => {
        consola.log("kicked: ", msg);
    });

    client.on("game:question", (msg) => {
        consola.log("current question", msg);
    });

    client.on("game:ended", () => {
        consola.log("game has ended");
        process.exit(0);
    });

    consola.log("connected");
    consola.log("join | answer | end | quit (program)")

    promptUser();
});
