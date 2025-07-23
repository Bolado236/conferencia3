import { db } from './firebase.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
import { lojas } from './lojas.js';

const formLogin = document.getElementById('loginForm');
const selectLoja = document.getElementById('loja');

// Popular select de lojas no login
document.addEventListener('DOMContentLoaded', () => {
    if (selectLoja) {
        lojas.forEach(loja => {
            const option = document.createElement('option');
            option.value = loja.codigo;
            option.textContent = `${loja.codigo} - ${loja.nome}`;
            selectLoja.appendChild(option);
        });
    }
});

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();

    const usuario = formLogin.usuario.value.trim();
    const senha = formLogin.senha.value.trim();
    const lojaSelecionada = formLogin.loja.value.trim();

    if (!usuario || !senha || !lojaSelecionada) {
        alert('Preencha todos os campos.');
        return;
    }

    // Usuário padrão para testes
    const usuariosMock = [
        { usuario: 'gabrieln', senha: 'admin123', tipo: 'admin', loja: 'geral' }
    ];

    // Verifica se é usuário mock
    const usuarioMock = usuariosMock.find(u => u.usuario === usuario && u.senha === senha && (u.loja === lojaSelecionada || u.loja === 'geral'));

    if (usuarioMock) {
        sessionStorage.setItem('usuario', usuarioMock.usuario);
        sessionStorage.setItem('tipo', usuarioMock.tipo);
        sessionStorage.setItem('loja', lojaSelecionada);
        window.location.href = '../html/hub.html';
        return;
    }

    try {
        // Busca usuário no Firestore
        const docRef = doc(db, 'usuarios', usuario);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            alert('Usuário não encontrado.');
            return;
        }

        const data = docSnap.data();

        if (data.senha !== senha) {
            alert('Senha incorreta.');
            return;
        }

        if (data.loja !== 'geral' && data.loja !== lojaSelecionada) {
            alert('Usuário não tem permissão para esta loja.');
            return;
        }

        // Armazena sessão via sessionStorage
        sessionStorage.setItem('usuario', usuario);
        sessionStorage.setItem('tipo', data.tipo);
        sessionStorage.setItem('loja', lojaSelecionada);

        // Redireciona para o hub
        window.location.href = '../html/hub.html';

    } catch (error) {
        console.error('Erro ao autenticar:', error);
        alert('Erro ao autenticar. Tente novamente.');
    }
});
