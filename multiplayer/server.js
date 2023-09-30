const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const port = 80;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "public", "index.html"));
});

let connectedClients = new Set();
let gameServers = new Map();
let sharedGrid = null;

io.on("connection", (socket) => {
	connectedClients.add(socket);

	socket.on("disconnect", () => {
		connectedClients.delete(socket);
		gameServers.delete(socket.id);
	});

	socket.on("updateGrid", (grid) => {
		sharedGrid = grid;
		io.emit("gridUpdate", grid);
	});

	socket.on("joinGame", () => {
		let server = Array.from(gameServers.values()).find(
			(server) => server.players.size < 2,
		);

		if (!server) {
			server = {
				players: new Set(),
			};
			gameServers.set(socket.id, server);
		}

		server.players.add(socket);
		socket.emit("gameStart");

		if (sharedGrid) {
			socket.emit("gridUpdate", sharedGrid);
		}

		server.players.forEach((player) => {
			player.emit("playerJoined");
		});
	});

	socket.on("getServers", () => {
		const serverList = Array.from(gameServers.values()).map((server) => ({
			players: server.players.size,
		}));
		socket.emit("serverList", serverList);
	});

	socket.on("server", () => {
		const availableServer = Array.from(gameServers.values()).find(
			(server) => server.players.size < 2,
		);

		if (availableServer) {
			availableServer.players.add(socket);
			socket.emit("gameStart");

			if (sharedGrid) {
				socket.emit("gridUpdate", sharedGrid);
			}

			availableServer.players.forEach((player) => {
				player.emit("playerJoined");
			});
		} else {
			const newServer = {
				players: new Set([socket]),
			};
			gameServers.set(socket.id, newServer);
			socket.emit("gameStart");

			if (sharedGrid) {
				socket.emit("gridUpdate", sharedGrid);
			}
		}
	});
});

server.listen(port, () => {
	console.log(`Server running on http://localhost:${port}`);
});
