
const BRL = (v = 0) =>
  (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const el = (sel, root = document) => root.querySelector(sel);
const els = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  associados: [],
  times: [],
  reservas: [],
  lancamentos: [],
  observacoes: '',
  caixa: { saldoAnterior: 0 }
};

const STORAGE_KEY = 'pfutebol_data_v1';

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  loadState(); // sem dados de exemplo
  bindTabs();
  bindModals();
  bindForms();
  bindActions();
  renderAll();
  el('#year').textContent = new Date().getFullYear();
});

// Relógio
function initClock() {
  const d = el('#currentDate');
  const t = el('#currentTime');
  const tick = () => {
    const now = new Date();
    d.textContent = now.toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long', year:'numeric' });
    t.textContent = now.toLocaleTimeString('pt-BR');
  };
  tick(); setInterval(tick, 1000);
}

// Storage
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  el('#ultimaAtualizacao').textContent = new Date().toLocaleString('pt-BR');
}
function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const data = JSON.parse(raw);
      Object.assign(state, data || {});
    } catch (e) { console.warn('Falha ao carregar state', e); }
  }
  // Garantias mínimas
  state.associados ??= [];
  state.times ??= [];
  state.reservas ??= [];
  state.lancamentos ??= [];
  state.observacoes ??= '';
  state.caixa ??= { saldoAnterior: 0 };
}

// UI: Tabs
function bindTabs() {
  els('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.target) {
        els('.tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        els('.panel').forEach(p => p.classList.remove('active'));
        el(btn.dataset.target).classList.add('active');
      }
    });
  });
}

// UI: Modais
function bindModals() {
  els('[data-open]').forEach(b=>{
    b.addEventListener('click', ()=> openModal(b.dataset.open));
  });
  els('[data-close]').forEach(b=>{
    b.addEventListener('click', ()=> closeModal(b.dataset.close));
  });
  els('.modal').forEach(m=>{
    m.addEventListener('click', (e)=>{ if(e.target===m) m.classList.remove('show'); });
  });
}
function openModal(sel){ el(sel).classList.add('show'); }
function closeModal(sel){ el(sel).classList.remove('show'); }

// Forms
function bindForms() {
  // Associado
  el('#formAssociado').addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = Object.fromEntries(fd.entries());
    const isEdit = !!obj.id;
    const payload = {
      id: isEdit ? obj.id : uid(),
      nome: obj.nome.trim(),
      telefone: obj.telefone.trim(),
      posicao: obj.posicao || 'Outro',
      status: obj.status || 'Ativo',
      mensalidade: parseFloat(obj.mensalidade || '0')
    };
    if (isEdit) {
      const idx = state.associados.findIndex(x => x.id === obj.id);
      if (idx >= 0) state.associados[idx] = payload;
    } else {
      state.associados.push(payload);
    }
    saveState(); renderAssociados(); renderKPIs();
    closeModal('#modalAssociado'); resetForm(e.target);
  });

  // Time
  el('#formTime').addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = Object.fromEntries(fd.entries());
    const isEdit = !!obj.id;
    const payload = {
      id: isEdit ? obj.id : uid(),
      nome: obj.nome.trim(),
      categoria: obj.categoria || 'Livre',
      cor: (obj.cor || '').trim(),
      jogadores: (obj.jogadores || '').split(',').map(s=>s.trim()).filter(Boolean)
    };
    if (isEdit) {
      const idx = state.times.findIndex(x => x.id === obj.id);
      if (idx >= 0) state.times[idx] = payload;
    } else {
      state.times.push(payload);
    }
    saveState(); renderTimes(); renderSelectTimes(); renderReservas();
    closeModal('#modalTime'); resetForm(e.target);
  });

  // Reserva
  el('#formReserva').addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = Object.fromEntries(fd.entries());
    const isEdit = !!obj.id;
    const payload = {
      id: isEdit ? obj.id : uid(),
      data: obj.data,
      hora: obj.hora,
      local: obj.local.trim(),
      time: obj.time || '',
      valor: parseFloat(obj.valor || '0'),
      status: obj.status || 'Confirmada'
    };
    if (isEdit) {
      const idx = state.reservas.findIndex(x => x.id === obj.id);
      if (idx >= 0) state.reservas[idx] = payload;
    } else {
      state.reservas.push(payload);
    }
    saveState(); renderReservas(); renderKPIs();
    closeModal('#modalReserva'); resetForm(e.target);
  });

  // Lançamento
  el('#formLancamento').addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const obj = Object.fromEntries(fd.entries());
    const isEdit = !!obj.id;
    const payload = {
      id: isEdit ? obj.id : uid(),
      data: obj.data,
      descricao: obj.descricao.trim(),
      tipo: obj.tipo,
      valor: parseFloat(obj.valor || '0'),
      responsavel: (obj.responsavel || '').trim()
    };
    if (isEdit) {
      const idx = state.lancamentos.findIndex(x => x.id === obj.id);
      if (idx >= 0) state.lancamentos[idx] = payload;
    } else {
      state.lancamentos.push(payload);
    }
    recalcCaixa();
    saveState(); renderFinanceiro(); renderKPIs();
    closeModal('#modalLancamento'); resetForm(e.target);
  });
}

