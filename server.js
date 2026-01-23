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
let votosRecibidos = {}; 
let rondaActual = 1;
let adminSocketId = null;

const palabras = ["Pizza", "Avión", "WhatsApp", "Netflix", "Fútbol", "Cine", "Playa", "Gato", "Reloj", "Bicicleta", "Hamburguesa", "Internet", "Instagram", "Parque", "Café", "Escuela", "Navidad", "Música", "Helado", "Libro", "Carro", "Perro", "Sol", "Trabajo", "Viaje", "Tacos", "Guitarra", "Hospital", "Cámara", "Luna", "Dinero", "Piscina", "Televisión", "Dormir", "Bailar", "Fruta", "Chocolate", "YouTube", "Teléfono", "Estudiar", "Policía", "Bombero", "Estadio", "Cerveza", "Sushi", "Zapato", "Verano", "Maleta", "Videojuego"];

function mezclar(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

io.on('connection', (socket) => {

    // Manejo de roles al conectarse
    socket.on('registrarTipo', (tipo) => {
        if (tipo === 'PROYECTOR') {
            socket.join('sala_proyeccion');
            // Enviamos lista inicial si ya hay jugadores
            socket.emit('listaInicialProyeccion', jugadores);
        }
    });

    socket.on('unirse', (datos) => {
        if (datos.nombre.toLowerCase() === 'anderson') {
            adminSocketId = socket.id;
            socket.join('sala_admin');
            console.log("Admin Anderson se ha conectado.");
            return; // No se agrega a la lista de jugadores
        }

        jugadores.push({ id: socket.id, nombre: datos.nombre, eliminado: false, rol: "" });
        io.emit('actualizarLista', jugadores.length);
        io.to('sala_proyeccion').emit('listaInicialProyeccion', jugadores);
    });

    socket.on('iniciarRonda', () => {
        if (jugadores.length < 3) return;
        rondaActual = 1;
        jugadores.forEach(j => { j.eliminado = false; j.rol = "CIUDADANO"; });
        
        const impIndex = Math.floor(Math.random() * jugadores.length);
        jugadores[impIndex].rol = "IMPOSTOR";
        palabraActual = palabras[Math.floor(Math.random() * palabras.length)];
        
        // Enviar roles a jugadores
        jugadores.forEach((j) => {
            const info = (j.rol === "IMPOSTOR") ? { rol: "IMPOSTOR" } : { rol: "CIUDADANO", palabra: palabraActual };
            io.to(j.id).emit('recibirRol', info);
        });

        // OJO DE DIOS: El admin recibe quién es quién y la palabra
        io.to('sala_admin').emit('infoSecretaAdmin', {
            jugadores: jugadores,
            palabra: palabraActual
        });

        io.to('sala_proyeccion').emit('pantallaEstado', 'JUEGO_INICIADO');
    });

    socket.on('empezarDebateOficial', () => {
        indiceTurno = 0;
        votosRecibidos = {};
        let vivos = jugadores.filter(j => !j.eliminado);
        let listaMezclada = mezclar([...vivos]);
        
        // El impostor nunca empieza primero
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
            const datosTurno = { nombre: ordenHablar[indiceTurno].nombre, idSocket: ordenHablar[indiceTurno].id, lista: jugadores };
            io.emit('cambioDeTurno', datosTurno);
            io.to('sala_proyeccion').emit('turnoEnPantalla', datosTurno.nombre);
        } else {
            io.emit('faseVotacion', jugadores.filter(j => !j.eliminado));
            io.to('sala_proyeccion').emit('pantallaEstado', 'VOTACION_ABIERTA');
        }
    }

    socket.on('votarJugador', (idVotado) => {
        const votante = jugadores.find(j => j.id === socket.id);
        if (!votante) return; // Si el admin intentara votar (no debería)

        if (!votosRecibidos[idVotado]) votosRecibidos[idVotado] = [];
        votosRecibidos[idVotado].push(votante.nombre);

        // ACTUALIZACIÓN EN TIEMPO REAL PARA EL PROYECTOR
        // Enviamos el conteo de votos por ID
        const conteoVotos = {};
        Object.keys(votosRecibidos).forEach(id => {
            conteoVotos[id] = votosRecibidos[id].length;
        });
        io.to('sala_proyeccion').emit('actualizarVotosProyeccion', conteoVotos);

        const totalVotos = Object.values(votosRecibidos).reduce((acc, curr) => acc + curr.length, 0);
        const vivos = jugadores.filter(j => !j.eliminado).length;

        if (totalVotos >= vivos) {
            procesarVotacion();
        }
    });

    function procesarVotacion() {
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

        let dataFinal = {
            expulsado: expulsado.nombre,
            votos: maxVotos,
            esImpostor: expulsado.rol === "IMPOSTOR",
            detalle: resumenDetallado,
            palabraReal: palabraActual
        };

        if (dataFinal.esImpostor) {
            io.emit('resultadoVotacion', { mensaje: `¡ATRAPADO! ${dataFinal.expulsado} era el IMPOSTOR.\n\n${resumenDetallado}`, terminar: true, palabraReal: palabraActual });
            io.to('sala_proyeccion').emit('resultadoFinalProyeccion', dataFinal);
        } else {
            if (rondaActual < 3) {
                rondaActual++;
                io.emit('resultadoVotacion', { mensaje: `¡ERROR! ${dataFinal.expulsado} era INOCENTE.\n\n${resumenDetallado}`, terminar: false });
                io.to('sala_proyeccion').emit('resultadoFinalProyeccion', { ...dataFinal, mensajeRonda: "INOCENTE EXPULSADO - Siguiente Ronda" });
            } else {
                io.emit('resultadoVotacion', { mensaje: `¡DERROTA! El impostor ganó.\n\n${resumenDetallado}`, terminar: true, palabraReal: palabraActual });
                io.to('sala_proyeccion').emit('resultadoFinalProyeccion', dataFinal);
            }
        }
        votosRecibidos = {};
    }

    socket.on('disconnect', () => {
        jugadores = jugadores.filter(j => j.id !== socket.id);
        io.emit('actualizarLista', jugadores.length);
        io.to('sala_proyeccion').emit('listaInicialProyeccion', jugadores);
    });
});

server.listen(process.env.PORT || 3000);
