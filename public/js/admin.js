import { db } from './firebase.js';
import { doc, setDoc, getDocs, collection } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { converterXLSXParaJSON } from './xlsxConverter.js';
import { lojas } from './lojas.js';

const selLoja = document.getElementById('selectLoja');
const selLojaUsuario = document.getElementById('selectLojaUsuario');
const selContagemExistente = document.getElementById('selectContagemExistente');
const btnCriarContagem = document.getElementById('btnCriarContagemCompleta');
const btnGerarEtapa = document.getElementById('btnGerarEtapa');

let lojaAtual = sessionStorage.getItem('loja');
const nomeEtapaPadrao = 'contagem1';

function populaLojas(drop) {
  drop.innerHTML = lojas.map(l => `<option value="${l.codigo}">${l.codigo} - ${l.nome}</option>`).join('');
}
populaLojas(selLoja);
populaLojas(selLojaUsuario);

async function carregaContagens() {
  if (!lojaAtual) return;
  selContagemExistente.innerHTML = '<option value="">-- selecione contagem --</option>';
  const snap = await getDocs(collection(db, 'conferencias', lojaAtual, 'contagens'));
  snap.forEach(d => {
    selContagemExistente.innerHTML += `<option value="${d.id}">${d.id}</option>`;
  });
}
carregaContagens();

btnCriarContagem.addEventListener('click', async () => {
  const loja = selLoja.value;
  const nome = document.getElementById('inputNomeContagem').value.trim().replace(/\s+/g, "_");
  const modelo = document.getElementById('selectModelo').value;
  const file = document.getElementById('inputXLSX').files[0];
  if (!loja || !nome || !modelo || !file) return alert("Preencha campos!");

  const base = await converterXLSXParaJSON(file);
  const contagemRef = doc(db, 'conferencias', loja, 'contagens', nome);
  await setDoc(contagemRef, { criadaEm: new Date().toISOString(), etapaAtual: nomeEtapaPadrao });

  const etapaRef = doc(db, 'conferencias', loja, 'contagens', nome, 'etapas', nomeEtapaPadrao);
  await setDoc(etapaRef, { tipo: modelo, criadaEm: new Date().toISOString() });

  for (const it of base) {
    await setDoc(doc(db, contagemRef.path + `/baseProdutos/${it.codigoProduto}`), it);
  }
  sessionStorage.setItem('loja', loja);
  alert("Contagem criada e etapa inicial gravada!");
  carregaContagens();
});

btnGerarEtapa.addEventListener('click', async () => {
  const contagem = selContagemExistente.value;
  const nomeEtapa = prompt("Nome da nova etapa (ex: contagem2):").trim().replace(/\s+/g, "_");
  if (!contagem || !nomeEtapa) return alert("Selecione contagem e defina nome!");
  const loja = lojaAtual;

  await setDoc(doc(db, 'conferencias', loja, 'contagens', contagem), { etapaAtual: nomeEtapa }, { merge: true });
  await setDoc(doc(db, 'conferencias', loja, 'contagens', contagem, 'etapas', nomeEtapa), {
    tipo: prompt("Tipo de etapa ('cegas' ou 'subcategoria')"),
    criadaEm: new Date().toISOString()
  });

  alert("Nova etapa criada e ativada!");
  carregaContagens();
});

document.getElementById('btnNovaContagem').addEventListener('click', () => {
  const form = document.getElementById('formNovaContagem');
  form.style.display = form.style.display === 'none' ? 'block' : 'none';
});
