import { db } from './firebase.js';
import { collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const infoUsuario = document.getElementById('infoUsuario');
const btnAdmin = document.getElementById('btnAdmin');
const btnLogout = document.getElementById('btnLogout');
const lista = document.getElementById('listaContagens');

const usuario = sessionStorage.getItem('usuario');
const loja = sessionStorage.getItem('loja');
const tipo = sessionStorage.getItem('tipo');

if (!usuario || !loja) {
  sessionStorage.clear();
  location = 'login.html';
}
infoUsuario.textContent = `${usuario} — Loja ${loja}`;

if (tipo === 'admin') {
  btnAdmin.style.display = 'inline-block';
  btnAdmin.onclick = () => location = 'admin.html';
}
btnLogout.onclick = () => { sessionStorage.clear(); location = 'login.html'; };

async function carregarContagens() {
  const snap = await getDocs(collection(db, 'conferencias', loja, 'contagens'));
  lista.innerHTML = '';
  for (let d of snap.docs) {
    const cont = d.id;
    const data = d.data();
    const etapaAtual = data.etapaAtual;
    const tipoEtapa = (await getDoc(doc(db, `conferencias/${loja}/contagens/${cont}/etapas/${etapaAtual}`))).data().tipo;
    const div = document.createElement('div');
    div.innerHTML = `
      <p><b>${cont}</b> — Etapa: ${etapaAtual} (${tipoEtapa})</p>
      <button>Acessar etapa</button>`;
    div.querySelector('button').onclick = () => {
      sessionStorage.setItem('contagemAtual', cont);
      sessionStorage.setItem('etapaAtual', etapaAtual);
      location = 'contagem.html';
    };
    lista.appendChild(div);
  }
}

carregarContagens();
