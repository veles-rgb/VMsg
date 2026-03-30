require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");

const router = require("./routes/index");
const { initSocket } = require("./socket");

const app = express();

const allowedOrigins = [
    "https://vmsg.up.railway.app",
    "http://localhost:5173",
];

app.use(
    cors({
        origin(origin, callback) {
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error(`Not allowed by CORS: ${origin}`));
        },
        credentials: true,
    })
);

app.use(express.json());

app.use("/api", router);

app.get("/", (req, res) => {
    res.send("API is running");
});

const PORT = process.env.PORT || 3001;

const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
    console.log("Server is running on port", PORT);
});