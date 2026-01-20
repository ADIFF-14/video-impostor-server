function entrarJuego() {
    console.log("Botón presionado");
    alert("1. Botón detectado");

    const inputNombre = document.getElementById("userName");
    miNombre = (inputNombre ? inputNombre.value : "") || "Jugador_" + Math.floor(Math.random()*100);

    if (miNombre.toLowerCase() === "anderson") esAdmin = true;

    if (!socket) {
        alert("Error: Socket.io no cargó");
        return;
    }

    alert("2. Socket detectado. Estado de Peer: " + (peer.id ? "Listo" : "Cargando..."));

    if (peer.id) {
        enviarAlServidor();
    } else {
        alert("3. Esperando a PeerJS (Audio)... Si esto no cierra, PeerJS falló.");
        peer.on('open', (id) => {
            alert("4. PeerJS conectado con ID: " + id);
            enviarAlServidor();
        });
    }
}
