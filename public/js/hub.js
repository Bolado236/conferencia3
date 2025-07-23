import { db } from './firebase.js';
import { collection, getDocs, doc, getDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const infoUsuario = document.getElementById('infoUsuario');
const btnLogout = document.getElementById('btnLogout');
const listaContagens = document.getElementById('listaContagens');

const usuario = sessionStorage.getItem("usuario");
const loja = sessionStorage.getItem("loja");
const tipo = sessionStorage.getItem("tipo");

if (!usuario || !loja) return location.href='login.html';
infoUsuario.textContent = `Usuário: ${usuario} | Loja: ${loja}`;
btnLogout.addEventListener("click", () => { sessionStorage.clear(); location.href='login.html'; });

async function carregarContagens() {
  const snap = await getDocs(collection(db, 'conferencias', loja, 'contagens'));
  listaContagens.innerHTML = '';
  for (const docSnap of snap.docs) {
    const cId = docSnap.id;
    const data = docSnap.data();
    const etapa = data.etapaAtual || 'contagem1';
    const div = document.createElement('div');
    div.innerHTML = `
      <p><b>${cId}</b> - Etapa atual: ${etapa}</p>
      <button data-id="${cId}" data-etapa="${etapa}">Acessar etapa</button>
    `;
    div.querySelector('button').onclick = () => {
      sessionStorage.setItem("contagemAtual", cId);
      sessionStorage.setItem("etapaAtual", etapa);
      location.href = 'contagem.html';
    };
    listaContagens.appendChild(div);
  }
}
carregarContagens();
