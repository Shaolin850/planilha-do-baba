// Atualiza a data e hora corretamente
function atualizarDataHora() {
    const now = new Date();
    const dataHoraFormatada = now.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
    document.getElementById("datetime").innerText = "Data e Hora: " + dataHoraFormatada;
}

setInterval(atualizarDataHora, 1000);
atualizarDataHora();

// Função para numerar automaticamente os associados
function numerarAssociados() {
    const inputTexto = document.getElementById("associados").value;
    const linhas = inputTexto.split("\n").filter(linha => linha.trim() !== ""); // Remove linhas vazias
    const listaNumerada = linhas.map((linha, index) => `${index + 1}. ${linha}`).join("\n");

    document.getElementById("associadosNumerados").innerText = listaNumerada;
}

// Função para numerar automaticamente as reservas
function numerarReservas() {
    const inputTexto = document.getElementById("reservas").value;
    const linhas = inputTexto.split("\n").filter(linha => linha.trim() !== ""); // Remove linhas vazias
    const listaNumerada = linhas.map((linha, index) => `${index + 1}. ${linha}`).join("\n");

    document.getElementById("reservasNumeradas").innerText = listaNumerada;
}

// Função para compartilhar no WhatsApp
function compartilharWhatsApp() {
    const dataHora = document.getElementById("datetime").innerText.replace("Data e Hora: ", "");
    const associados = document.getElementById("associadosNumerados").innerText;
    const time1 = document.getElementById("time1").value.split("\n").filter(t => t).join("\n");
    const time2 = document.getElementById("time2").value.split("\n").filter(t => t).join("\n");
    const time3 = document.getElementById("time3").value.split("\n").filter(t => t).join("\n");
    const reservas = document.getElementById("reservasNumeradas").innerText;
    const cartoes = document.getElementById("cartoes").value;
    const observacoes = document.getElementById("observacoes").value;
    const pagamento = document.getElementById("pagamento").value;
    const saldoAnterior = document.getElementById("saldo_anterior").value;

    const mensagem = `
**NOSSO BABA**

**Data e Hora:** ${dataHora}

### Lista de Associados:

${associados}

### Tabela de Times:

**TIME 1:**
${time1}

**TIME 2:**
${time2}

**TIME 3:**
${time3}

### Reservas:

${reservas}

### Cartões:
${cartoes}

### Observações:
${observacoes}

**Pag. do dia:** ${pagamento}

**Saldo Anterior:** ${saldoAnterior}
`.trim();

    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
}

// Adicionar eventos para atualizar a numeração conforme o usuário digita
document.getElementById("associados").addEventListener("input", numerarAssociados);
document.getElementById("reservas").addEventListener("input", numerarReservas);
