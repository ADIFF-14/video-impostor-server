    showScreen("turnScreen");
    document.getElementById("currentSpeakerName").innerText = data.nombre;
    document.getElementById("btnFinalizarTurno").style.display =
      (socket.id === data.idSocket) ? "block" : "none";
});

socket.on('faseVotacion', (vivos) => {
    showScreen("end");
    const lista = document.getElementById("lista-votacion");
    lista.innerHTML = esAdmin ? "Votación en curso..." : "";

    if (!esAdmin) {
        vivos.forEach(j => {
            if (j.id !== socket.id) {
                const b = document.createElement("button");
                b.className = "btn-big";
                b.style.background = "#333";
                b.style.color = "white";
                b.innerText = j.nombre;
                b.onclick = () => {
                    socket.emit('votarJugador', j.id);
                    lista.innerHTML = "Voto enviado";
                };
                lista.appendChild(b);
            }
        });
    }
});

socket.on('resultadoVotacion', (res) => {
    showScreen("result");
    document.getElementById("texto-res").innerText = res.mensaje;

    if (res.palabraReal) {
        document.getElementById("texto-palabra").innerText =
          "La frase era: " + res.palabraReal;
    }

    // ✅ EL ADMIN SIEMPRE PUEDE INICIAR NUEVA PARTIDA
    if (esAdmin) {
        document.getElementById("btn-reiniciar").style.display = "block";
    }
});

function showScreen(id) {
    document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
    const target = document.getElementById(id);
    if (target) target.classList.add("active");
}

socket.on('actualizarLista', (n) => {
    document.getElementById("count").innerText = n;
});















