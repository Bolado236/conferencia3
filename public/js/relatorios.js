import { db } from './firebase.js';
import {
  collection, doc, getDocs, getDoc
} from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs';

/**
 * Gera o relatório geral de uma contagem específica
 * @param {string} loja - código da loja (vem da session)
 * @param {string} contagem - nome da contagem selecionada
 * @returns {Array} rel - array de objetos com os dados consolidados
 */
export async function gerarRelatorioGeral(loja, contagem) {
  const baseSnap = await getDocs(collection(db, `conferencias/${loja}/contagens/${contagem}/baseProdutos`));
  const etapasSnap = await getDocs(collection(db, `conferencias/${loja}/contagens/${contagem}/etapas`));

  const relatorio = [];

  for (const docBase of baseSnap.docs) {
    const produto = docBase.data();
    const resumoProduto = {
      Codigo: produto.codigoProduto,
      Descricao: produto.descricao,
      Departamento: produto.departamento,
      Categoria: produto.categoria,
      Subcategoria: produto.subCategoria,
      CodigosBarras: (produto.codigoBarras || []).join(', '),
      Disponibilidade: produto.disponibilidade ?? '',
      QuantidadeTeorica: produto.quantidade ?? '',
    };

    for (const etapaDoc of etapasSnap.docs) {
      const etapaId = etapaDoc.id;
      const resumoRef = doc(db, `conferencias/${loja}/contagens/${contagem}/etapas/${etapaId}/resumo/${produto.codigoProduto}`);
      const snapResumo = await getDoc(resumoRef);
      const qtdContada = snapResumo.exists() ? snapResumo.data().quantidade : 0;
      resumoProduto[`Etapa_${etapaId}`] = qtdContada;
    }

    const totalContado = Object.keys(resumoProduto)
      .filter(k => k.startsWith('Etapa_'))
      .reduce((acc, k) => acc + Number(resumoProduto[k]), 0);

    resumoProduto["Status"] = totalContado === produto.quantidade ? "finalizado" : "divergente";

    relatorio.push(resumoProduto);
  }

  return relatorio;
}

/**
 * Exporta um relatório JSON para um arquivo Excel (.xlsx)
 * @param {Array} dados - dados do relatório
 * @param {string} nomeArquivo - nome do arquivo sem extensão
 */
export function exportarXLSX(dados, nomeArquivo) {
  const ws = XLSX.utils.json_to_sheet(dados);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'RelatorioGeral');
  XLSX.writeFile(wb, `${nomeArquivo}.xlsx`);
}

/**
 * Preenche o dropdown com contagens da loja atual
 */
export async function carregarContagensRelatorio() {
  const loja = sessionStorage.getItem('loja');
  const sel = document.getElementById('selectContagemRelatorio');
  if (!loja || !sel) return;

  sel.innerHTML = '<option value="">-- selecione contagem --</option>';
  const snap = await getDocs(collection(db, 'conferencias', loja, 'contagens'));
  snap.forEach(d => sel.innerHTML += `<option value="${d.id}">${d.id}</option>`);
}
