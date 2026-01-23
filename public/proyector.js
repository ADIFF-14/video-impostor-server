const socket = io();
socket.emit('unirse', { nombre: 'proyector' });

socket.on('actualizarJugadores', jugadores => {
  const g = document.getElementById('grid');
  g.innerHTML = '';
  jugadores.forEach(j => {
    const d = document.createElement('div');
    d.innerText = j.nombre;
    d.className = 'card';
    g.appendChild(d);
  });
});

socket.on('turnoPantalla', nombre => {
  document.getElementById('main').innerText = nombre;
});

socket.on('votosPantalla', votos => {
  // opcional: mostrar conteo
});

socket.on('resultadoFinal', data => {
  const o = document.getElementById('overlay');
  o.style.display = 'flex';

  if (data.esImpostor) {
    document.getElementById('res').innerText =
      `TE ATRAPAMOS\n${data.nombre}\nERAS EL IMPOSTOR`;
  } else {
    document.getElementById('res').innerText =
      `${data.nombre}\nERES INOCENTE\nNO ERAS EL IMPOSTOR`;
  }
});

