import { db } from './firebase.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const infoUsuarioLoja = document.getElementById('infoUsuarioLoja');
const listaContagens = document.getElementById('listaContagens');
const btnAdmin = document.getElementById('btnAdmin');
const btnLogout = document.getElementById('btnLogout');

function verificarSessao() {
    const usuario = sessionStorage.getItem('usuario');
    const tipo = sessionStorage.getItem('tipo');
    const loja = sessionStorage.getItem('loja');

    if (!usuario || !tipo || !loja) {
        window.location.href = '../html/login.html';
        return null;
    }

    return { usuario, tipo, loja };
}

async function carregarContagens(loja) {
    listaContagens.innerHTML = '';
    try {
        const contagensRef = collection(db, 'conferencias', loja);
        const snapshot = await getDocs(contagensRef);
        if (snapshot.empty) {
            listaContagens.innerHTML = '<li>Nenhuma contagem ativa.</li>';
            return;
        }
        snapshot.forEach(doc => {
            const li = document.createElement('li');
            li.textContent = doc.id;
            listaContagens.appendChild(li);
        });
    } catch (error) {
        console.error('Erro ao carregar contagens:', error);
        listaContagens.innerHTML = '<li>Erro ao carregar contagens.</li>';
    }
}

function configurarBotaoAdmin(tipo) {
    if (tipo === 'admin') {
        btnAdmin.style.display = 'inline-block';
        btnAdmin.addEventListener('click', () => {
            window.location.href = '../html/admin.html';
        });
    } else {
        btnAdmin.style.display = 'none';
    }
}

btnLogout.addEventListener('click', () => {
    sessionStorage.clear();
    window.location.href = '../html/login.html';
});

document.addEventListener('DOMContentLoaded', () => {
    const sessao = verificarSessao();
    if (!sessao) return;

    infoUsuarioLoja.textContent = `Usuário: ${sessao.usuario} | Loja: ${sessao.loja}`;
    configurarBotaoAdmin(sessao.tipo);
    carregarContagens(sessao.loja);
});
