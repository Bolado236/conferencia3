import { db } from './firebase.js';
import { collection, doc, setDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { converterXLSXParaJSON } from './xlsxConverter.js';

const inputXLSX = document.getElementById('inputXLSX');
const btnImportarBase = document.getElementById('btnImportarBase');
const formCadastroUsuario = document.getElementById('formCadastroUsuario');
const btnVoltarHub = document.getElementById('btnVoltarHub');
const relatorioResultado = document.getElementById('relatorioResultado');
const btnRelatorioItensContados = document.getElementById('btnRelatorioItensContados');
const btnRelatorioItensNaoContados = document.getElementById('btnRelatorioItensNaoContados');
const btnRelatorioDivergencias = document.getElementById('btnRelatorioDivergencias');
const controlesContagem = document.getElementById('controlesContagem');

let baseProdutos = [];
let lojaAtual = null;
let contagemAtual = null;

function verificarSessao() {
    const usuario = sessionStorage.getItem('usuario');
    const tipo = sessionStorage.getItem('tipo');
    const loja = sessionStorage.getItem('loja');

    if (!usuario || !tipo || !loja) {
        window.location.href = 'login.html';
        return null;
    }

    if (tipo !== 'admin') {
        alert('Acesso negado. Apenas administradores podem acessar esta página.');
        window.location.href = 'hub.html';
        return null;
    }

    return { usuario, tipo, loja };
}

btnVoltarHub.addEventListener('click', () => {
    window.location.href = 'hub.html';
});

document.getElementById("btnCriarContagem").addEventListener("click", async () => {
    const nome = document.getElementById("inputNomeContagem").value.trim();
    const loja = sessionStorage.getItem("loja");
    if (!nome || !loja) {
        alert("Preencha nome da contagem e loja.");
        return;
    }
    try {
        const docRef = doc(db, "conferencias", loja, nome);
        await setDoc(docRef, { criadaEm: new Date().toISOString() });
        sessionStorage.setItem("contagemAtual", nome);
        alert("Contagem criada com sucesso!");
        carregarContagens();
    } catch (error) {
        console.error("Erro ao criar contagem:", error);
        alert("Erro ao criar contagem.");
    }
});

btnImportarBase.addEventListener('click', async () => {
    if (!inputXLSX.files.length) {
        alert('Selecione um arquivo XLSX para importar.');
        return;
    }
    const file = inputXLSX.files[0];
    try {
        baseProdutos = await converterXLSXParaJSON(file);
        alert('Base de produtos importada com sucesso. Total: ' + baseProdutos.length);
        // Salvar baseProdutos no Firestore na coleção correta
        const loja = sessionStorage.getItem("loja");
        const contagemAtual = sessionStorage.getItem("contagemAtual");
        if (!loja || !contagemAtual) {
            alert('Loja ou contagem não definida. Por favor, selecione ou crie uma contagem.');
            return;
        }
        const baseRef = doc(db, 'conferencias', loja, contagemAtual, 'baseProdutos');
        await setDoc(baseRef, { produtos: baseProdutos });
        alert('Base de produtos salva no Firestore.');
    } catch (error) {
        console.error('Erro ao importar base:', error);
        alert('Erro ao importar base: ' + error.message);
    }
});

formCadastroUsuario.addEventListener('submit', async (e) => {
    e.preventDefault();
    const novoUsuario = formCadastroUsuario.novoUsuario.value.trim();
    const novaSenha = formCadastroUsuario.novaSenha.value.trim();
    const tipoUsuario = formCadastroUsuario.tipoUsuario.value;
    const lojaUsuario = formCadastroUsuario.lojaUsuario.value.trim();

    if (!novoUsuario || !novaSenha || !tipoUsuario || !lojaUsuario) {
        alert('Preencha todos os campos do cadastro.');
        return;
    }

    try {
        const userRef = doc(db, 'usuarios', novoUsuario);
        await setDoc(userRef, {
            senha: novaSenha,
            tipo: tipoUsuario,
            loja: lojaUsuario
        });
        alert('Usuário cadastrado com sucesso.');
        formCadastroUsuario.reset();
    } catch (error) {
        console.error('Erro ao cadastrar usuário:', error);
        alert('Erro ao cadastrar usuário.');
    }
});

async function carregarContagens() {
    controlesContagem.innerHTML = '';
    if (!lojaAtual) return;
    try {
        if (lojaAtual === 'todas') {
            controlesContagem.textContent = 'Selecione uma loja específica para carregar contagens.';
            return;
        }
        const lojaDocRef = doc(db, 'conferencias', lojaAtual);
        const contagensRef = collection(lojaDocRef, 'contagens');
        const snapshot = await getDocs(contagensRef);
        if (snapshot.empty) {
            controlesContagem.textContent = 'Nenhuma contagem encontrada.';
            return;
        }
        snapshot.forEach(docSnap => {
            const div = document.createElement('div');
            div.textContent = docSnap.id;
            div.style.cursor = 'pointer';
            div.addEventListener('click', () => {
                contagemAtual = docSnap.id;
                alert('Contagem selecionada: ' + contagemAtual);
            });
            controlesContagem.appendChild(div);
        });
    } catch (error) {
        console.error('Erro ao carregar contagens:', error);
        controlesContagem.textContent = 'Erro ao carregar contagens.';
    }
}

btnRelatorioItensContados.addEventListener('click', () => {
    gerarRelatorio('itensContados');
});

btnRelatorioItensNaoContados.addEventListener('click', () => {
    gerarRelatorio('itensNaoContados');
});

btnRelatorioDivergencias.addEventListener('click', () => {
    gerarRelatorio('itensDivergencias');
});

async function gerarRelatorio(tipoRelatorio) {
    if (!lojaAtual || !contagemAtual) {
        alert('Selecione uma contagem para gerar o relatório.');
        return;
    }
    relatorioResultado.textContent = 'Carregando relatório...';
    try {
        const contagemRef = doc(db, 'conferencias', lojaAtual, contagemAtual);
        const contagemSnap = await getDocs(collection(contagemRef, tipoRelatorio));
        if (contagemSnap.empty) {
            relatorioResultado.textContent = 'Nenhum dado encontrado para este relatório.';
            return;
        }
        let html = '<ul>';
        contagemSnap.forEach(docSnap => {
            const item = docSnap.data();
            html += `<li>${item.codigoProduto} - ${item.descricao} - Quantidade: ${item.quantidade || ''}</li>`;
        });
        html += '</ul>';
        relatorioResultado.innerHTML = html;
    } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        relatorioResultado.textContent = 'Erro ao gerar relatório.';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const sessao = verificarSessao();
    if (!sessao) return;
    lojaAtual = sessao.loja;
    carregarContagens();
});
