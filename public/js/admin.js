import { db } from './firebase.js';
import { doc, setDoc, getDocs, collection } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { converterXLSXParaJSON } from './xlsxConverter.js';
import { lojas } from './lojas.js';

document.getElementById("btnVoltarHub").addEventListener("click", () => {
  window.location.href = 'hub.html';
});

document.getElementById("btnNovaContagem").addEventListener("click", () => {
  document.getElementById("formNovaContagem").style.display = "block";
});

document.getElementById("btnCriarContagemCompleta").addEventListener("click", async () => {
  const loja = document.getElementById("selectLoja").value;
  let nome = document.getElementById("inputNomeContagem").value.trim().replace(/\s+/g, "_");
  const modelo = document.getElementById("selectModelo").value;
  const file = document.getElementById("inputXLSX").files[0];

  if (!loja || !nome || !modelo || !file) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  try {
    const baseProdutos = await converterXLSXParaJSON(file);

    const contagemDoc = doc(db, `conferencias/${loja}/contagens/${nome}`);
    await setDoc(contagemDoc, {
      criadaEm: new Date().toISOString(),
      modelo: modelo
    });

    for (const item of baseProdutos) {
      const id = item.codigoProduto?.toString() || crypto.randomUUID();
      const codigos = typeof item.codigobarras === 'string'
        ? item.codigobarras.split(';').map(c => c.trim())
        : [];
      const produtoRef = doc(db, `conferencias/${loja}/contagens/${nome}/baseProdutos/${id}`);
      await setDoc(produtoRef, {
        ...item,
        codigobarras: codigos
      });
    }

    sessionStorage.setItem("loja", loja);
    sessionStorage.setItem("contagemAtual", nome);
    const form = document.getElementById("formNovaContagem");
    form.style.display = "none";
    form.reset?.(); // se for um form real, senão limpe manualmente

    document.getElementById("selectLoja").value = "";
    document.getElementById("inputNomeContagem").value = "";
    document.getElementById("inputXLSX").value = "";
    document.getElementById("selectModelo").value = "";

    const msg = document.createElement("p");
    msg.textContent = "✅ Contagem criada com sucesso!";
    msg.style.color = "green";
    msg.style.marginTop = "10px";
    form.insertAdjacentElement("beforebegin", msg);

    setTimeout(() => msg.remove(), 5000);

    carregarContagens(loja);
  } catch (err) {
    console.error("Erro ao criar contagem:", err);
    alert("Erro ao criar contagem: " + err.message);
  }
});

document.getElementById("btnNovaEtapaConferencia").addEventListener("click", async () => {
  const loja = sessionStorage.getItem("loja");
  const atual = sessionStorage.getItem("contagemAtual");
  if (!loja || !atual) {
    alert("Nenhuma contagem ativa.");
    return;
  }

  const novaId = prompt("Digite o nome da nova etapa da contagem (ex: contagem2):").trim().replace(/\s+/g, "_");
  if (!novaId) return;

  try {
    const novaRef = doc(db, `conferencias/${loja}/contagens/${novaId}`);
    await setDoc(novaRef, {
      geradaDe: atual,
      criadaEm: new Date().toISOString()
    });
    sessionStorage.setItem("contagemAtual", novaId);
    alert("Nova etapa criada.");
    carregarContagens(loja);
  } catch (err) {
    console.error("Erro ao gerar nova conferência:", err);
    alert("Erro: " + err.message);
  }
});

async function carregarContagens(loja) {
  const lista = document.getElementById("listaContagensExistentes");
  lista.innerHTML = "<p>Carregando...</p>";
  try {
    const snap = await getDocs(collection(db, `conferencias/${loja}/contagens`));
    if (snap.empty) {
      lista.innerHTML = "<p>Nenhuma contagem encontrada.</p>";
      return;
    }
    let html = "<ul>";
    snap.forEach(docSnap => {
      const data = docSnap.data();
      html += `<li><b>${docSnap.id}</b> - modelo: ${data.modelo || 'n/d'}</li>`;
    });
    html += "</ul>";
    lista.innerHTML = html;
  } catch (err) {
    lista.innerHTML = "<p>Erro ao carregar contagens.</p>";
    console.error(err);
  }
}

