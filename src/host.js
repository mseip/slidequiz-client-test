const consola = require("consola");
const io = require("socket.io-client");
const readline = require("readline").createInterface({
    input: process.stdin,
    output: process.stdout
});

const client = io("http://localhost:3000");

let code;

// Only for testing
function promptUser() {
    readline.question("\n", (action) => {
        const args = action.split(" ");

        switch (args[0]) {
            case "create":
                create(
                    args[1] || "manual",
                    args[2] || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwibmFtZSI6ImpvZSIsImVtYWlsIjoiam9lQGpvZS5jYSIsImlhdCI6MTc3NDA3NDE2MiwiZXhwIjoxNzc0MTEwMTYyfQ.663XhWajv2yCJc-oBggSgXQJWjcqR3BhRSkoTO5EDRk",
                    args[3] || 3,
                );

                break;
            case "start":
                start(code);
                break;
            case "jump":
                jump(code, args[1]);
                break;
            case "kick":
                kick(code, args[1]);
                break;
            case "quit":
                process.exit(0);
        }

        promptUser();
    });
}

function create(mode, token, quizID) {
    client.emit("host:create", { mode, token, quizID });
}

function start(id) {
    client.emit("host:start", { code: id });
}

function jump(id, index) {
    client.emit("host:jump", { code: id, index });
}

function kick(id, playerID) {
    client.emit("host:kick", { code: id, playerID });
}

client.on("connect", () => {
    client.on("error", (msg) => {
        consola.log("error: ", msg);
    });

    client.on("host:created", (msg) => {
        consola.log("created game -> ", msg);
        code = msg?.code;
    });

    client.on("host:players", (msg) => {
        consola.log("player list -> ", msg);
    });

    client.on("host:questions", (msg) => {
        consola.log("all questions -> ", msg);
    });

    client.on("host:response", (msg) => {
        consola.log("got response -> ", msg);
    });

    client.on("game:question", (msg) => {
        consola.log("current question -> ", msg);
    });

    consola.log("connected");
    consola.log("create | start | jump | end | quit (program)")

    promptUser();
});
