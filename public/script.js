const socket = io();
let esAdmin = false;

function entrar() { const n = document.getElementById("u").value.trim(); if(n) socket.emit('unirse', { nombre: n }); }

socket.on('vistas', (v) => {
    if(v === 'ADMIN') {
        esAdmin = true;
        document.getElementById("admin-p").style.display = "block";
        document.getElementById("adminBtn").style.display = "block";
    }
    show("waiting");
});

socket.on('infoSecretaAdmin', (d) => {
    if(esAdmin) {
        const imp = d.jugadores.find(j => j.rol === "IMPOSTOR");
        document.getElementById("adm-info").innerText = `IMP: ${imp.nombre} | FRRASE: ${d.palabra}`;
        document.getElementById("b-deb").style.display = "block";
        document.getElementById("b-for").style.display = "none";
        document.getElementById("b-res").style.display = "none";
    }
});

socket.on('recibirRol', (d) => {
    document.getElementById("rT").innerText = d.rol === "IMPOSTOR" ? "ERES EL IMPOSTOR" : "TU FRASE ES:";
    document.getElementById("rX").innerText = d.rol === "IMPOSTOR" ? "Descubre la frase" : d.palabra;
    show("role");
});

socket.on('cambioDeTurno', (d) => {
    if(esAdmin) { document.getElementById("b-deb").style.display="none"; document.getElementById("b-for").style.display="block"; }
    show("turn");
    document.getElementById("curr").innerText = d.nombre;
    document.getElementById("b-fin").style.display = (socket.id === d.idSocket) ? "block" : "none";
});

socket.on('faseVotacion', (vivos) => {
    if(esAdmin) document.getElementById("b-for").style.display="none";
    show("end");
    const l = document.getElementById("l-v"); l.innerHTML = esAdmin ? "Esperando votos..." : "";
    if(!esAdmin) {
        vivos.forEach(j => {
            if (j.id !== socket.id) {
                const b = document.createElement("button"); b.className="btn-voto"; b.innerText=j.nombre;
                b.onclick = () => { socket.emit('votarJugador', j.id); l.innerHTML="Voto enviado"; };
                l.appendChild(b);
            }
        });
    }
});

socket.on('resultadoVotacion', (res) => {
    show("result");
    document.getElementById("t-r").innerText = res.mensaje;
    if(res.terminar) {
        document.getElementById("t-p").innerText = "LA FRRASE ERA: " + res.palabraReal;
        if(esAdmin) document.getElementById("b-res").style.display="block";
    } else { document.getElementById("t-p").innerText = "Siguiente ronda en 8 segundos..."; }
});

function show(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const t = document.getElementById(id); if(t) t.classList.add("active");
}
socket.on('actualizarLista', (n) => { if(document.getElementById("count")) document.getElementById("count").innerText = n; });








