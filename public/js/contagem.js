import { db } from './firebase.js';
import { collection, doc, setDoc, getDoc, updateDoc, arrayUnion, getDocs } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { normalizarString } from './helpers.js';

const inputBusca = document.getElementById('inputBusca');
const resultadosBusca = document.getElementById('resultadosBusca');
const formContagem = document.getElementById('formContagem');

const codigoProdutoSpan = document.getElementById('codigoProduto');
const descricaoProdutoSpan = document.getElementById('descricaoProduto');
const estoqueAtualSpan = document.getElementById('estoqueAtual');
const departamentoSpan = document.getElementById('departamento');
const categoriaSpan = document.getElementById('categoria');
const subCategoriaSpan = document.getElementById('subCategoria');
const disponibilidadeSpan = document.getElementById('disponibilidade');

let baseProdutos = [];
let produtoSelecionado = null;
let lojaAtual = null;
let contagemAtual = null;
let usuarioAtual = null;

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

async function carregarBaseProdutos() {
    if (!lojaAtual || !contagemAtual) return;
    try {
        const baseRef = doc(db, 'conferencias', lojaAtual, contagemAtual, 'baseProdutos');
        const baseSnap = await getDoc(baseRef);
        if (baseSnap.exists()) {
            baseProdutos = baseSnap.data().produtos || [];
        } else {
            baseProdutos = [];
        }
    } catch (error) {
        console.error('Erro ao carregar base de produtos:', error);
        baseProdutos = [];
    }
}

function limparSelecaoProduto() {
    produtoSelecionado = null;
    codigoProdutoSpan.textContent = '';
    descricaoProdutoSpan.textContent = '';
    estoqueAtualSpan.textContent = '';
    departamentoSpan.textContent = '';
    categoriaSpan.textContent = '';
    subCategoriaSpan.textContent = '';
    disponibilidadeSpan.textContent = '';
    formContagem.localContagem.value = '';
    formContagem.quantidadeContada.value = '';
}

function exibirProduto(produto) {
    produtoSelecionado = produto;
    codigoProdutoSpan.textContent = produto.codigoProduto || '';
    descricaoProdutoSpan.textContent = produto.descricao || '';
    estoqueAtualSpan.textContent = produto.quantidade || '';
    departamentoSpan.textContent = produto.departamento || '';
    categoriaSpan.textContent = produto.categoria || '';
    subCategoriaSpan.textContent = produto.subcategoria || '';
    disponibilidadeSpan.textContent = produto.disponibilidade || '';
}

function buscarProdutos(termo) {
    const termoNormalizado = normalizarString(termo);
    if (!termoNormalizado) {
        resultadosBusca.innerHTML = '';
        return;
    }
    const resultados = baseProdutos.filter(prod => {
        const codigosBarras = prod.codigobarras || [];
        const descricao = normalizarString(prod.descricao || '');
        const codigoProduto = (prod.codigoProduto || '').toString();

        // Busca por código de barras, código do produto ou descrição
        return (
            codigosBarras.some(cb => cb.includes(termoNormalizado)) ||
            codigoProduto.includes(termoNormalizado) ||
            descricao.includes(termoNormalizado)
        );
    });

    resultadosBusca.innerHTML = '';
    resultados.forEach(prod => {
        const li = document.createElement('li');
        li.textContent = `${prod.codigoProduto} - ${prod.descricao}`;
        li.style.cursor = 'pointer';
        li.addEventListener('click', () => {
            exibirProduto(prod);
            resultadosBusca.innerHTML = '';
        });
        resultadosBusca.appendChild(li);
    });
}

async function registrarContagem(event) {
    event.preventDefault();
    if (!produtoSelecionado) {
        alert('Selecione um produto antes de registrar a contagem.');
        return;
    }
    const localContagem = formContagem.localContagem.value.trim();
    const quantidadeContada = parseInt(formContagem.quantidadeContada.value, 10);

    if (!localContagem) {
        alert('Informe o local da contagem.');
        return;
    }
    if (isNaN(quantidadeContada) || quantidadeContada < 0) {
        alert('Informe uma quantidade válida.');
        return;
    }
    if (!lojaAtual || !contagemAtual || !usuarioAtual) {
        alert('Sessão inválida. Faça login novamente.');
        window.location.href = 'login.html';
        return;
    }

    try {
        const contagemRef = doc(db, 'conferencias', lojaAtual, contagemAtual, 'contagem1');
        const produtoDocRef = doc(contagemRef, produtoSelecionado.codigoProduto);
        const leitura = {
            quantidade: quantidadeContada,
            local: localContagem,
            usuario: usuarioAtual,
            horario: new Date().toISOString()
        };

        // Armazena múltiplas leituras por item usando arrayUnion
        await updateDoc(produtoDocRef, {
            leituras: arrayUnion(leitura)
        }).catch(async (error) => {
            // Se o documento não existir, cria com a primeira leitura
            if (error.code === 'not-found') {
                await setDoc(produtoDocRef, {
                    leituras: [leitura]
                });
            } else {
                throw error;
            }
        });

        alert('Contagem registrada com sucesso.');
        limparSelecaoProduto();
    } catch (error) {
        console.error('Erro ao registrar contagem:', error);
        alert('Erro ao registrar contagem.');
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const sessao = verificarSessao();
    if (!sessao) return;
    lojaAtual = sessao.loja;
    usuarioAtual = sessao.usuario;
    contagemAtual = 'contagem1'; // Pode ser parametrizado conforme o modelo

    await carregarBaseProdutos();

    inputBusca.addEventListener('input', () => {
        buscarProdutos(inputBusca.value);
    });

    formContagem.addEventListener('submit', registrarContagem);
});
