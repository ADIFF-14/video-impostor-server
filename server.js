const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let jugadores = [];
let ordenHablar = []; // Nueva lista para el orden aleatorio
let indiceTurno = 0;
let palabraActual = "";
let votosRecibidos = {};
let rondaActual = 1;

const palabras = [
    "Pizza", "Avión", "WhatsApp", "Netflix", "Fútbol", "Cine", "Playa", "Gato", "Reloj", "Bicicleta",
    "Hamburgesa", "Internet", "Gimnasio", "Chocolate", "YouTube", "Instagram", "Parque", "Dormir", "Café", "Escuela",
    "Teléfono", "Navidad", "Verano", "Bailar", "Música", "Fruta", "Helado", "Cerveza", "Libro", "Zapato",
    "Carro", "Perro", "Luna", "Sol", "Estudiar", "Trabajo", "Dinero", "Viaje", "Maleta", "Cámara",
    "Televisión", "Videojuego", "Sushi", "Tacos", "Guitarra", "Piscina", "Estadio", "Hospital", "Policía", "Bombero"
];

// Función para mezclar cualquier array (Algoritmo Fisher-Yates)
function mezclar(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

io.on('connection', (socket) => {
    socket.on('unirse', (datos) => {
        jugadores.push({ id: socket.id, nombre: datos.nombre, peerId: datos.peerId, eliminado: false, rol: "" });
        io.emit('actualizarLista', jugadores.length);
    });

    socket.on('iniciarRonda', () => {
        if (jugadores.length < 3) return;
        rondaActual = 1;
        
        // 1. Elegir impostor al azar (reseteando a todos primero)
        jugadores.forEach(j => { j.eliminado = false; j.rol = "CIUDADANO"; });
        const impIndex = Math.floor(Math.random() * jugadores.length);
        jugadores[impIndex].rol = "IMPOSTOR";

        // 2. Elegir frase al azar
        palabraActual = palabras[Math.floor(Math.random() * palabras.length)];

        // 3. Crear un ORDEN DE HABLAR aleatorio
        ordenHablar = mezclar([...jugadores]); 

        // 4. Enviar roles individualmente
        jugadores.forEach((j) => {
            const info = (j.rol === "IMPOSTOR") ? { rol: "IMPOSTOR" } : { rol: "CIUDADANO", palabra: palabraActual };
            io.to(j.id).emit('recibirRol', info);
        });

        iniciarNuevaFase(false); // false porque ya repartimos roles arriba
    });

    function iniciarNuevaFase(esNuevaRondaDeVoto) {
        indiceTurno = 0;
        votosRecibidos = {};
        
        // Si es una nueva ronda porque fallaron el voto, mezclamos el orden de nuevo para que no sea igual
        if (esNuevaRondaDeVoto) {
            ordenHablar = mezclar(ordenHablar.filter(j => !j.eliminado));
        }

        io.emit('notificarRonda', rondaActual);
    }

    socket.on('listoParaHablar', () => { notificarTurno(); });

    socket.on('finalizarMiTurno', () => {
        indiceTurno++;
        notificarTurno();
    });

    socket.on('votarJugador', (idVotado) => {
        votosRecibidos[idVotado] = (votosRecibidos[idVotado] || 0) + 1;
        const vivos = jugadores.filter(j => !j.eliminado).length;
        if (Object.values(votosRecibidos).reduce((a, b) => a + b, 0) >= vivos) {
            procesarVotacion();
        }
    });

    function procesarVotacion() {
        const expulsadoId = Object.keys(votosRecibidos).reduce((a, b) => votosRecibidos[a] > votosRecibidos[b] ? a : b);
        const expulsado = jugadores.find(j => j.id === expulsadoId);
        if(!expulsado) return;
        expulsado.eliminado = true;

        if (expulsado.rol === "IMPOSTOR") {
            io.emit('resultadoVotacion', { 
                mensaje: `¡TE ATRAPAMOS! ${expulsado.nombre} era el impostor 🔴`, 
                terminar: true, 
                palabraReal: palabraActual 
            });
        } else {
            if (rondaActual < 3) {
                rondaActual++;
                io.emit('resultadoVotacion', { 
                    mensaje: `¡SE EQUIVOCARON! ${expulsado.nombre} era inocente. El impostor sigue suelto... 😈`, 
                    terminar: false 
                });
                setTimeout(() => { iniciarNuevaFase(true); }, 4000);
            } else {
                io.emit('resultadoVotacion', { 
                    mensaje: "¡EL IMPOSTOR HA GANADO! Sobrevivió las 3 rondas. 💀", 
                    terminar: true, 
                    palabraReal: palabraActual 
                });
            }
        }
        votosRecibidos = {};
    }

    function notificarTurno() {
        // Buscamos al siguiente en el orden que no esté eliminado
        while (indiceTurno < ordenHablar.length && ordenHablar[indiceTurno].eliminado) { 
            indiceTurno++; 
        }

        if (indiceTurno < ordenHablar.length) {
            io.emit('cambioDeTurno', { 
                nombre: ordenHablar[indiceTurno].nombre, 
                idSocket: ordenHablar[indiceTurno].id, 
                lista: ordenHablar 
            });
        } else {
            io.emit('faseVotacion', jugadores.filter(j => !j.eliminado));
        }
    }

    socket.on('disconnect', () => {
        jugadores = jugadores.filter(j => j.id !== socket.id);
        ordenHablar = ordenHablar.filter(j => j.id !== socket.id);
        io.emit('actualizarLista', jugadores.length);
    });
});

server.listen(process.env.PORT || 3000, () => console.log("Servidor con turnos e impostores aleatorios."));
