import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const btnVoltarHub = document.getElementById('btnVoltarHub');
const itensContadosDiv = document.getElementById('itensContados');
const itensNaoContadosDiv = document.getElementById('itensNaoContados');
const itensDivergentesDiv = document.getElementById('itensDivergentes');

btnVoltarHub.addEventListener('click', () => {
    window.location.href = 'hub.html';
});

function verificarSessao() {
    const usuario = sessionStorage.getItem('usuario');
    const tipo = sessionStorage.getItem('tipo');
    const loja = sessionStorage.getItem('loja');

    if (!usuario || !tipo || !loja) {
        window.location.href = 'login.html';
        return null;
    }

    return { usuario, tipo, loja };
}

async function carregarRelatorios() {
    const sessao = verificarSessao();
    if (!sessao) return;

    const loja = sessao.loja;
    const contagem = 'contagem1'; // Pode ser parametrizado

    try {
        const baseRef = doc(db, 'conferencias', loja, contagem, 'baseProdutos');
        const baseSnap = await getDoc(baseRef);
        const baseProdutos = baseSnap.exists() ? baseSnap.data().produtos : [];

        // Para simplificação, exibiremos os produtos da base como itens contados
        itensContadosDiv.innerHTML = baseProdutos.map(p => `<div>${p.codigoProduto} - ${p.descricao}</div>`).join('');
        itensNaoContadosDiv.innerHTML = '<p>Funcionalidade a implementar</p>';
        itensDivergentesDiv.innerHTML = '<p>Funcionalidade a implementar</p>';
    } catch (error) {
        console.error('Erro ao carregar relatórios:', error);
        itensContadosDiv.textContent = 'Erro ao carregar dados.';
        itensNaoContadosDiv.textContent = 'Erro ao carregar dados.';
        itensDivergentesDiv.textContent = 'Erro ao carregar dados.';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    carregarRelatorios();
});

