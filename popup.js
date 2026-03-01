document.addEventListener("DOMContentLoaded", () => {

    const botao = document.getElementById("toggle");
    const status = document.getElementById("status");

    // Carregar estado salvo
    chrome.storage.local.get(["ativo"], (result) => {
        const ativo = result.ativo || false;
        atualizarInterface(ativo);
    });

    botao.addEventListener("click", () => {

        chrome.storage.local.get(["ativo"], (result) => {
            const novoEstado = !result.ativo;

            chrome.storage.local.set({ ativo: novoEstado }, () => {
                atualizarInterface(novoEstado);
            });
        });

    });

    function atualizarInterface(ativo) {
        if (ativo) {
            status.textContent = "Extensão ativa";
            status.className = "ativo";

            botao.textContent = "Desativar";
            botao.className = "btn-desativar";
        } else {
            status.textContent = "Extensão desativada";
            status.className = "inativo";

            botao.textContent = "Ativar";
            botao.className = "btn-ativar";
        }
    }

});