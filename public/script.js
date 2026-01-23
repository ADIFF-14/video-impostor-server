const socket = io();
let soyAdmin = false;

function entrar() {
  const nombre = document.getElementById('nombre').value;
  socket.emit('unirse', { nombre });
}

socket.on('vista', (tipo) => {
  if (tipo === 'ADMIN') {
    soyAdmin = true;
    document.getElementById('admin').style.display = 'block';
  }
  mostrar('espera');
});

socket.on('contador', n => {
  document.getElementById('count').innerText = n;
});

socket.on('rol', data => {
  mostrar('rol');
  if (data.tipo === 'IMPOSTOR') {
    document.getElementById('rolTexto').innerText = "ERES EL IMPOSTOR";
  } else {
    document.getElementById('rolTexto').innerText = data.palabra;
  }
});

socket.on('turno', data => {
  mostrar('turno');
  document.getElementById('habla').innerText = data.nombre;
  document.getElementById('btnFin').style.display =
    socket.id === data.id ? 'block' : 'none';
});

socket.on('faseVotacion', jugadores => {
  mostrar('votar');
  const c = document.getElementById('lista');
  c.innerHTML = '';
  jugadores.forEach(j => {
    if (j.id !== socket.id) {
      const b = document.createElement('button');
      b.innerText = j.nombre;
      b.onclick = () => socket.emit('votar', j.id);
      c.appendChild(b);
    }
  });
});

function mostrar(id) {
  document.querySelectorAll('.pantalla').forEach(p => p.style.display = 'none');
  document.getElementById(id).style.display = 'block';
}












