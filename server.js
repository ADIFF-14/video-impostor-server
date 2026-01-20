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
let votosRecibidos = {};

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
        votosRecibidos = {};
        palabraActual = palabras[Math.floor(Math.random() * palabras.length)];
        const impIndex = Math.floor(Math.random() * jugadores.length);
        
        jugadores.forEach((j, i) => {
            j.eliminado = false;
            j.rol = (i === impIndex) ? "IMPOSTOR" : "CIUDADANO";
            const info = (j.rol === "IMPOSTOR") ? { rol: "IMPOSTOR" } : { rol: "CIUDADANO", palabra: palabraActual };
            io.to(j.id).emit('recibirRol', info);
        });
    });

    socket.on('listoParaHablar', () => {
        notificarTurno();
    });

    socket.on('finalizarMiTurno', () => {
        indiceTurno++;
        notificarTurno();
    });

    socket.on('votarJugador', (idVotado) => {
        votosRecibidos[idVotado] = (votosRecibidos[idVotado] || 0) + 1;
        const vivos = jugadores.filter(j => !j.eliminado).length;
        const totalVotos = Object.values(votosRecibidos).reduce((a, b) => a + b, 0);

        if (totalVotos >= vivos) {
            procesarVotacion();
        }
    });

    function procesarVotacion() {
        const expulsadoId = Object.keys(votosRecibidos).reduce((a, b) => votosRecibidos[a] > votosRecibidos[b] ? a : b);
        const expulsado = jugadores.find(j => j.id === expulsadoId);
        expulsado.eliminado = true;

        if (expulsado.rol === "IMPOSTOR") {
            io.emit('resultadoVotacion', { 
                mensaje: `¡TE ATRAPAMOS, ${expulsado.nombre.toUpperCase()}! 🔴`, 
                terminar: true, 
                palabraReal: palabraActual 
            });
        } else {
            const vivos = jugadores.filter(j => !j.eliminado);
            if (vivos.length <= 2) {
                io.emit('resultadoVotacion', { 
                    mensaje: "¡FALLO TOTAL! El impostor ganó. 💀", 
                    terminar: true, 
                    palabraReal: palabraActual 
                });
            } else {
                io.emit('resultadoVotacion', { 
                    mensaje: `¡NOS EQUIVOCAMOS! ${expulsado.nombre} era inocente. El impostor sigue suelto... 😈`, 
                    terminar: false 
                });
                setTimeout(() => { indiceTurno = 0; notificarTurno(); }, 4000);
            }
        }
        votosRecibidos = {};
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

server.listen(process.env.PORT || 3000, () => console.log("Servidor Online"));
