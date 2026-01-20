const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let jugadores = [];
let indiceTurno = 0; // Controla quién habla

const palabras = [
    "Avión", "Pizza", "Playa", "Cine", "Fútbol", "WhatsApp", "Hospital", "Perro", 
    "Gato", "Hamburguesa", "Escuela", "Astronauta", "Biblioteca", "Bicicleta", 
    "Castillo", "Chocolate", "Dinosaurio", "Elefante", "Estrella", "Fantasma", 
    "Guitarra", "Helado", "Isla", "Jirafa", "Ketchup", "Limón", "Mago", 
    "Nieve", "Océano", "Panadería", "Parque", "Queso", "Robot", "Selva", 
    "Tiburón", "Unicornio", "Vampiro", "Zoológico", "YouTube", "Netflix",
    "Batman", "Minecraft", "Supermercado", "Internet", "Teléfono", "Reloj"
];

io.on('connection', (socket) => {
    // Al unirse ahora recibe nombre y peerId (id de audio)
    socket.on('unirse', (datos) => {
        jugadores.push({ id: socket.id, nombre: datos.nombre, peerId: datos.peerId });
        io.emit('actualizarLista', jugadores.length);
        // Enviamos la lista completa para que todos conecten sus micros
        io.emit('listaParaAudio', jugadores); 
    });

    socket.on('iniciarRonda', () => {
        if (jugadores.length < 2) return; 
        
        indiceTurno = 0; // Empezamos por el primero de la lista
        const palabra = palabras[Math.floor(Math.random() * palabras.length)];
        const impIndex = Math.floor(Math.random() * jugadores.length);
        
        jugadores.forEach((j, i) => {
            const info = (i === impIndex) ? { rol: "IMPOSTOR" } : { rol: "CIUDADANO", palabra };
            io.to(j.id).emit('recibirRol', info);
        });

        // Avisamos a todos quién empieza
        notificarTurno();
    });

    // Evento para cuando el jugador actual termina de hablar
    socket.on('finalizarMiTurno', () => {
        indiceTurno++;
        if (indiceTurno < jugadores.length) {
            notificarTurno();
        } else {
            io.emit('faseVotacion'); // Todos terminaron de describir
        }
    });

    function notificarTurno() {
        const jugadorActual = jugadores[indiceTurno];
        if (jugadorActual) {
            io.emit('cambioDeTurno', { 
                nombre: jugadorActual.nombre, 
                idSocket: jugadorActual.id 
            });
        }
    }

    socket.on('disconnect', () => {
        jugadores = jugadores.filter(j => j.id !== socket.id);
        io.emit('actualizarLista', jugadores.length);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
