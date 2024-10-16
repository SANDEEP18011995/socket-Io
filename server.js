const express = require('express');
const http = require('http');
const { MongoClient } = require('mongodb');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');

// MongoDB connection setup
const mongoUri = 'your_mongo_connection_string'; // e.g., 'mongodb://localhost:27017'
const dbName = 'your_db_name'; // e.g., 'test'
let db;

MongoClient.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then((client) => {
        console.log('Connected to MongoDB');
        db = client.db(dbName);
    })
    .catch((error) => console.error('Error connecting to MongoDB', error));

// Express and Socket.IO setup
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(bodyParser.json());

// Endpoint to add a user to MongoDB
app.post('/addUser', async (req, res) => {
    try {
        const userData = req.body; // Assuming user data comes in JSON format
        const result = await db.collection('users').insertOne(userData);

        if (result.insertedId) {
            // If insertion is successful, add the user to the "liye users" room
            io.to('liye users').emit('newUser', { userId: result.insertedId, userData });
            res.status(201).send({ message: 'User added successfully', userId: result.insertedId });
        } else {
            res.status(500).send({ message: 'Failed to add user' });
        }
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).send({ message: 'Internal server error' });
    }
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Add the connected user to the "liye users" room
    socket.join('liye users');

    // Notify other users in the room about the new connection (optional)
    socket.to('liye users').emit('userJoined', { message: `User ${socket.id} joined the room.` });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
