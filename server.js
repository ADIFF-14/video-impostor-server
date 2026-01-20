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
let votos = {}; // Para contar los votos de la fase de votación

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
    
    socket.on('unirse', (datos) => {
        // Añadimos la propiedad 'eliminado' y 'rol' a cada jugador
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
        if (jugadores.length < 3) return; // Se recomienda mínimo 3 para votar
        
        indiceTurno = 0;
        votos = {};
        palabraActual = palabras[Math.floor(Math.random() * palabras.length)];
        const impIndex = Math.floor(Math.random() * jugadores.length);
        
        jugadores.forEach((j, i) => {
            j.eliminado = false; // Resetear estado de eliminación
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

    // LÓGICA DE VOTACIÓN
    socket.on('votarJugador', (idVotado) => {
        votos[idVotado] = (votos[idVotado] || 0) + 1;
        
        const vivos = jugadores.filter(j => !j.eliminado).length;
        const totalVotosRecibidos = Object.values(votos).reduce((a, b) => a + b, 0);

        if (totalVotosRecibidos >= vivos) {
            procesarVotacion();
        }
    });

    function procesarVotacion() {
        // Encontrar al más votado
        const expulsadoId = Object.keys(votos).reduce((a, b) => votos[a] > votos[b] ? a : b);
        const jugadorExpulsado = jugadores.find(j => j.id === expulsadoId);
        
        jugadorExpulsado.eliminado = true;
        const esImpostor = (jugadorExpulsado.rol === "IMPOSTOR");

        if (esImpostor) {
            // VICTORIA CIUDADANA
            io.emit('resultadoVotacion', { 
                mensaje: `¡TE DESCUBRIMOS, ${jugadorExpulsado.nombre.toUpperCase()}! 🔴`, 
                terminar: true, 
                palabraReal: palabraActual 
            });
        } else {
            const vivos = jugadores.filter(j => !j.eliminado);
            const impostorSigueVivo = vivos.some(j => j.rol === "IMPOSTOR");

            // Si quedan 2 personas y una es el impostor, gana el impostor
            if (vivos.length <= 2 && impostorSigueVivo) {
                io.emit('resultadoVotacion', { 
                    mensaje: "¡EL IMPOSTOR HA DOMINADO LA SALA! 💀", 
                    terminar: true, 
                    palabraReal: palabraActual 
                });
            } else {
                // EL JUEGO CONTINÚA
                io.emit('resultadoVotacion', { 
                    mensaje: `¡FALLO TOTAL! ${jugadorExpulsado.nombre} era inocente. El impostor sigue entre nosotros... 😈`, 
                    terminar: false 
                });
                
                // Reiniciar turnos tras 4 segundos
                setTimeout(() => {
                    indiceTurno = 0;
                    notificarTurno();
                }, 4000);
            }
        }
        votos = {};
    }

    function notificarTurno() {
        // Saltar a los jugadores que están eliminados
        while (indiceTurno < jugadores.length && jugadores[indiceTurno].eliminado) {
            indiceTurno++;
        }

        if (indiceTurno < jugadores.length) {
            const jugadorActual = jugadores[indiceTurno];
            io.emit('cambioDeTurno', { 
                nombre: jugadorActual.nombre, 
                idSocket: jugadorActual.id,
                listaActualizada: jugadores // Enviamos la lista para actualizar los cuadritos
            });
        } else {
            // Solo los que no están eliminados pueden votar
            const vivos = jugadores.filter(j => !j.eliminado);
            io.emit('faseVotacion', vivos);
        }
    }

    socket.on('disconnect', () => {
        jugadores = jugadores.filter(j => j.id !== socket.id);
        io.emit('actualizarLista', jugadores.length);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));