function resetForm(form) {
  form.reset();
  form.querySelector('input[name="id"]').value = '';
}

function bindActions() {
  // Observações
  el('#btnSalvarObs').addEventListener('click', ()=>{
    state.observacoes = el('#observacoes').value;
    saveState();
  });

  // Filtro associados
  el('#filtroAssociados').addEventListener('input', renderAssociados);

  // Reset
  el('#btnReset').addEventListener('click', ()=>{
    if (confirm('Tem certeza que deseja limpar TODOS os dados?')) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  });

  // Resumo
  el('#btnGerarResumo').addEventListener('click', ()=>{
    el('#resumoDia').textContent = gerarResumoTexto();
  });

  // Exportações
  el('#btnExportPDF').addEventListener('click', exportPDFMain);
  el('#btnExportRelatorioPDF').addEventListener('click', exportPDFRelatorio);
  el('#btnShareWhatsApp').addEventListener('click', shareWhatsApp);
  el('#btnShareNative').addEventListener('click', shareNative);
  el('#btnExportAssociadosCSV').addEventListener('click', exportAssociadosCSV);

  // Relatório mês padrão = atual
  const ym = new Date().toISOString().slice(0,7);
  el('#mesRelatorio').value = ym;
  el('#btnGerarRelatorio')?.addEventListener('click', renderRelatorio);
}

// Renderizações
function renderAll() {
  el('#observacoes').value = state.observacoes || '';
  renderAssociados();
  renderTimes();
  renderSelectTimes();
  renderReservas();
  recalcCaixa();
  renderFinanceiro();
  renderKPIs();
  renderRelatorio();
  el('#resumoDia').textContent = gerarResumoTexto();
}

function renderKPIs() {
  const ativos = state.associados.filter(a=>a.status==='Ativo').length;
  const pend = state.associados.filter(a=>a.status==='Pendente').length;
  el('#kpiAssociados').textContent = ativos;
  el('#kpiAssociadosPendentes').textContent = `Pendentes: ${pend}`;

  const hoje = new Date().toISOString().slice(0,10);
  const partidasHoje = state.reservas.filter(r=>r.data===hoje && r.status!=='Cancelada').length;
  const reservasHoje = state.reservas.filter(r=>r.data===hoje).length;
  el('#kpiPartidas').textContent = partidasHoje;
  el('#kpiReservasHoje').textContent = `Reservas hoje: ${reservasHoje}`;

  el('#kpiSaldoAtual').textContent = BRL(calcSaldoAtual());
  el('#kpiEntradaDia').textContent = `Entrada no dia: ${BRL(calcEntradaDia())}`;
}

