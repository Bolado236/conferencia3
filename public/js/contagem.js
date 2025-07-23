import { db } from './firebase.js';
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

// Buscar tipo da etapa atual
(async () => {
  const d = await getDoc(doc(db, 'conferencias', loja, 'contagens', contagem, 'etapas', etapa));
  tipoEtapa = d.data().tipo;
  txtTipo.textContent = tipoEtapa;
})();

btnSalvar.onclick = async () => {
  if (!produto) return alert('Busque item');
  const qtd = parseInt(inputQtd.value);
  const loc = localSelect.value;
  if (!qtd || !loc) return alert('Informe local e quantidade');

  // validação de listagem na etapa por subcategoria
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

// Buscar produto manual
busca.onblur = () => {
  buscarProduto(busca.value.trim());
};

// Função para buscar e exibir o produto
async function buscarProduto(codigo) {
  const docRef = doc(db, `conferencias/${loja}/contagens/${contagem}/baseProdutos/${codigo}`);
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    alert('Produto não encontrado');
    return;
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

  // Atualiza referência do botão salvar após innerHTML
  document.getElementById('btnSalvarContagem').onclick = btnSalvar.onclick;
  document.getElementById('inputQuantidade').focus();
}

// Mostrar produtos que o usuário contou no local atual
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

// Leitura por câmera (usando QuaggaJS)
btnCamera.onclick = () => {
  if (window.Quagga) {
    Quagga.init({
      inputStream: {
        type: "LiveStream",
        constraints: { width: 640, height: 480, facingMode: "environment" },
        target: document.querySelector('body')
      },
      decoder: { readers: ["ean_reader", "code_128_reader"] }
    }, err => {
      if (err) return console.error(err);
      Quagga.start();
    });

    Quagga.onDetected(data => {
      const code = data.codeResult.code;
      Quagga.stop();
      buscarProduto(code);
    });
  } else {
    alert("Leitor de câmera não disponível.");
  }
};
