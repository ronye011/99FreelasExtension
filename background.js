const URL_LISTA = "https://www.99freelas.com.br/projects?order=mais-recentes&categoria=web-mobile-e-software";

let executando = false;

/* =====================================
   Inicialização
===================================== */

chrome.runtime.onInstalled.addListener(() => {
    iniciarAlarme();
});

chrome.runtime.onStartup.addListener(() => {
    iniciarAlarme();
});

function iniciarAlarme() {
    chrome.alarms.create("verificarProjetos", {
        periodInMinutes: 1
    });
}

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "verificarProjetos") {
        verificarProjetos();
    }
});

/* =====================================
   Ativar / Desativar
===================================== */

chrome.storage.onChanged.addListener((changes) => {
    if (changes.ativo) {
        if (changes.ativo.newValue) {
            iniciarAlarme();
            verificarProjetos(); // executa imediatamente
        } else {
            chrome.alarms.clear("verificarProjetos");
        }
    }
});

/* =====================================
   Função principal (SEM abrir guia)
===================================== */

async function verificarProjetos() {

    if (executando) return;
    executando = true;

    const { ativo, ultimoTimestamp = 0 } =
        await chrome.storage.local.get(["ativo", "ultimoTimestamp"]);

    if (!ativo) {
        executando = false;
        return;
    }

    try {

        const response = await fetch(URL_LISTA, {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error("Erro ao buscar página");
        }

        const html = await response.text();

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        const projetos = Array.from(doc.querySelectorAll(".result-item"))
            .map(item => {

                const link = item.querySelector(".title a");
                const datetime = item.querySelector(".datetime");

                if (!link || !datetime) return null;

                return {
                    titulo: link.innerText.trim(),
                    url: link.href,
                    timestamp: Number(datetime.getAttribute("cp-datetime"))
                };
            })
            .filter(Boolean);

        if (!projetos.length) {
            executando = false;
            return;
        }

        // Ordena do mais recente para o mais antigo
        projetos.sort((a, b) => b.timestamp - a.timestamp);

        // Primeira execução (não notifica nada)
        if (ultimoTimestamp === 0) {

            await chrome.storage.local.set({
                ultimoTimestamp: projetos[0].timestamp
            });

            executando = false;
            return;
        }

        // Filtra apenas projetos mais recentes
        const novos = projetos.filter(p =>
            p.timestamp > ultimoTimestamp
        );

        if (novos.length > 0) {

            // Notifica do mais antigo para o mais recente
            novos
                .sort((a, b) => a.timestamp - b.timestamp)
                .forEach(projeto => notificar(projeto));

            const maiorTimestamp = Math.max(
                ...novos.map(p => p.timestamp)
            );

            await chrome.storage.local.set({
                ultimoTimestamp: maiorTimestamp
            });
        }

    } catch (error) {
        console.error("Erro ao verificar projetos:", error);
    }

    executando = false;
}

/* =====================================
   Notificação
===================================== */

function notificar(projeto) {

    chrome.notifications.create(
        projeto.timestamp.toString(),
        {
            type: "basic",
            iconUrl: "icons/icon128.png",
            title: "Novo projeto no 99Freelas!",
            message: projeto.titulo,
            buttons: [
                { title: "Abrir projeto" }
            ]
        }
    );

    chrome.storage.local.set({
        ["notif_" + projeto.timestamp]: projeto.url
    });
}

chrome.notifications.onButtonClicked.addListener(
    async (notificationId, buttonIndex) => {

        if (buttonIndex === 0) {

            const key = "notif_" + notificationId;
            const result = await chrome.storage.local.get(key);
            const url = result[key];

            if (url) {
                chrome.tabs.create({ url });
            }

            chrome.notifications.clear(notificationId);
        }
    }
);