function renderAssociados() {
  const tbody = el('#tabelaAssociados tbody');
  tbody.innerHTML = '';
  const q = el('#filtroAssociados').value?.toLowerCase() || '';
  const list = state.associados
    .filter(a => [a.nome,a.posicao,a.telefone].some(x => (x||'').toLowerCase().includes(q)));

  toggleEmpty('#emptyAssociados', list.length === 0);

  list.forEach(a=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Nome">${a.nome}</td>
      <td data-label="Telefone">${a.telefone || '-'}</td>
      <td data-label="Posição">${a.posicao || '-'}</td>
      <td data-label="Status">${badgeStatus(a.status || '-')}</td>
      <td data-label="Mensalidade">${BRL(a.mensalidade || 0)}</td>
      <td data-label="Ações">
        <div class="actions">
          <button class="btn small" data-edit="${a.id}"><span class="material-symbols-rounded">edit</span></button>
          <button class="btn small outline" data-del="${a.id}"><span class="material-symbols-rounded">delete</span></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // actions
  tbody.querySelectorAll('[data-edit]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.dataset.edit;
      const a = state.associados.find(x=>x.id===id);
      const f = el('#formAssociado');
      f.nome.value = a.nome; f.telefone.value = a.telefone || '';
      f.posicao.value = a.posicao || 'Outro'; f.status.value = a.status || 'Ativo';
      f.mensalidade.value = a.mensalidade || 0; f.id.value = a.id;
      openModal('#modalAssociado');
    });
  });
  tbody.querySelectorAll('[data-del]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.dataset.del;
      if (confirm('Remover associado?')) {
        state.associados = state.associados.filter(x=>x.id!==id);
        saveState(); renderAssociados(); renderKPIs();
      }
    });
  });
}

function renderTimes() {
  const wrap = el('#listaTimes');
  wrap.innerHTML = '';
  toggleEmpty('#emptyTimes', state.times.length === 0);

  state.times.forEach(t=>{
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-head">
        <h3>${t.nome} <span class="small">(${t.categoria || '-'})</span></h3>
        <div class="card-actions">
          <button class="btn small" data-edit="${t.id}"><span class="material-symbols-rounded">edit</span></button>
          <button class="btn small outline" data-del="${t.id}"><span class="material-symbols-rounded">delete</span></button>
        </div>
      </div>
      <div class="stat"><span class="label">Uniforme</span><span class="value">${t.cor || '-'}</span></div>
      <div class="stat"><span class="label">Jogadores</span><span class="value">${(t.jogadores||[]).length}</span></div>
      ${Array.isArray(t.jogadores) && t.jogadores.length ? `
      <div class="table-wrap" style="margin-top:8px">
        <table class="table">
          <thead><tr><th>#</th><th>Nome</th></tr></thead>
          <tbody>
            ${t.jogadores.map((j,i)=>`<tr><td data-label="#">${i+1}</td><td data-label="Nome">${j}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>` : ''
      }
    `;
    wrap.appendChild(card);

    // actions
    card.querySelector('[data-edit]').addEventListener('click', ()=>{
      const f = el('#formTime');
      f.id.value = t.id; f.nome.value = t.nome; f.categoria.value = t.categoria || 'Livre';
      f.cor.value = t.cor || ''; f.jogadores.value = (t.jogadores||[]).join(', ');
      openModal('#modalTime');
    });
    card.querySelector('[data-del]').addEventListener('click', ()=>{
      if (confirm('Remover time?')) {
        state.times = state.times.filter(x=>x.id!==t.id);
        saveState(); renderTimes(); renderSelectTimes(); renderReservas();
      }
    });
  });
}

function renderSelectTimes() {
  const sel = el('#selectTimeReserva');
  sel.innerHTML = `<option value="">Selecione</option>` + state.times.map(t=>`<option value="${t.nome}">${t.nome}</option>`).join('');
}

function renderReservas() {
  const tbody = el('#tabelaReservas tbody');
  tbody.innerHTML = '';

  const sorted = [...state.reservas].sort((a,b)=> (a.data+a.hora).localeCompare(b.data+b.hora));
  toggleEmpty('#emptyReservas', sorted.length === 0);

  sorted.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Data">${fmtDate(r.data)}</td>
      <td data-label="Hora">${r.hora}</td>
      <td data-label="Quadra/Campo">${r.local}</td>
      <td data-label="Time">${r.time || '-'}</td>
      <td data-label="Valor">${BRL(r.valor || 0)}</td>
      <td data-label="Status">${badgeStatus(r.status || '-')}</td>
      <td data-label="Ações">
        <div class="actions">
          <button class="btn small" data-edit="${r.id}"><span class="material-symbols-rounded">edit</span></button>
          <button class="btn small outline" data-del="${r.id}"><span class="material-symbols-rounded">delete</span></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // actions
  tbody.querySelectorAll('[data-edit]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.dataset.edit;
      const r = state.reservas.find(x=>x.id===id);
      const f = el('#formReserva');
      f.id.value = r.id; f.data.value = r.data; f.hora.value = r.hora;
      f.local.value = r.local; f.time.value = r.time || ''; f.valor.value = r.valor || 0; f.status.value = r.status || 'Confirmada';
      openModal('#modalReserva');
    });
  });
  tbody.querySelectorAll('[data-del]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.dataset.del;
      if (confirm('Remover reserva?')) {
        state.reservas = state.reservas.filter(x=>x.id!==id);
        saveState(); renderReservas(); renderKPIs();
      }
    });
  });
}

