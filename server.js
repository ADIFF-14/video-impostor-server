const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let jugadores = [];
let ordenHablar = [];
let indiceTurno = 0;
let palabraActual = "";
let votosRecibidos = {}; // Ahora guardará { idVotado: [NombreVotante1, NombreVotante2] }
let rondaActual = 1;

const palabras = ["Pizza", "Avión", "WhatsApp", "Netflix", "Fútbol", "Cine", "Playa", "Gato", "Reloj", "Bicicleta", "Hamburguesa", "Internet", "Instagram", "Parque", "Café", "Escuela", "Navidad", "Música", "Helado", "Libro", "Carro", "Perro", "Sol", "Trabajo", "Viaje", "Tacos", "Guitarra", "Hospital", "Cámara", "Luna", "Dinero", "Piscina", "Televisión", "Dormir", "Bailar", "Fruta", "Chocolate", "YouTube", "Teléfono", "Estudiar", "Policía", "Bombero", "Estadio", "Cerveza", "Sushi", "Zapato", "Verano", "Maleta", "Videojuego"];

function mezclar(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

io.on('connection', (socket) => {
    socket.on('unirse', (datos) => {
        jugadores.push({ id: socket.id, nombre: datos.nombre, eliminado: false, rol: "" });
        io.emit('actualizarLista', jugadores.length);
    });

    socket.on('iniciarRonda', () => {
        if (jugadores.length < 3) return;
        rondaActual = 1;
        jugadores.forEach(j => { j.eliminado = false; j.rol = "CIUDADANO"; });
        const impIndex = Math.floor(Math.random() * jugadores.length);
        jugadores[impIndex].rol = "IMPOSTOR";
        palabraActual = palabras[Math.floor(Math.random() * palabras.length)];
        
        jugadores.forEach((j) => {
            const info = (j.rol === "IMPOSTOR") ? { rol: "IMPOSTOR" } : { rol: "CIUDADANO", palabra: palabraActual };
            io.to(j.id).emit('recibirRol', info);
        });
    });

    socket.on('empezarDebateOficial', () => {
        indiceTurno = 0;
        votosRecibidos = {};
        let vivos = jugadores.filter(j => !j.eliminado);
        let listaMezclada = mezclar([...vivos]);
        
        if (listaMezclada.length > 1 && listaMezclada[0].rol === "IMPOSTOR") {
            const impostor = listaMezclada.shift();
            const nuevaPos = Math.floor(Math.random() * listaMezclada.length) + 1;
            listaMezclada.splice(nuevaPos, 0, impostor);
        }
        
        ordenHablar = listaMezclada;
        notificarTurno();
    });

    socket.on('finalizarMiTurno', () => {
        indiceTurno++;
        notificarTurno();
    });

    function notificarTurno() {
        if (indiceTurno < ordenHablar.length) {
            io.emit('cambioDeTurno', { nombre: ordenHablar[indiceTurno].nombre, idSocket: ordenHablar[indiceTurno].id, lista: jugadores });
        } else {
            io.emit('faseVotacion', jugadores.filter(j => !j.eliminado));
        }
    }

    socket.on('votarJugador', (idVotado) => {
        const votante = jugadores.find(j => j.id === socket.id);
        if (!votosRecibidos[idVotado]) votosRecibidos[idVotado] = [];
        
        // Guardamos el NOMBRE de quien votó
        votosRecibidos[idVotado].push(votante.nombre);

        const totalVotos = Object.values(votosRecibidos).reduce((acc, curr) => acc + curr.length, 0);
        const vivos = jugadores.filter(j => !j.eliminado).length;

        if (totalVotos >= vivos) {
            procesarVotacion();
        }
    });

    function procesarVotacion() {
        // Crear el resumen de quién votó por quién
        let resumenDetallado = "";
        Object.keys(votosRecibidos).forEach(id => {
            const objetivo = jugadores.find(j => j.id === id);
            const quienesVotaron = votosRecibidos[id].join(", ");
            resumenDetallado += `${objetivo.nombre} (${votosRecibidos[id].length} votos): ${quienesVotaron}\n`;
        });

        const idsVotados = Object.keys(votosRecibidos);
        let maxVotos = 0;
        let expulsadoId = null;
        idsVotados.forEach(id => {
            if (votosRecibidos[id].length > maxVotos) {
                maxVotos = votosRecibidos[id].length;
                expulsadoId = id;
            }
        });

        const expulsado = jugadores.find(j => j.id === expulsadoId);
        if(!expulsado) return;
        expulsado.eliminado = true;

        let mensajeFinal = "";
        if (expulsado.rol === "IMPOSTOR") {
            mensajeFinal = `¡TE ATRAPAMOS! ${expulsado.nombre} era el IMPOSTOR.\n\nDETALLE:\n${resumenDetallado}`;
            io.emit('resultadoVotacion', { mensaje: mensajeFinal, terminar: true, palabraReal: palabraActual });
        } else {
            if (rondaActual < 3) {
                rondaActual++;
                mensajeFinal = `¡ERROR! ${expulsado.nombre} era INOCENTE.\n\nDETALLE:\n${resumenDetallado}`;
                io.emit('resultadoVotacion', { mensaje: mensajeFinal, terminar: false });
            } else {
                mensajeFinal = `¡DERROTA! El impostor ganó.\n\nDETALLE:\n${resumenDetallado}`;
                io.emit('resultadoVotacion', { mensaje: mensajeFinal, terminar: true, palabraReal: palabraActual });
            }
        }
        votosRecibidos = {};
    }

    socket.on('disconnect', () => {
        jugadores = jugadores.filter(j => j.id !== socket.id);
        io.emit('actualizarLista', jugadores.length);
    });
});

server.listen(process.env.PORT || 3000);
