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

  if (tipoEtapa === 'subcategoria') {
    document.getElementById('subcategoriaContainer').style.display = 'block';
    document.getElementById('formularioContagem').appendChild(btnNovaListaSub);
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

// function exibirListaSubcategoria() {
//   const container = document.getElementById('listaSubcategoria');
//   const infoSub = document.getElementById('infoSubcategoria');
//   if (!container || !infoSub) return console.warn("⚠️ Elementos DOM não encontrados.");

//   const nomeSub = (subCategoriaAtual || '').replaceAll('__', '/');
//   infoSub.textContent = `🔎 Subcategoria atual: ${nomeSub}`;

//   container.innerHTML = `
//     <h3>${listaUsuario.length} itens atribuídos</h3>
//     <ul>${listaUsuario.map(cod => `<li>${cod}</li>`).join('')}</ul>
//   `;
// }

async function exibirListaSubcategoria() {
  const container = document.getElementById('listaSubcategoria');
  const infoSub = document.getElementById('infoSubcategoria');
  if (!container || !infoSub) return console.warn("⚠️ Elementos DOM não encontrados.");

  const nomeSub = (subCategoriaAtual || '').replaceAll('__', '/');
  infoSub.textContent = `🔎 Subcategoria atual: ${nomeSub}`;

  // ⚠️ Buscar as descrições dos produtos
  const baseRef = collection(db, `conferencias/${loja}/contagens/${contagem}/baseProdutos`);
  const descricaoMap = {};

  for (const cod of listaUsuario) {
    const snap = await getDoc(doc(baseRef, cod));
    descricaoMap[cod] = snap.exists() ? snap.data().descricao : '(sem descrição)';
  }

  // Montar a lista com códigos e descrições
  container.innerHTML = `
    <h3>${listaUsuario.length} itens atribuídos</h3>
    <ul>
      ${listaUsuario.map(cod => `<li><strong>${cod}</strong> - ${descricaoMap[cod]}</li>`).join('')}
    </ul>
  `;
}

async function puxarNovaListaSubcategoria() {
  const userRef = doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/listagensValidas/${usuario}`);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists() && userSnap.data().finalizado === false) {
    return alert("Finalize sua atual lista antes de puxar outra.");
  }

  const snap = await getDocs(collection(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/pendentesDistribuir`));
  const pendente = snap.docs.find(d => {
    const ddata = d.data();
    if (ddata.finalizada || ddata.atribuidoPara) return false;
    const diverg = ddata.itens.filter(c => ddata.status[c] === 'divergente');
    return diverg.length > 0;
  });
  if (!pendente) {
    return alert('Não há mais subcategorias com itens divergentes disponíveis.');
  }

  subCategoriaAtual = sanitizeId(pendente.id);
  const itens = pendente.data().itens.filter(c => pendente.data().status[c] === 'divergente');
  console.log("⭐ Atribuindo nova sub:", subCategoriaAtual, itens);

  await setDoc(pendente.ref, { atribuidoPara: usuario }, { merge: true });
  await setDoc(userRef, {
    subCategoria: subCategoriaAtual,
    itens,
    finalizado: false,
    criadaEm: new Date().toISOString()
  });

  listaUsuario = itens;
  listaFinalizada = false;
  exibirListaSubcategoria();
}

async function carregarListaPorSubcategoria() {
  const ref = doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/listagensValidas/${usuario}`);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    const itens = await puxarNovaListaSubcategoria();
    if (!itens || !itens.length) return;
    listaUsuario = itens;
  } else {
    const data = snap.data();
    listaUsuario = data.itens || [];
    listaFinalizada = data.finalizado;
    subCategoriaAtual = data.subCategoria;
  }

  exibirListaSubcategoria();
}

async function finalizarSubcategoria() {
  const userListRef = doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/listagensValidas/${usuario}`);
  const userSnap = await getDoc(userListRef);
  const sub = userSnap.data().subCategoria;
  const subId = sanitizeId(sub);

  const pendRef = doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapa}/pendentesDistribuir/${subId}`);
  await setDoc(pendRef, {
    finalizada: true,
    finalizadoPor: usuario,
    finalizadoEm: new Date().toISOString()
  }, { merge: true });

  await setDoc(userListRef, { finalizado: true }, { merge: true });

  listaFinalizada = true;
  btnFinalizar.disabled = true;
  alert('Sua categoria foi finalizada!');
}
