// Define variables
let size = 1;
let paused = false;
let previewGrid = null;
let mouseDown = false;
let animationInterval;
const gridWidth = 100;
const gridHeight = 100;
let grid = createGrid(gridWidth, gridHeight);
let zoomLevel = 1;

// Wait for DOM content to be loaded
document.addEventListener("DOMContentLoaded", () => {
	const socket = io();

	// Update grid when receiving gridUpdate event from socket
	socket.on("gridUpdate", (g) => {
		grid = g;
	});

	// Handle multiplayer button click event
	const multiplayerButton = document.getElementById("multiplayerButton");
	multiplayerButton.addEventListener("click", () => {
		socket.emit("server");
	});

	// Handle pause button click event
	document.getElementById("pause").addEventListener("click", () => {
		pause();
	});

	// Handle mouse events
	canvas.addEventListener("mousedown", () => {
		mouseDown = true;
	});

	canvas.addEventListener("mouseup", () => {
		mouseDown = false;
	});

	canvas.addEventListener("mousemove", mousePos);
	canvas.addEventListener("click", placeBlock);

	// Update mouse position
	function mousePos(event) {
		const canvasRect = canvas.getBoundingClientRect();
		const x = Math.floor(
			(event.clientX - canvasRect.left) / (cellSize * zoomLevel),
		);
		const y = Math.floor(
			(event.clientY - canvasRect.top) / (cellSize * zoomLevel),
		);
		drawGrid();
		if (mouseDown) {
			if (grid[x]) {
				previewGrid = createGrid(gridWidth, gridHeight);
				for (let h = 0; h < size; h++) {
					for (let v = 0; v < size; v++) {
						previewGrid[(x + h) % gridWidth][(y + v) % gridHeight] = true;
					}
				}
			}
		}
	}

	// Place block on grid
	function placeBlock(event) {
		const canvasRect = canvas.getBoundingClientRect();
		const x = Math.floor(
			(event.clientX - canvasRect.left) / (cellSize * zoomLevel),
		);
		const y = Math.floor(
			(event.clientY - canvasRect.top) / (cellSize * zoomLevel),
		);
		if (grid[x]) {
			for (let h = 0; h < size; h++) {
				for (let v = 0; v < size; v++) {
					grid[(x + h) % gridWidth][(y + v) % gridHeight] = true;
				}
			}
			socket.emit("updateGrid", grid);
		}
		previewGrid = null;
		drawGrid();
	}
});

// Create grid with given width and height
function createGrid(width, height) {
	return new Array(width).fill(null).map(() => new Array(height).fill(false));
}

// Increase size of blocks
function changeSize() {
	size += 1;
	if (size > 7) {
		size = 1;
	}
	drawGrid();
}

// Pause or resume animation
function pause() {
	paused = !paused;
}

// Clear the grid
function clearGrid() {
	grid = createGrid(gridWidth, gridHeight);
	drawGrid();
}

// Randomize the grid
function randomiseGrid() {
	grid.forEach((row) => {
		for (let i = 0; i < row.length; i++) {
			row[i] = Math.random() < 0.5;
		}
	});
	drawGrid();
}

// Initialize canvas and context
const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");
let cellSize = calculateCellSize();

// Update cell size on window resize
window.addEventListener("resize", () => {
	cellSize = calculateCellSize();
	drawGrid();
});

// Calculate cell size based on canvas size, grid width, and grid height
function calculateCellSize() {
	return Math.min(
		canvas.width / (gridWidth * zoomLevel),
		canvas.height / (gridHeight * zoomLevel),
	);
}

// Update the grid based on game rules
function updateGrid() {
	if (paused) {
		return;
	}
	const newGrid = createGrid(gridWidth, gridHeight);
	for (let x = 0; x < gridWidth; x++) {
		for (let y = 0; y < gridHeight; y++) {
			let liveNeighbors = 0;
			for (let i = -1; i <= 1; i++) {
				for (let j = -1; j <= 1; j++) {
					if (i === 0 && j === 0) continue;
					const neighborX = (x + i + gridWidth) % gridWidth;
					const neighborY = (y + j + gridHeight) % gridHeight;
					if (grid[neighborX][neighborY]) {
						liveNeighbors++;
					}
				}
			}
			if (grid[x][y]) {
				if (liveNeighbors < 2 || liveNeighbors > 3) {
					newGrid[x][y] = false;
				} else {
					newGrid[x][y] = true;
				}
			} else if (liveNeighbors === 3) {
				newGrid[x][y] = true;
			} else {
				newGrid[x][y] = false;
			}
		}
	}
	grid = newGrid;
}

// Draw the grid on the canvas
function drawGrid() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = "green";
	ctx.beginPath();
	for (let x = 0; x < gridWidth; x++) {
		for (let y = 0; y < gridHeight; y++) {
			if (grid[x][y]) {
				ctx.rect(
					x * cellSize * zoomLevel,
					y * cellSize * zoomLevel,
					cellSize * zoomLevel,
					cellSize * zoomLevel,
				);
			}
		}
	}
	if (previewGrid) {
		ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
		ctx.beginPath();
		for (let x = 0; x < gridWidth; x++) {
			for (let y = 0; y < gridHeight; y++) {
				if (previewGrid[x][y]) {
					ctx.rect(
						x * cellSize * zoomLevel,
						y * cellSize * zoomLevel,
						cellSize * zoomLevel,
						cellSize * zoomLevel,
					);
				}
			}
		}
	}
	ctx.fill();
	ctx.strokeStyle = "#333";
	ctx.lineWidth = 1;
	ctx.beginPath();
	for (let x = 0; x <= gridWidth; x++) {
		ctx.moveTo(x * cellSize * zoomLevel, 0);
		ctx.lineTo(x * cellSize * zoomLevel, gridHeight * cellSize * zoomLevel);
	}
	for (let y = 0; y <= gridHeight; y++) {
		ctx.moveTo(0, y * cellSize * zoomLevel);
		ctx.lineTo(gridWidth * cellSize * zoomLevel, y * cellSize * zoomLevel);
	}
	ctx.stroke();
}

// Start animation
let animation;
function animate() {
	clearInterval(animation);
	updateGrid();
	drawGrid();
	animation = setInterval(animate, 100);
}
animate();