import { db } from './firebase.js';
import { doc, setDoc, getDocs, collection, updateDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { converterXLSXParaJSON } from './xlsxConverter.js';
import { lojas } from './lojas.js';

document.getElementById("btnVoltarHub").addEventListener("click", () => {
  window.location.href = 'hub.html';
});

document.getElementById("btnNovaContagem").addEventListener("click", () => {
  document.getElementById("formNovaContagem").style.display = "block";
});

document.getElementById("btnCriarContagemCompleta").addEventListener("click", async () => {
  const loja = document.getElementById("selectLoja").value;
  let nome = document.getElementById("inputNomeContagem").value.trim().replace(/\s+/g, "_");
  const modelo = document.getElementById("selectModelo").value;
  const file = document.getElementById("inputXLSX").files[0];

  if (!loja || !nome || !modelo || !file) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  try {
    const baseProdutos = await converterXLSXParaJSON(file);

    const contagemDoc = doc(db, `conferencias/${loja}/contagens/${nome}`);
    await setDoc(contagemDoc, {
      criadaEm: new Date().toISOString(),
      modelo: modelo
    });

    for (const item of baseProdutos) {
      const id = item.codigoProduto?.toString() || crypto.randomUUID();
      const codigos = typeof item.codigobarras === 'string'
        ? item.codigobarras.split(';').map(c => c.trim())
        : [];
      const produtoRef = doc(db, `conferencias/${loja}/contagens/${nome}/baseProdutos/${id}`);
      await setDoc(produtoRef, {
        ...item,
        codigobarras: codigos
      });
    }

    sessionStorage.setItem("loja", loja);
    sessionStorage.setItem("contagemAtual", nome);
    const form = document.getElementById("formNovaContagem");
    form.style.display = "none";
    form.reset?.(); // se for um form real, senão limpe manualmente

    document.getElementById("selectLoja").value = "";
    document.getElementById("inputNomeContagem").value = "";
    document.getElementById("inputXLSX").value = "";
    document.getElementById("selectModelo").value = "";

    const msg = document.createElement("p");
    msg.textContent = "✅ Contagem criada com sucesso!";
    msg.style.color = "green";
    msg.style.marginTop = "10px";
    form.insertAdjacentElement("beforebegin", msg);

    setTimeout(() => msg.remove(), 5000);

    carregarContagens(loja);
  } catch (err) {
    console.error("Erro ao criar contagem:", err);
    alert("Erro ao criar contagem: " + err.message);
  }
});

document.getElementById("btnNovaEtapaConferencia").addEventListener("click", async () => {
  const loja = sessionStorage.getItem("loja");
  const contagemId = document.getElementById("selectContagemAtual").value;
  const modeloEtapa = document.getElementById("selectModeloEtapa").value;

  if (!loja || !contagemId) {
    alert("Selecione uma contagem para gerar nova etapa.");
    return;
  }

  if (!modeloEtapa) {
    alert("Selecione um modelo para a nova etapa.");
    return;
  }

  const novaEtapa = prompt("Digite o nome da nova etapa da contagem (ex: contagem2):");
  if (!novaEtapa) return;

  try {
    const novaEtapaId = novaEtapa.trim().replace(/\s+/g, "_");
    const novaEtapaRef = doc(db, `conferencias/${loja}/contagens/${contagemId}/${novaEtapaId}`);
    await setDoc(novaEtapaRef, {
      modelo: modeloEtapa,
      criadaEm: new Date().toISOString()
    });

    // Atualizar etapaAtual no documento da contagem
    const contagemDocRef = doc(db, `conferencias/${loja}/contagens/${contagemId}`);
    await updateDoc(contagemDocRef, {
      etapaAtual: novaEtapaId
    });

    alert(`Nova etapa '${novaEtapaId}' criada e ativada.`);
    carregarContagens(loja);
    carregarDropdownContagens(loja);
  } catch (err) {
    console.error("Erro ao criar nova etapa:", err);
    alert("Erro ao criar nova etapa: " + err.message);
  }
});

async function carregarContagens(loja) {
  const lista = document.getElementById("listaContagensExistentes");
  lista.innerHTML = "<p>Carregando...</p>";
  try {
    const snap = await getDocs(collection(db, `conferencias/${loja}/contagens`));
    if (snap.empty) {
      lista.innerHTML = "<p>Nenhuma contagem encontrada.</p>";
      return;
    }
    let html = "<ul>";
    snap.forEach(docSnap => {
      const data = docSnap.data();
      html += `<li><b>${docSnap.id}</b> - modelo: ${data.modelo || 'n/d'}</li>`;
    });
    html += "</ul>";
    lista.innerHTML = html;
  } catch (err) {
    lista.innerHTML = "<p>Erro ao carregar contagens.</p>";
    console.error(err);
  }
}

async function carregarDropdownContagens(loja) {
  const selectContagemAtual = document.getElementById("selectContagemAtual");
  if (!selectContagemAtual) return;

  selectContagemAtual.innerHTML = '<option value="">-- Selecione a contagem --</option>';

  try {
    const snap = await getDocs(collection(db, `conferencias/${loja}/contagens`));
    snap.forEach(docSnap => {
      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = docSnap.id;
      selectContagemAtual.appendChild(option);
    });
  } catch (err) {
    console.error("Erro ao carregar dropdown de contagens:", err);
  }
}

import { db } from './firebase.js';
import { doc, setDoc, getDocs, collection, updateDoc } from 'https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js';
import { converterXLSXParaJSON } from './xlsxConverter.js';
import { lojas } from './lojas.js';

document.getElementById("btnVoltarHub").addEventListener("click", () => {
  window.location.href = 'hub.html';
});

document.getElementById("btnNovaContagem").addEventListener("click", () => {
  document.getElementById("formNovaContagem").style.display = "block";
});

document.getElementById("btnCriarContagemCompleta").addEventListener("click", async () => {
  const loja = document.getElementById("selectLoja").value;
  let nome = document.getElementById("inputNomeContagem").value.trim().replace(/\s+/g, "_");
  const modelo = document.getElementById("selectModelo").value;
  const file = document.getElementById("inputXLSX").files[0];

  if (!loja || !nome || !modelo || !file) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  try {
    const baseProdutos = await converterXLSXParaJSON(file);

    const contagemDoc = doc(db, `conferencias/${loja}/contagens/${nome}`);
    await setDoc(contagemDoc, {
      criadaEm: new Date().toISOString(),
      modelo: modelo
    });

    for (const item of baseProdutos) {
      const id = item.codigoProduto?.toString() || crypto.randomUUID();
      const codigos = typeof item.codigobarras === 'string'
        ? item.codigobarras.split(';').map(c => c.trim())
        : [];
      const produtoRef = doc(db, `conferencias/${loja}/contagens/${nome}/baseProdutos/${id}`);
      await setDoc(produtoRef, {
        ...item,
        codigobarras: codigos
      });
    }

    sessionStorage.setItem("loja", loja);
    sessionStorage.setItem("contagemAtual", nome);
    const form = document.getElementById("formNovaContagem");
    form.style.display = "none";
    form.reset?.(); // se for um form real, senão limpe manualmente

    document.getElementById("selectLoja").value = "";
    document.getElementById("inputNomeContagem").value = "";
    document.getElementById("inputXLSX").value = "";
    document.getElementById("selectModelo").value = "";

    const msg = document.createElement("p");
    msg.textContent = "✅ Contagem criada com sucesso!";
    msg.style.color = "green";
    msg.style.marginTop = "10px";
    form.insertAdjacentElement("beforebegin", msg);

    setTimeout(() => msg.remove(), 5000);

    carregarContagens(loja);
  } catch (err) {
    console.error("Erro ao criar contagem:", err);
    alert("Erro ao criar contagem: " + err.message);
  }
});

const btnNovaEtapaConferencia = document.getElementById("btnNovaEtapaConferencia");
const selectContagemExistente = document.getElementById("selectContagemExistente");
const selectModeloEtapa = document.getElementById("selectModeloEtapa");

btnNovaEtapaConferencia.style.display = "none";

selectContagemExistente.addEventListener("change", () => {
  if (selectContagemExistente.value) {
    btnNovaEtapaConferencia.style.display = "inline-block";
  } else {
    btnNovaEtapaConferencia.style.display = "none";
  }
});

btnNovaEtapaConferencia.addEventListener("click", async () => {
  const loja = sessionStorage.getItem("loja");
  const contagemSelecionada = selectContagemExistente.value;
  const modeloEtapa = selectModeloEtapa.value;

  if (!loja || !contagemSelecionada) {
    alert("Selecione uma contagem para gerar nova etapa.");
    return;
  }

  if (!modeloEtapa) {
    alert("Selecione um modelo para a nova etapa.");
    return;
  }

  try {
    // Buscar as etapas existentes para gerar o próximo nome sequencial
    const etapasSnap = await getDocs(collection(db, `conferencias/${loja}/contagens/${contagemSelecionada}`));
    const etapasExistentes = etapasSnap.docs.map(doc => doc.id).filter(id => id.startsWith("contagem"));
    let maxNumero = 0;
    etapasExistentes.forEach(id => {
      const num = parseInt(id.replace("contagem", ""), 10);
      if (!isNaN(num) && num > maxNumero) {
        maxNumero = num;
      }
    });
    const novaEtapaNumero = maxNumero + 1;
    const novaEtapaId = `contagem${novaEtapaNumero}`;

    // Criar nova etapa com modelo e data
    const novaEtapaRef = doc(db, `conferencias/${loja}/contagens/${contagemSelecionada}/${novaEtapaId}`);
    await setDoc(novaEtapaRef, {
      modelo: modeloEtapa,
      criadaEm: new Date().toISOString()
    });

    // Atualizar etapaAtual no documento da contagem principal
    const contagemDocRef = doc(db, `conferencias/${loja}/contagens/${contagemSelecionada}`);
    await updateDoc(contagemDocRef, {
      etapaAtual: novaEtapaId
    });

    alert(`Nova etapa '${novaEtapaId}' criada e ativada.`);
    carregarContagens(loja);
    carregarDropdownContagens(loja);
  } catch (err) {
    console.error("Erro ao criar nova etapa:", err);
    alert("Erro ao criar nova etapa: " + err.message);
  }
});

async function carregarDropdownContagens(loja) {
  if (!selectContagemExistente) return;

  selectContagemExistente.innerHTML = '<option value="">-- Selecione a contagem --</option>';

  try {
    const snap = await getDocs(collection(db, `conferencias/${loja}/contagens`));
    snap.forEach(docSnap => {
      const option = document.createElement("option");
      option.value = docSnap.id;
      option.textContent = docSnap.id;
      selectContagemExistente.appendChild(option);
    });
  } catch (err) {
    console.error("Erro ao carregar dropdown de contagens:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const loja = sessionStorage.getItem("loja");
  if (loja) {
    carregarContagens(loja);
    carregarDropdownContagens(loja);
  }
});
