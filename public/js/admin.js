import { db } from './firebase.js';
import { doc, setDoc, getDocs, collection } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { converterXLSXParaJSON } from './xlsxConverter.js';
import { lojas } from './lojas.js';

const btnVoltarHub = document.getElementById('btnVoltarHub');
const btnNovaContagem = document.getElementById('btnNovaContagem');
const formNovaContagem = document.getElementById('formNovaContagem');
const selectLoja = document.getElementById('selectLoja');
const inputNomeContagem = document.getElementById('inputNomeContagem');
const inputXLSX = document.getElementById('inputXLSX');
const selectModelo = document.getElementById('selectModelo');
const btnCriarContagemCompleta = document.getElementById('btnCriarContagemCompleta');
const selectContagemExistente = document.getElementById('selectContagemExistente');
const btnGerarEtapa = document.getElementById('btnGerarEtapa');
const msgEtapa = document.getElementById('msgEtapa');
const formCadastroUsuario = document.getElementById('formCadastroUsuario');
const selectLojaUsuario = document.getElementById('selectLojaUsuario');

let lojaAtual = null;

btnVoltarHub.addEventListener("click", () => window.location.href = 'hub.html');
btnNovaContagem.addEventListener("click", () => formNovaContagem.style.display = "block");

// Popula dropdowns de loja
function populaLojas(dropdown) {
  dropdown.innerHTML = `<option value="geral">Geral (Todas as lojas)</option>` +
    lojas.map(l => `<option value="${l.codigo}">${l.codigo} - ${l.nome}</option>`).join('');
}
populaLojas(selectLoja);
populaLojas(selectLojaUsuario);

// Carrega contagens existentes para gerar etapa
async function carregaContagensExistentes() {
  const loja = sessionStorage.getItem("loja");
  if (!loja) return;
  selectContagemExistente.innerHTML = '<option value="">-- Selecione contagem --</option>';
  const snap = await getDocs(collection(db, 'conferencias', loja, 'contagens'));
  snap.forEach(docSnap => {
    selectContagemExistente.innerHTML += `<option value="${docSnap.id}">${docSnap.id}</option>`;
  });
}
carregaContagensExistentes();

btnCriarContagemCompleta.addEventListener("click", async () => {
  const loja = selectLoja.value;
  const nome = inputNomeContagem.value.trim().replace(/\s+/g, "_");
  const modelo = selectModelo.value;
  const file = inputXLSX.files[0];
  if (!loja || !nome || !modelo || !file) return alert("Preencha todos os campos!");

  const base = await converterXLSXParaJSON(file);
  await setDoc(doc(db, `conferencias/${loja}/contagens/${nome}`), { criadaEm: new Date().toISOString(), modelo });
  for (const it of base) {
    const id = String(it.codigoProduto);
    await setDoc(doc(db, `conferencias/${loja}/contagens/${nome}/baseProdutos/${id}`), it);
  }
  sessionStorage.setItem("loja", loja);
  sessionStorage.setItem("contagemAtual", nome);
  alert("Contagem criada!");
  carregaContagensExistentes();
  formNovaContagem.style.display = "none";
  inputNomeContagem.value = ""; inputXLSX.value = ""; selectModelo.value = "";
});

btnGerarEtapa.addEventListener("click", async () => {
  const loja = sessionStorage.getItem("loja");
  const contagem = selectContagemExistente.value;
  if (!loja || !contagem) return alert("Selecione contagem!");
  const nova = prompt("Nome da nova etapa (ex: contagem2):").trim().replace(/\s+/g, "_");
  if (!nova) return;
  await setDoc(doc(db, `conferencias/${loja}/contagens/${contagem}`), { etapaAtual: nova }, { merge: true });
  await setDoc(doc(db, `conferencias/${loja}/contagens/${contagem}/contagens/${nova}`), {});
  sessionStorage.setItem("contagemAtual", contagem);
  msgEtapa.textContent = `✅ Nova etapa ${nova} gerada!`;
  setTimeout(() => { msgEtapa.textContent=""; }, 4000);
  carregaContagensExistentes();
});

// Usuário cadastro
formCadastroUsuario.addEventListener("submit", async e => {
  e.preventDefault();
  const nome = formCadastroUsuario.novoUsuario.value;
  const pwd = formCadastroUsuario.novaSenha.value;
  const tipo = formCadastroUsuario.tipoUsuario.value;
  const loja = selectLojaUsuario.value;
  await setDoc(doc(db, 'usuarios', nome), { senha: pwd, tipo, loja });
  alert("Usuário cadastrado!");
  formCadastroUsuario.reset();
});
