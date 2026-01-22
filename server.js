const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

let messages = [];

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
    console.log('مستخدم جديد متصل');
    
    socket.emit('previous messages', messages);
    
    socket.on('send message', (data) => {
        const message = {
            id: Date.now(),
            username: data.username || 'مجهول',
            text: data.text,
            time: new Date().toLocaleTimeString()
        };
        
        messages.push(message);
        if (messages.length > 100) messages = messages.slice(-100);
        
        io.emit('new message', message);
    });
    
    socket.on('disconnect', () => {
        console.log('مستخدم انقطع');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`الخادم يعمل على المنفذ ${PORT}`);
});
