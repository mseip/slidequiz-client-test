const io = require("socket.io-client");
const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

const client = io("http://localhost:3000");

function promptUser() {
    readline.question("\n", (action) => {
        const args = action.split(" ");

        switch (args[0]) {
            case "join":
                join(args[1], args[2]);
                break;
            case "quit":
                process.exit(0);
        }

        promptUser();
    });
}

function join(id, username) {
    console.log("joining " + id + " " + username);
    client.emit("player:join", { code: id, username });
}

client.on("connect", () => {
    client.on("error", (msg) => {
        console.log("error: " + JSON.stringify(msg));
    });

    client.on("player:joined", (msg) => {
        console.log("joined: " + JSON.stringify(msg));
    });

    client.on("player:kicked", (msg) => {
        console.log("kicked: " + JSON.stringify(msg));
    });

    client.on("game:question", (msg) => {
        console.log("current question" + JSON.stringify(msg));
    });

    client.on("game:ended", () => {
        console.log("game has ended");
        process.exit(0);
    });

    console.log("connected");
    console.log("join | answer | end | quit (program)")

    promptUser();
});
