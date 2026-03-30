require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");

const app = express();

const router = require("./routes/index");
const { initSocket } = require("./socket");

// CORS
app.use(
    cors({
        origin: process.env.CLIENT_URL || "https://vmsg.up.railway.app",
        credentials: true,
    })
);

app.options("*", cors());

// Body parser
app.use(express.json());

// Routes
app.use("/api", router);

const PORT = process.env.SERVER_PORT || 3001;

const server = http.createServer(app);

// Initialize socket.io
initSocket(server);

// Start server
server.listen(PORT, () => {
    console.log("Server is running on port", PORT);
});