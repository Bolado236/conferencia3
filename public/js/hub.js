import { db } from './firebase.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

async function carregarEtapaAtual(loja, contagemId) {
    try {
        const contagemRef = doc(db, 'conferencias', loja, 'contagens', contagemId);
        const snap = await getDoc(contagemRef);
        if (snap.exists()) {
            const etapaAtual = snap.data().etapaAtual;
            return etapaAtual;
        }
        return null;
    } catch (error) {
        console.error('Erro ao carregar etapa atual:', error);
        return null;
    }
}

async function carregarContagens(loja) {
    listaContagens.innerHTML = '';
    try {
        const contagensRef = collection(db, 'conferencias', loja, 'contagens');
        const snapshot = await getDocs(contagensRef);
        if (snapshot.empty) {
            listaContagens.innerHTML = '<li>Nenhuma contagem ativa.</li>';
            return;
        }
        for (const docSnap of snapshot.docs) {
            const contagemId = docSnap.id;
            const etapaAtual = await carregarEtapaAtual(loja, contagemId);
            const li = document.createElement('li');
            li.textContent = contagemId + ' - Etapa Atual: ' + (etapaAtual || 'N/A');

            // Mostrar botão iniciar contagem apenas se for etapa atual
            if (etapaAtual) {
                const btnIniciar = document.createElement('button');
                btnIniciar.textContent = 'Iniciar Contagem';
                btnIniciar.addEventListener('click', () => {
                    sessionStorage.setItem('contagemAtual', contagemId);
                    sessionStorage.setItem('etapaAtual', etapaAtual);
                    window.location.href = '../html/contagem.html';
                });
                li.appendChild(btnIniciar);
            }

            listaContagens.appendChild(li);
        }
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
