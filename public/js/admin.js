import { db } from './firebase.js';
import {
  doc, setDoc, getDocs, collection, query, where
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { converterXLSXParaJSON } from './xlsxConverter.js';
import { lojas } from './lojas.js';

const btnVoltarHub = document.getElementById('btnVoltarHub');
const selLoja = document.getElementById('selectLoja');
const selLojaUsuario = document.getElementById('selectLojaUsuario');
const selContagemExistente = document.getElementById('selectContagemExistente');
const btnCriarContagem = document.getElementById('btnCriarContagemCompleta');
const btnGerarEtapa = document.getElementById('btnGerarEtapa');
const btnNovaContagem = document.getElementById('btnNovaContagem');
const nomeEtapaPadrao = 'contagem1';

let lojaAtual = sessionStorage.getItem('loja');

function populaLojas(dropdown) {
  dropdown.innerHTML = lojas.map(l => `<option value="${l.codigo}">${l.codigo} - ${l.nome}</option>`).join('');
}
populaLojas(selLoja);
populaLojas(selLojaUsuario);

function sanitizeId(str) {
  return str.replaceAll('/', '__');
}

async function carregaContagens() {
  if (!lojaAtual) return;
  selContagemExistente.innerHTML = '<option value="">-- selecione contagem --</option>';
  const snap = await getDocs(collection(db, 'conferencias', lojaAtual, 'contagens'));
  snap.forEach(d => {
    selContagemExistente.innerHTML += `<option value="${d.id}">${d.id}</option>`;
  });
}
carregaContagens();

btnNovaContagem.addEventListener('click', () => {
  const form = document.getElementById('formNovaContagem');
  form.style.display = (form.style.display === 'none' || form.style.display === '') ? 'block' : 'none';
});

btnCriarContagem.addEventListener('click', async () => {
  const loja = selLoja.value;
  const nome = document.getElementById('inputNomeContagem').value.trim().replace(/\s+/g, "_");
  const modelo = document.getElementById('selectModelo').value;
  const file = document.getElementById('inputXLSX').files[0];

  if (!loja || !nome || !modelo || !file) return alert("Preencha todos os campos!");

  try {
    const base = await converterXLSXParaJSON(file);
    const contagemRef = doc(db, 'conferencias', loja, 'contagens', nome);
    const etapaRef = doc(db, 'conferencias', loja, 'contagens', nome, 'etapas', nomeEtapaPadrao);

    await setDoc(contagemRef, {
      criadaEm: new Date().toISOString(),
      etapaAtual: nomeEtapaPadrao
    });

    await setDoc(etapaRef, {
      tipo: modelo,
      criadaEm: new Date().toISOString()
    });

    for (const it of base) {
      const pRef = doc(db, 'conferencias', loja, 'contagens', nome, 'baseProdutos', it.codigoProduto);
      await setDoc(pRef, it);
    }

    sessionStorage.setItem('loja', loja);
    sessionStorage.setItem('contagemAtual', nome);
    alert("Contagem criada com sucesso!");
    carregaContagens();

  } catch (err) {
    alert("Erro na criação: " + err.message);
    console.error(err);
  }
});

btnGerarEtapa.addEventListener('click', async () => {
  const contagem = selContagemExistente.value;
  const nomeEtapa = prompt("Nome da nova etapa (ex: contagem2):")?.trim().replace(/\s+/g, "_");
  const tipo = document.getElementById('selectTipoEtapa')?.value?.trim();
  if (!contagem || !nomeEtapa || !tipo) return alert("Todos os campos são obrigatórios!");

  const loja = lojaAtual;

  await setDoc(doc(db, 'conferencias', loja, 'contagens', contagem), {
    etapaAtual: nomeEtapa
  }, { merge: true });

  await setDoc(doc(db, 'conferencias', loja, 'contagens', contagem, 'etapas', nomeEtapa), {
    tipo,
    criadaEm: new Date().toISOString()
  });

  if (tipo === 'subcategoria') {
    console.log("🔍 Buscando divergentes...");
    const divergentes = await getItensDivergentes(loja, contagem);
    console.log("📊 Resultado de divergência:", divergentes);

    const buckets = {};
    divergentes.forEach(it => {
      const subKey = sanitizeId(it.subCategoria || 'SEM_SUB');
      if (!buckets[subKey]) {
        buckets[subKey] = {
          subcategoria: it.subCategoria || 'SEM_SUB',
          itens: [],
          status: {},
          atribuidoPara: null,
          finalizada: false,
          criadoEm: new Date().toISOString()
        };
      }
      buckets[subKey].itens.push(it.codigoProduto);
      buckets[subKey].status[it.codigoProduto] = it.status;
    });

    for (const subKey in buckets) {
      const sub = buckets[subKey];
      console.log(`📦 Gravando subcategoria "${sub.subcategoria}" com ${sub.itens.length} itens`);
      await setDoc(
        doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${nomeEtapa}/pendentesDistribuir/${subKey}`),
        sub,
        { merge: true }
      );
    }
  }

  alert("Nova etapa gerada!");
  carregaContagens();
});

async function getItensDivergentes(loja, contagem) {
  const resultado = [];
  const baseSnap = await getDocs(collection(db, 'conferencias', loja, 'contagens', contagem, 'baseProdutos'));

  for (const docSnap of baseSnap.docs) {
    const prod = docSnap.data();
    let total = 0;

    const etapasSnap = await getDocs(collection(db, `conferencias/${loja}/contagens/${contagem}/etapas`));
    for (const etapaDoc of etapasSnap.docs) {
      const etapaId = etapaDoc.id;
      const contagensRef = collection(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapaId}/contagens`);
      const q = query(contagensRef, where('codigoProduto', '==', prod.codigoProduto));
      const snap = await getDocs(q);
      snap.forEach(doc => {
        const qtd = doc.data().quantidade;
        total += Number(qtd || 0);
      });
    }

    const divergente = prod.quantidade !== total;
    resultado.push({
      codigoProduto: prod.codigoProduto,
      subCategoria: prod.subCategoria,
      status: divergente ? 'divergente' : 'finalizado'
    });
  }

  return resultado;
}

btnVoltarHub.addEventListener('click', () => {
  window.location.href = 'hub.html';
});