function recalcCaixa() {
  // Recalcular saldos com base nos lançamentos
  const despesas = state.lancamentos.filter(l=>l.tipo==='Despesa').reduce((s,l)=>s+l.valor,0);
  const pendentes = state.lancamentos.filter(l=>l.tipo==='Pendente').reduce((s,l)=>s+l.valor,0);

  el('#entradaDia').textContent = BRL(calcEntradaDia());
  el('#despesaDia').textContent = BRL(despesas);
  el('#pendentesDia').textContent = BRL(pendentes);
  el('#saldoAnterior').textContent = BRL(state.caixa.saldoAnterior || 0);
  el('#saldoAtual').textContent = BRL(calcSaldoAtual());
}

function calcEntradaDia() {
  const hoje = new Date().toISOString().slice(0,10);
  return state.lancamentos.filter(l=>l.tipo==='Entrada' && l.data===hoje).reduce((s,l)=>s+l.valor,0);
}
function calcSaldoAtual() {
  const entradas = state.lancamentos.filter(l=>l.tipo==='Entrada').reduce((s,l)=>s+l.valor,0);
  const despesas = state.lancamentos.filter(l=>l.tipo==='Despesa').reduce((s,l)=>s+l.valor,0);
  return (state.caixa.saldoAnterior || 0) + entradas - despesas;
}

function renderFinanceiro() {
  const tbody = el('#tabelaLancamentos tbody');
  tbody.innerHTML = '';
  const sorted = [...state.lancamentos].sort((a,b)=> (a.data).localeCompare(b.data));

  toggleEmpty('#emptyLanc', sorted.length === 0);

  sorted.forEach(l=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td data-label="Data">${fmtDate(l.data)}</td>
      <td data-label="Descrição">${l.descricao}</td>
      <td data-label="Tipo">${l.tipo}</td>
      <td data-label="Valor">${BRL(l.valor)}</td>
      <td data-label="Resp.">${l.responsavel || '-'}</td>
      <td data-label="Ações">
        <div class="actions">
          <button class="btn small" data-edit="${l.id}"><span class="material-symbols-rounded">edit</span></button>
          <button class="btn small outline" data-del="${l.id}"><span class="material-symbols-rounded">delete</span></button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // actions
  tbody.querySelectorAll('[data-edit]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.dataset.edit;
      const l = state.lancamentos.find(x=>x.id===id);
      const f = el('#formLancamento');
      f.id.value = l.id; f.data.value = l.data; f.descricao.value = l.descricao;
      f.tipo.value = l.tipo; f.valor.value = l.valor; f.responsavel.value = l.responsavel || '';
      openModal('#modalLancamento');
    });
  });
  tbody.querySelectorAll('[data-del]').forEach(b=>{
    b.addEventListener('click', ()=>{
      const id = b.dataset.del;
      if (confirm('Remover lançamento?')) {
        state.lancamentos = state.lancamentos.filter(x=>x.id!==id);
        recalcCaixa(); saveState(); renderFinanceiro(); renderKPIs();
      }
    });
  });
}

