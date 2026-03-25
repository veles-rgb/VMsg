require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");

const app = express();

const router = require("./routes/index");
const { initSocket } = require("./socket");

app.use(express.json());
app.use(cors());

app.use("/api", router);

const PORT = process.env.SERVER_PORT || 3001;

const server = http.createServer(app);

initSocket(server);

server.listen(PORT, () => {
    console.log("Server is running on port", PORT);
});