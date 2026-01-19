const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let jugadores = [];
const palabras = ["Avión", "Pizza", "Playa", "Cine", "Fútbol", "WhatsApp", "Hospital", "Perro", "Gato", "Hamburgesa", "Escuela"];

io.on('connection', (socket) => {
    socket.on('unirse', (nombre) => {
        jugadores.push({ id: socket.id, nombre });
        io.emit('actualizarLista', jugadores.length);
    });

    socket.on('iniciarRonda', () => {
        if (jugadores.length < 2) return; 
        const palabra = palabras[Math.floor(Math.random() * palabras.length)];
        const impIndex = Math.floor(Math.random() * jugadores.length);
        
        jugadores.forEach((j, i) => {
            const info = (i === impIndex) ? { rol: "IMPOSTOR" } : { rol: "CIUDADANO", palabra };
            io.to(j.id).emit('recibirRol', info);
        });
    });

    socket.on('disconnect', () => {
        jugadores = jugadores.filter(j => j.id !== socket.id);
        io.emit('actualizarLista', jugadores.length);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
