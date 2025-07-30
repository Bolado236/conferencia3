import { db } from './firebase.js';
import { iniciarLeitorCamera } from './camera.js';
import {
  collection, doc, getDoc, getDocs,
  addDoc, query, where, setDoc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';

const usuario = sessionStorage.getItem('usuario');
const loja = sessionStorage.getItem('loja');
const contagem = sessionStorage.getItem('contagemAtual');
const etapa = sessionStorage.getItem('etapaAtual');

const btnVoltarHub = document.getElementById('btnVoltarHub');
const localSelect = document.getElementById('selectLocal');
const busca = document.getElementById('inputBusca');
const btnCamera = document.getElementById('btnCamera');
const txtTipo = document.getElementById('tipoEtapaTexto');
const btnMinhas = document.getElementById('btnMinhasContagens');
const divMinhas = document.getElementById('minhasContagensResultado');
const infoProduto = document.getElementById('dadosItem');
const btnNovaListaSub = document.createElement('button');
btnNovaListaSub.id = 'btnNovaListaSub';
btnNovaListaSub.textContent = 'Nova Lista';
const btnFinalizar = document.getElementById('btnFinalizarSub');

let tipoEtapa = null, produto = null, listaUsuario = [], listaFinalizada = false;
let subCategoriaAtual = null;

function sanitizeId(str) {
  return (str || '').replaceAll('/', '__');
}

btnVoltarHub.onclick = () => window.location.href = 'hub.html';

(async () => {
  const d = await getDoc(doc(db, 'conferencias', loja, 'contagens', contagem, 'etapas', etapa));
  tipoEtapa = d.data().tipo;
  txtTipo.textContent = tipoEtapa;

  const sec = document.getElementById('formularioContagem');
  if (tipoEtapa === 'subcategoria') {
    document.getElementById('subcategoriaContainer').style.display = 'block';
    sec.appendChild(btnNovaListaSub);
    btnNovaListaSub.onclick = puxarNovaListaSubcategoria;
    btnFinalizar.onclick = finalizarSubcategoria;
    carregarListaPorSubcategoria();
  }
})();

busca.onblur = () => buscarProduto(busca.value.trim());
document.getElementById('btnBuscarItem').onclick = () => buscarProduto(busca.value.trim());
btnCamera.onclick = () => iniciarLeitorCamera(c => buscarProduto(c));

btnMinhas.onclick = async () => {
  const loc = localSelect.value;
  if (!loc) return alert('Selecione local');
  const ref = collection(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/contagens`);
  const q = query(ref, where('usuario', '==', usuario), where('local', '==', loc));
  const snap = await getDocs(q);
  divMinhas.innerHTML = snap.empty
    ? '<p>Nenhum item contado.</p>'
    : '<ul>' + snap.docs.map(d => {
        const it = d.data();
        return `<li>${it.codigoProduto} • ${it.descricao} • Qtd: ${it.quantidade}</li>`;
      }).join('') + '</ul>';
};

async function buscarProduto(codigo) {
  const baseRef = collection(db, `conferencias/${loja}/contagens/${contagem}/baseProdutos`);
  let snap = await getDoc(doc(baseRef, codigo));

  if (!snap.exists()) {
    const q = query(baseRef, where('codigoBarras', 'array-contains', codigo));
    const qSnap = await getDocs(q);
    if (qSnap.empty) return alert('Produto não encontrado');
    snap = qSnap.docs[0];
  }

  produto = snap.data();
  exibirProdutoEInput();
}

function exibirProdutoEInput() {
  infoProduto.style.display = 'block';
  infoProduto.innerHTML = `
    <p><strong>Código:</strong> ${produto.codigoProduto}</p>
    <p><strong>Descrição:</strong> ${produto.descricao}</p>
    <p><strong>Departamento:</strong> ${produto.departamento}</p>
    <p><strong>Categoria:</strong> ${produto.categoria}</p>
    <p><strong>Subcategoria:</strong> ${produto.subCategoria}</p>
    <label>Quantidade:</label>
    <input type="number" id="inputQuantidade" />
    <button id="btnSalvarContagem">Salvar Contagem</button>
  `;
  document.getElementById('btnSalvarContagem').onclick = salvarContagem;
  document.getElementById('inputQuantidade').focus();
}

async function salvarContagem() {
  if (!produto) return alert('Busque item');
  const qtd = parseInt(document.getElementById('inputQuantidade')?.value || '');
  const loc = localSelect.value;
  if (!qtd || !loc) return alert('Informe local e quantidade');

  if (tipoEtapa === 'subcategoria') {
    const docRef = doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/listagensValidas/${usuario}`);
    const docSnap = await getDoc(docRef);
    const dados = docSnap.data();
    if (!dados?.itens.includes(produto.codigoProduto)) {
      return alert('Item não está na sua lista');
    }
  }

  const contagemPath = `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/contagens`;
  await addDoc(collection(db, contagemPath), {
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

  const resumoRef = doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/resumo/${produto.codigoProduto}`);
  const snapResumo = await getDoc(resumoRef);
  const atual = snapResumo.exists() ? snapResumo.data().quantidade : 0;
  await setDoc(resumoRef, {
    quantidade: atual + qtd,
    descricao: produto.descricao,
    categoria: produto.categoria,
    subCategoria: produto.subCategoria,
    atualizadoEm: new Date().toISOString()
  }, { merge: true });

  alert('Registro gravado');
  document.getElementById('inputQuantidade').value = '';
  document.getElementById('inputQuantidade').focus();
}

function exibirListaSubcategoria() {
  const container = document.getElementById('listaSubcategoria');
  if (!container) {
    console.warn("⚠️ Elemento #listaSubcategoria não encontrado no DOM!");
    return;
  }

  if (!Array.isArray(listaUsuario)) {
    console.warn("⚠️ Lista de usuário inválida:", listaUsuario);
    return;
  }

  // Força a visibilidade e atualiza a lista
  container.style.display = 'block';
  container.innerHTML = `
    <h3>Subcategoria atribuída (${listaUsuario.length} itens)</h3>
    <ul>
      ${listaUsuario.map(cod => `<li>${cod}</li>`).join('')}
    </ul>
  `;

  console.log("✅ Lista exibida no HTML.");
}

async function puxarNovaListaSubcategoria() {
  const snap = await getDocs(collection(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/pendentesDistribuir`));
  
  let pendenteEscolhido = null;
  let subId = null;
  let itensDivergentes = [];

  for (const docSnap of snap.docs) {
    const dados = docSnap.data();
    if (dados.finalizada || dados.atribuidoPara) continue;

    const divergentes = dados.itens.filter(cod => dados.status[cod] === 'divergente');
    if (divergentes.length > 0) {
      pendenteEscolhido = docSnap;
      itensDivergentes = divergentes;
      subId = sanitizeId(docSnap.id);
      break;
    }
  }

  if (!pendenteEscolhido) {
    return alert('Não há mais subcategorias com itens divergentes');
  }

  // Marcar como atribuído no Firestore
  await setDoc(doc(db, pendenteEscolhido.ref.path), {
    atribuido: true,
    atribuidoPara: usuario
  }, { merge: true });

  // Criar listagem para o usuário com apenas itens divergentes
  await setDoc(doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/listagensValidas/${usuario}`), {
    subcategoria: subId,
    itens: itensDivergentes,
    finalizado: false,
    criadaEm: new Date().toISOString()
  });

  // Limpa produto anterior
  produto = null;
  infoProduto.style.display = 'none';
  infoProduto.innerHTML = '';

  // Atualiza interface
  listaUsuario = itensDivergentes;
  listaFinalizada = false;
  exibirListaSubcategoria();

  console.log("✅ Nova lista atribuída com divergentes:", subId);
}

async function atribuirSubcategoriaParaUsuario() {
  const pendRef = collection(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/pendentesDistribuir`);
  const snap = await getDocs(pendRef);
  const disponiveis = snap.docs.filter(d => {
    const data = d.data();
    return !data.finalizada && !data.atribuidoPara;
  });

  if (disponiveis.length === 0) {
    alert("Nenhuma subcategoria disponível.");
    return [];
  }

  const escolhido = disponiveis[0];
  const sub = escolhido.data().subcategoria || escolhido.id;

  await setDoc(escolhido.ref, { atribuidoPara: usuario }, { merge: true });

  await setDoc(doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/listagensValidas/${usuario}`), {
    itens: escolhido.data().itens,
    finalizado: false,
    subcategoria: sub
  });

  subCategoriaAtual = sub;
  return escolhido.data().itens;
}

async function carregarListaPorSubcategoria() {
  const ref = doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/listagensValidas/${usuario}`);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const itens = await atribuirSubcategoriaParaUsuario();
    if (!itens.length) return;
    listaUsuario = itens;
  } else {
    const data = snap.data();
    listaUsuario = data.itens;
    listaFinalizada = data.finalizado;
    subCategoriaAtual = data.subcategoria;
  }

  exibirListaSubcategoria();
}

async function finalizarSubcategoria() {
  const userListRef = doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/listagensValidas/${usuario}`);
  const userSnap = await getDoc(userListRef);
  const sub = userSnap.data().subcategoria;
  const subId = sanitizeId(sub);

  const pendRef = doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/pendentesDistribuir/${subId}`);
  await setDoc(pendRef, {
    finalizada: true,
    finalizadoPor: usuario,
    finalizadoEm: new Date().toISOString()
  }, { merge: true });

  await setDoc(userListRef, {
    finalizado: true
  }, { merge: true });

  listaFinalizada = true;
  alert('Sua categoria foi finalizada!');
  btnFinalizar.disabled = true;
}
