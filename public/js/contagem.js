import { db } from './firebase.js';
import { iniciarLeitorCamera } from './camera.js';
import { collection, getDoc, getDocs, doc, addDoc, query, where } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const usuario = sessionStorage.getItem('usuario');
const loja = sessionStorage.getItem('loja');
const contagem = sessionStorage.getItem('contagemAtual');
const etapa = sessionStorage.getItem('etapaAtual');

const localSelect = document.getElementById('selectLocal');
const busca = document.getElementById('inputBusca');
const btnSalvar = document.getElementById('btnSalvarContagem');
const btnCamera = document.getElementById('btnCamera');
const inputQtd = document.getElementById('inputQuantidade');
const infoProduto = document.getElementById('dadosItem');
const txtTipo = document.getElementById('tipoEtapaTexto');
const btnMinhas = document.getElementById('btnMinhasContagens');
const divMinhas = document.getElementById('minhasContagensResultado');

let tipoEtapa = null;
let produto = null;

txtTipo.textContent = tipoEtapa;
if (tipoEtapa === 'subcategoria') {
  document.getElementById('subcategoriaContainer').style.display = 'block';
  carregarListaPorSubcategoria();
}

(async () => {
  const d = await getDoc(doc(db, 'conferencias', loja, 'contagens', contagem, 'etapas', etapa));
  tipoEtapa = d.data().tipo;
  txtTipo.textContent = tipoEtapa;
})();

btnSalvar.onclick = async () => {
  if (!produto) return alert('Busque item');
  const qtd = parseInt(document.getElementById('inputQuantidade')?.value || '');
  const loc = localSelect.value;
  if (!qtd || !loc) return alert('Informe local e quantidade');

  if (tipoEtapa === 'subcategoria') {
    const snap = await getDocs(collection(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/listagensValidas`));
    const ok = snap.docs.some(d => d.data().itens.includes(produto.codigoProduto));
    if (!ok) return alert('Item não está na sua lista');
  }

  await addDoc(collection(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/contagens`), {
    usuario,
    local: loc,
    quantidade: qtd,
    codigoProduto: produto.codigoProduto,
    descricao: produto.descricao,
    departamento: produto.departamento,
    categoria: produto.categoria,
    subCategoria: produto.subCategoria,
    hora: new Date().toISOString()
  });

  alert('Registro gravado');
  inputQtd.value = '';
  inputQtd.focus();
};

busca.onblur = () => {
  buscarProduto(busca.value.trim());
};

async function buscarProduto(codigo) {
  const baseRef = collection(db, `conferencias/${loja}/contagens/${contagem}/baseProdutos`);
  let snap = await getDoc(doc(baseRef, codigo));

  if (!snap.exists()) {
    const q = query(baseRef, where('codigoBarras', 'array-contains', codigo));
    const qSnap = await getDocs(q);
    if (!qSnap.empty) {
      snap = qSnap.docs[0];
    } else {
      alert('Produto não encontrado');
      return;
    }
  }

  produto = snap.data();
  infoProduto.style.display = 'block';
  infoProduto.innerHTML = `
    <p><strong>Código:</strong> ${produto.codigoProduto}</p>
    <p><strong>Descrição:</strong> ${produto.descricao}</p>
    <p><strong>Departamento:</strong> ${produto.departamento}</p>
    <p><strong>Categoria:</strong> ${produto.categoria}</p>
    <p><strong>Subcategoria:</strong> ${produto.subCategoria}</p>
    <label for="inputQuantidade">Quantidade:</label>
    <input type="number" id="inputQuantidade" value="" />
    <button id="btnSalvarContagem">Salvar Contagem</button>
  `;

  document.getElementById('btnSalvarContagem').onclick = btnSalvar.onclick;
  document.getElementById('inputQuantidade').focus();
}

btnMinhas.onclick = async () => {
  const loc = localSelect.value;
  if (!loc) return alert('Selecione local');
  const ref = collection(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/contagens`);
  const q = query(ref, where('usuario', '==', usuario), where('local', '==', loc));
  const snap = await getDocs(q);

  divMinhas.innerHTML = snap.empty ? '<p>Nenhum item contado.</p>' :
    '<ul>' + snap.docs.map(d => {
      const it = d.data();
      return `<li>${it.codigoProduto} • ${it.descricao} • Qtd: ${it.quantidade}</li>`;
    }).join('') + '</ul>';
};

btnCamera.onclick = () => {
  iniciarLeitorCamera((codigoLido) => {
    buscarProduto(codigoLido);
  });
};

let listaUsuario = [];
let listaFinalizada = false;

async function carregarListaPorSubcategoria() {
  if (tipoEtapa !== 'subcategoria') return;
  const docRef = doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/listagensValidas/${usuario}`);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    listaUsuario = data.itens;
    listaFinalizada = data.finalizado;
    exibirListaSubcategoria();
  } else {
    alert('Nenhuma lista encontrada para você. Peça ao Admin.');
  }
}

function exibirListaSubcategoria() {
  const container = document.getElementById('listaSubcategoria') || criarListaContainer();
  container.innerHTML = `
    <h3>Itens da sua lista (${listaUsuario.length})</h3>
    <ul>${listaUsuario.map(cod => `<li>${cod}</li>`).join('')}</ul>
    <button id="btnFinalizarSub">Finalizar Categoria</button>`;
  document.getElementById('btnFinalizarSub').onclick = finalizarSubcategoria;
}

async function finalizarSubcategoria() {
  await setDoc(doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/listagensValidas/${usuario}`), {
    finalizado: true
  }, { merge: true });
  listaFinalizada = true;
  alert('Sua categoria foi finalizada!');
}