function renderRelatorio() {
  const elc = el('#relatorioConteudo');
  const mes = el('#mesRelatorio').value || new Date().toISOString().slice(0,7);
  const [yy, mm] = mes.split('-').map(Number);
  const inMonth = (dateStr) => {
    if (!dateStr) return false;
    const d = new Date(dateStr + 'T00:00:00');
    return d.getFullYear() === yy && (d.getMonth()+1) === mm;
  };

  const reservasMes = state.reservas.filter(r=>inMonth(r.data));
  const lancMes = state.lancamentos.filter(l=>inMonth(l.data));

  const entradas = lancMes.filter(l=>l.tipo==='Entrada').reduce((s,l)=>s+l.valor,0);
  const despesas = lancMes.filter(l=>l.tipo==='Despesa').reduce((s,l)=>s+l.valor,0);
  const pend = lancMes.filter(l=>l.tipo==='Pendente').reduce((s,l)=>s+l.valor,0);

  elc.innerHTML = `
    <div class="section">
      <h4>Resumo Financeiro — ${fmtMonth(mes)}</h4>
      <p>Entradas: <b>${BRL(entradas)}</b> | Despesas: <b>${BRL(despesas)}</b> | Pendentes: <b>${BRL(pend)}</b></p>
      <p>Saldo Anterior (global): <b>${BRL(state.caixa.saldoAnterior || 0)}</b> | Saldo Atual (global): <b>${BRL(calcSaldoAtual())}</b></p>
    </div>
    <div class="section">
      <h4>Reservas — ${fmtMonth(mes)}</h4>
      ${reservasMes.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Data</th><th>Hora</th><th>Local</th><th>Time</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody>
              ${reservasMes.map(r=>`
                <tr>
                  <td data-label="Data">${fmtDate(r.data)}</td><td data-label="Hora">${r.hora}</td><td data-label="Local">${r.local}</td>
                  <td data-label="Time">${r.time || '-'}</td><td data-label="Valor">${BRL(r.valor || 0)}</td><td data-label="Status">${r.status}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `<p>Nenhuma reserva no período.</p>`
      }
    </div>
    <div class="section">
      <h4>Lançamentos — ${fmtMonth(mes)}</h4>
      ${lancMes.length ? `
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Resp.</th></tr></thead>
            <tbody>
              ${lancMes.map(l=>`
                <tr>
                  <td data-label="Data">${fmtDate(l.data)}</td><td data-label="Descrição">${l.descricao}</td><td data-label="Tipo">${l.tipo}</td>
                  <td data-label="Valor">${BRL(l.valor)}</td><td data-label="Resp.">${l.responsavel || '-'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `<p>Nenhum lançamento no período.</p>`
      }
    </div>
  `;

  // Garante valor no input
  el('#mesRelatorio').value = mes;
}

// Exportações e compartilhamento
async function exportPDFMain() {
  await exportPDF(el('#pdfArea'), `Planilha_Futebol_${dateSlug()}.pdf`);
}

async function exportPDFRelatorio() {
  await exportPDF(el('#relatorioConteudo'), `Relatorio_${fmtMonth(el('#mesRelatorio').value)}_${dateSlug()}.pdf`, {scale:2});
}

async function exportPDF(domNode, filename, opts={}) {
  const { jsPDF } = window.jspdf;
  const canvas = await html2canvas(domNode, { scale: opts.scale || 1.4, backgroundColor: '#0e1116', useCORS: true });
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = canvas.height * imgWidth / canvas.width;

  let position = 0;
  let heightLeft = imgHeight;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
  return pdf;
}

function shareWhatsApp() {
  const resumo = gerarResumoTexto();
  const text = encodeURIComponent(resumo);
  window.open(`https://wa.me/?text=${text}`, '_blank');
}

