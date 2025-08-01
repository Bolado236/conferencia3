import { db } from './firebase.js';
import {
  doc, setDoc, getDocs, collection
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { converterXLSXParaJSON } from './xlsxConverter.js';
import { lojas } from './lojas.js';

const btnVoltarHub = document.getElementById('btnVoltarHub');
const selLoja = document.getElementById('selectLoja');
const selTipoEtapa = document.getElementById('selectTipoEtapa');
const selLojaUsuario = document.getElementById('selectLojaUsuario');
const selContagemExistente = document.getElementById('selectContagemExistente');
const btnCriarContagem = document.getElementById('btnCriarContagemCompleta');
const btnGerarEtapa = document.getElementById('btnGerarEtapa');
const btnNovaContagem = document.getElementById('btnNovaContagem');
const nomeEtapaPadrao = 'contagem1';


// controles manuais
const ctlLoja = document.getElementById('ctlLoja');
const ctlContagem = document.getElementById('ctlContagem');
const ctlEtapa = document.getElementById('ctlEtapa');
const ctlPendentes = document.getElementById('ctlPendentes');
const btnFinalizarManual = document.getElementById('btnFinalizarManual');
const btnAdicionarItem = document.getElementById('btnAdicionarItem');
const btnAtribuirUsuario = document.getElementById('btnAtribuirUsuario');
// cadastro e relatórios
const formCadastroUsuario = document.getElementById('formCadastroUsuario');
const btnRelContados = document.getElementById('btnRelatorioItensContados');
const btnRelNao = document.getElementById('btnRelatorioItensNaoContados');
const btnRelDiv = document.getElementById('btnRelatorioDivergencias');
const relRes = document.getElementById('relatorioResultado');

let lojaAtual = sessionStorage.getItem('loja');

function populaLojas(drop){
  drop.innerHTML = lojas.map(l => `<option value="${l.codigo}">${l.codigo} - ${l.nome}</option>`).join('');
}
populaLojas(selLoja);
populaLojas(selLojaUsuario);
populaLojas(ctlLoja);

async function carregaContagens(elems){
  if (!lojaAtual) return;
  const snap = await getDocs(collection(db, 'conferencias', lojaAtual, 'contagens'));
  elems.forEach(el => {
    el.innerHTML = '<option value="">-- selecione --</option>';
    snap.forEach(d => {
      el.innerHTML += `<option value="${d.id}">${d.id}</option>`;
    });
  });
}
carregaContagens([selContagemExistente, ctlContagem]);

ctlContagem.addEventListener('change', async () => {
  ctlEtapa.innerHTML = '<option value="">-- selecione etapa --</option>';
  ctlPendentes.innerHTML = '<option value="">-- pendentes --</option>';
  const cont = ctlContagem.value;
  const snap = await getDocs(collection(db, 'conferencias', lojaAtual, 'contagens', cont, 'etapas'));
  snap.forEach(d => {
    ctlEtapa.innerHTML += `<option value="${d.id}">${d.id}</option>`;
  });
});

ctlEtapa.addEventListener('change', async () => {
  ctlPendentes.innerHTML = '<option value="">-- pendentes --</option>';
  const cont = ctlContagem.value, etapa = ctlEtapa.value;
  if (!cont || !etapa) return;
  const snap = await getDocs(collection(db, 'conferencias', lojaAtual, 'contagens', cont, 'etapas', etapa, 'pendentesDistribuir'));
  snap.forEach(d => {
    const data = d.data();
    ctlPendentes.innerHTML += `<option value="${d.id}">${data.subcategoria} (${data.itens.length})</option>`;
  });
});


btnVoltarHub.addEventListener('click', () => window.location.href = 'hub.html');

btnNovaContagem.addEventListener('click', () => {
  const form = document.getElementById('formNovaContagem');
  form.style.display = (form.style.display === 'none' || form.style.display === '') ? 'block' : 'none';
});

btnCriarContagem.addEventListener('click', async () => {
  const loja = selLoja.value;
  const nome = document.getElementById('inputNomeContagem').value.trim().replace(/\s+/g, "_");
  const modelo = document.getElementById('selectModelo').value;
  const file = document.getElementById('inputXLSX').files[0];
  if (!loja||!nome||!modelo||!file) return alert("Preencha todos os campos!");
  try {
    const base = await converterXLSXParaJSON(file);
    const contRef = doc(db, 'conferencias', loja, 'contagens', nome);
    const etapaRef = doc(db, 'conferencias', loja, 'contagens', nome, 'etapas', nomeEtapaPadrao);
    await setDoc(contRef, { criadaEm: new Date().toISOString(), etapaAtual: nomeEtapaPadrao });
    await setDoc(etapaRef, { tipo: modelo, criadaEm: new Date().toISOString() });
    for (const it of base) {
      const pRef = doc(db, 'conferencias', loja, 'contagens', nome, 'baseProdutos', it.codigoProduto);
      await setDoc(pRef, it);
    }
    sessionStorage.setItem('loja', loja);
    sessionStorage.setItem('contagemAtual', nome);
    alert("Contagem criada com sucesso!");
    carregaContagens([selContagemExistente, ctlContagem]);
  } catch (err) {
    alert("Erro na criação: " + err.message);
    console.error(err);
  }
});

btnGerarEtapa.addEventListener('click', async () => {
  const contagem = selContagemExistente.value;
  const tipo = selTipoEtapa.value?.trim();
  const nomeEtapa = prompt("Nome da nova etapa (ex: contagem2):")?.replace(/\s+/g,"_");
  if (!contagem||!tipo||!nomeEtapa) return alert("Todos os campos são obrigatórios!");
  await setDoc(doc(db, 'conferencias', lojaAtual, 'contagens', contagem), { etapaAtual: nomeEtapa }, { merge: true });
  await setDoc(doc(db, 'conferencias', lojaAtual, 'contagens', contagem, 'etapas', nomeEtapa), {
    tipo, criadaEm: new Date().toISOString()
  });

  if (tipo === 'subcategoria') {
    console.log("🔍 Buscando divergentes...");
    const diverg = await getItensDivergentes(lojaAtual, contagem);
    console.log("📊 Resultado de divergência:", diverg);
    const buckets = {};
    diverg.forEach(it => {
      const subKey = sanitizeId(it.subCategoria || 'SEM_SUB');
      if (!buckets[subKey]) buckets[subKey] = { subcategoria: it.subCategoria||'SEM_SUB', itens: [], status: {} };
      buckets[subKey].itens.push(it.codigoProduto);
      buckets[subKey].status[it.codigoProduto] = it.status;
    });
    for (const sub in buckets) {
      await setDoc(
        doc(db, `conferencias/${lojaAtual}/contagens/${contagem}/etapas/${nomeEtapa}/pendentesDistribuir/${sub}`),
        { ...buckets[sub], atribuidoPara: null, finalizada: false, criadoEm: new Date().toISOString() },
        { merge: true }
      );
    }
  }

  alert("Nova etapa gerada!");
  carregaContagens([selContagemExistente, ctlContagem]);
});

function sanitizeId(str) {
  return (str || '').replaceAll('/', '__');
}

async function getItensDivergentes(loja, contagem) {
  const resultado = [];
  const baseSnap = await getDocs(collection(db, 'conferencias', loja, 'contagens', contagem, 'baseProdutos'));

  for (const docSnap of baseSnap.docs) {
    const prod = docSnap.data();
    let total = 0;

    const etapasSnap = await getDocs(collection(db, 'conferencias', loja, 'contagens', contagem, 'etapas'));
    for (const etapaDoc of etapasSnap.docs) {
      const etapaId = etapaDoc.id;
      const contagensRef = collection(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapaId}/contagens`);
      const q = query(contagensRef, where('codigoProduto', '==', prod.codigoProduto));
      const snap = await getDocs(q);
      snap.forEach(doc => {
        total += Number(doc.data().quantidade || 0);
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

btnFinalizarManual.onclick = async () => {
  const cont = ctlContagem.value, etapa = ctlEtapa.value, pend = ctlPendentes.value;
  if (!cont || !etapa || !pend) return alert('Selecione todos os campos!');
  await setDoc(doc(db, `conferencias/${lojaAtual}/contagens/${cont}/etapas/${etapa}/pendentesDistribuir/${pend}`), {
    finalizada: true,
    finalizadoPor: 'admin',
    finalizadoEm: new Date().toISOString()
  }, { merge: true });
  alert('Finalizado manualmente');
};

btnAdicionarItem.onclick = async () => {
  const cont = ctlContagem.value, etapa = ctlEtapa.value, pend = ctlPendentes.value;
  const codigo = prompt('Informe o código do produto:')?.trim();
  if (!cont || !etapa || !pend || !codigo) return alert('Preencha tudo!');
  const ref = doc(db, `conferencias/${lojaAtual}/contagens/${cont}/etapas/${etapa}/pendentesDistribuir/${pend}`);
  const docSnap = await getDoc(ref);
  const dados = docSnap.data();
  dados.itens = Array.from(new Set([...(dados.itens || []), codigo]));
  dados.status = { ...dados.status, [codigo]: 'divergente' };
  await setDoc(ref, dados, { merge: true });
  alert('Item adicionado!');
};

btnRemoverAtrib.onclick = async () => {
  const cont = ctlContagem.value, etapa = ctlEtapa.value, pend = ctlPendentes.value;
  if (!cont || !etapa || !pend) return alert('Selecione todos os campos!');
  await setDoc(doc(db, `conferencias/${lojaAtual}/contagens/${cont}/etapas/${etapa}/pendentesDistribuir/${pend}`), {
    atribuidoPara: null
  }, { merge: true });
  alert('Atribuição removida');
};

btnAtribuirUsuario.onclick = async () => {
  const cont = ctlContagem.value, etapa = ctlEtapa.value, pend = ctlPendentes.value;
  if (!cont || !etapa || !pend) return alert('Preencha todos os campos');
  const usuario = prompt("Usuário para atribuição:")?.trim();
  if (!usuario) return alert('Usuário inválido');

  // Atualiza a pendenteDistribuir
  await setDoc(doc(db, `conferencias/${lojaAtual}/contagens/${cont}/etapas/${etapa}/pendentesDistribuir/${pend}`), {
    atribuidoPara: usuario
  }, { merge: true });

  // Cria a lista do usuário
  const pendSnap = await getDoc(doc(db, `conferencias/${lojaAtual}/contagens/${cont}/etapas/${etapa}/pendentesDistribuir/${pend}`));
  const dados = pendSnap.data();

  await setDoc(doc(db, `conferencias/${lojaAtual}/contagens/${cont}/etapas/${etapa}/listagensValidas/${usuario}`), {
    itens: dados.itens,
    subCategoria: dados.subcategoria || pend,
    finalizado: false,
    atribuidaManualmente: true,
    atribuidaEm: new Date().toISOString()
  });

  alert('Subcategoria atribuída ao usuário!');
};

btnVoltarHub.addEventListener('click', () => {
  window.location.href = 'hub.html';
});
