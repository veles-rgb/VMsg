require('dotenv').config;
const express = require('express');
const app = express();

// Router
const router = require('./routes/index');

app.use(express.json());

app.use('/api', router);

const PORT = process.env.SERVER_PORT || 3001;
const server = app.listen(PORT, () => {
    console.log(`Server is running on port`, server.address().port);
});