async function shareNative() {
  try {
    const area = el('#relatorioConteudo');
    const blob = await nodeToPDFBlob(area);
    const file = new File([blob], `Relatorio_${dateSlug()}.pdf`, { type: 'application/pdf' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'Relatório de Futebol',
        text: 'Segue o relatório gerado.',
        files: [file]
      });
    } else {
      alert('Compartilhamento de arquivo não suportado neste navegador. Use o botão WhatsApp (texto) ou Exportar PDF.');
    }
  } catch (e) {
    console.error(e);
    alert('Falha ao compartilhar. Tente exportar como PDF e enviar manualmente.');
  }
}

async function nodeToPDFBlob(node) {
  const { jsPDF } = window.jspdf;
  const canvas = await html2canvas(node, { scale: 2, backgroundColor: '#0e1116' });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgWidth = pageWidth;
  const imgHeight = canvas.height * imgWidth / canvas.width;
  let position = 0; let heightLeft = imgHeight;
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pdf.internal.pageSize.getHeight();
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();
  }
  return pdf.output('blob');
}

// CSV
function exportAssociadosCSV() {
  const headers = ['Nome','Telefone','Posição','Status','Mensalidade'];
  const rows = state.associados.map(a=>[a.nome,a.telefone||'',a.posicao||'',a.status||'',(a.mensalidade||0).toString()]);
  const csv = [headers, ...rows].map(r => r.map(s=>`"${(s||'').toString().replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `Associados_${dateSlug()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// Auxiliares
function toggleEmpty(sel, show) {
  const box = el(sel);
  if (!box) return;
  box.classList.toggle('hidden', !show);
}
function badgeStatus(s) {
  const color = s==='Ativo' || s==='Confirmada' ? 'var(--success)'
    : s==='Pendente' ? 'var(--accent)' : 'var(--danger)';
  return `<span style="background:${color}22;color:${color};padding:4px 8px;border-radius:8px;border:1px solid ${color}55">${s}</span>`;
}
function fmtDate(iso) {
  if (!iso) return '-';
  try {
    const [y,m,d]=iso.split('-').map(Number);
    return new Date(y,m-1,d).toLocaleDateString('pt-BR');
  } catch { return iso; }
}
function fmtMonth(ym='') {
  const [y,m] = ym.split('-').map(Number);
  const date = new Date(y || new Date().getFullYear(), ((m||1)-1), 1);
  return date.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
}
function dateSlug() {
  const d = new Date();
  const pad = (n)=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}
function uid(){ return Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4); }

// Resumo textual para WhatsApp/PDF
function gerarResumoTexto() {
  const hoje = new Date().toLocaleString('pt-BR');
  const ativos = state.associados.filter(a=>a.status==='Ativo').length;
  const pend = state.associados.filter(a=>a.status==='Pendente').length;
  const reservasHoje = state.reservas.filter(r=>r.data===new Date().toISOString().slice(0,10));
  const entrada = calcEntradaDia();
  const saldo = calcSaldoAtual();
  const obs = (state.observacoes || '').trim();

  let txt = `PLANILHA — FUTEBOL (${hoje})\n`;
  txt += `Associados ativos: ${ativos} | Pendentes: ${pend}\n`;
  txt += `Reservas de hoje: ${reservasHoje.length}\n`;
  reservasHoje.forEach(r=>{
    txt += `• ${fmtDate(r.data)} ${r.hora} — ${r.local} — ${r.time || '-'} — ${BRL(r.valor || 0)} (${r.status})\n`;
  });
  txt += `\nFinanceiro:\n`;
  txt += `Saldo anterior: ${BRL(state.caixa.saldoAnterior || 0)}\n`;
  txt += `Entrada do dia: ${BRL(entrada)}\n`;
  txt += `Saldo atual: ${BRL(saldo)}\n`;
  if (obs) {
    txt += `\nObservações:\n${obs}\n`;
  }
  return txt;
}

// Atualiza resumo ao mudar campos relevantes
['observacoes'].forEach(id=>{
  el('#'+id)?.addEventListener('input', ()=>{
    el('#resumoDia').textContent = gerarResumoTexto();
  });
});
