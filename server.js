const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let jugadores = [];
let indiceTurno = 0;
let palabraActual = "";
let votos = {};

const palabras = ["Pizza", "Avión", "WhatsApp", "Minecraft", "Netflix", "Fútbol", "Cine", "Playa"];

io.on('connection', (socket) => {
    socket.on('unirse', (datos) => {
        jugadores.push({ 
            id: socket.id, 
            nombre: datos.nombre, 
            peerId: datos.peerId, 
            eliminado: false,
            rol: "" 
        });
        io.emit('actualizarLista', jugadores.length);
        io.emit('listaParaAudio', jugadores); 
    });

    socket.on('iniciarRonda', () => {
        if (jugadores.length < 2) return;
        indiceTurno = 0;
        votos = {};
        palabraActual = palabras[Math.floor(Math.random() * palabras.length)];
        const impIndex = Math.floor(Math.random() * jugadores.length);
        
        jugadores.forEach((j, i) => {
            j.eliminado = false;
            j.rol = (i === impIndex) ? "IMPOSTOR" : "CIUDADANO";
            const info = (j.rol === "IMPOSTOR") ? { rol: "IMPOSTOR" } : { rol: "CIUDADANO", palabra: palabraActual };
            io.to(j.id).emit('recibirRol', info);
        });
        notificarTurno();
    });

    socket.on('finalizarMiTurno', () => {
        indiceTurno++;
        notificarTurno();
    });

    socket.on('votarJugador', (idVotado) => {
        votos[idVotado] = (votos[idVotado] || 0) + 1;
        const vivos = jugadores.filter(j => !j.eliminado).length;
        if (Object.values(votos).reduce((a, b) => a + b, 0) >= vivos) {
            procesarVotacion();
        }
    });

    function procesarVotacion() {
        const expulsadoId = Object.keys(votos).reduce((a, b) => votos[a] > votos[b] ? a : b);
        const expulsado = jugadores.find(j => j.id === expulsadoId);
        expulsado.eliminado = true;

        if (expulsado.rol === "IMPOSTOR") {
            io.emit('resultadoVotacion', { 
                mensaje: `¡TE DESCUBRIMOS, ${expulsado.nombre.toUpperCase()}! 🔴`, 
                terminar: true, 
                palabraReal: palabraActual 
            });
        } else {
            const vivos = jugadores.filter(j => !j.eliminado);
            if (vivos.length <= 2) {
                io.emit('resultadoVotacion', { 
                    mensaje: "¡FALLO TOTAL! El impostor ha dominado la sala. 💀", 
                    terminar: true, 
                    palabraReal: palabraActual 
                });
            } else {
                io.emit('resultadoVotacion', { 
                    mensaje: `¡FALLO TOTAL! ${expulsado.nombre} era inocente. El impostor sigue suelto... 😈`, 
                    terminar: false 
                });
                setTimeout(() => { indiceTurno = 0; notificarTurno(); }, 4000);
            }
        }
        votos = {};
    }

    function notificarTurno() {
        while (indiceTurno < jugadores.length && jugadores[indiceTurno].eliminado) { indiceTurno++; }
        if (indiceTurno < jugadores.length) {
            io.emit('cambioDeTurno', { 
                nombre: jugadores[indiceTurno].nombre, 
                idSocket: jugadores[indiceTurno].id,
                listaActualizada: jugadores 
            });
        } else {
            io.emit('faseVotacion', jugadores.filter(j => !j.eliminado));
        }
    }

    socket.on('disconnect', () => {
        jugadores = jugadores.filter(j => j.id !== socket.id);
        io.emit('actualizarLista', jugadores.length);
    });
});

server.listen(process.env.PORT || 3000, () => console.log("Servidor iniciado"));
