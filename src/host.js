const io = require("socket.io-client");
const readline = require('readline').createInterface({
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
            case "manual":
                hostManual(
                    args[1] || 6,
                    args[2] || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwibmFtZSI6ImJvYiIsImVtYWlsIjoiYm9iQGJvYi5jYSIsImlhdCI6MTc3MzkxODg2OCwiZXhwIjoxNzczOTU0ODY4fQ.EaV-n6suAkTeUzY1vdEZWUy7KuX8Ja_E_Pn4_AWE2L8"
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

function hostManual(id, token) {
    client.emit("host:manual", { quizID: id, token });
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
        console.log("error: " + JSON.stringify(msg));
    });

    client.on("host:created", (msg) => {
        console.log("created game -> " + JSON.stringify(msg));
        code = msg?.code;
    });

    client.on("host:players", (msg) => {
        console.log("player list -> " + JSON.stringify(msg));
    });

    client.on("host:questions", (msg) => {
        console.log("all questions -> " + JSON.stringify(msg));
    });

    client.on("game:question", (msg) => {
        console.log("current question -> " + JSON.stringify(msg));
    });

    console.log("connected");
    console.log("manual | start | jump | end | quit (program)")

    promptUser();
});
