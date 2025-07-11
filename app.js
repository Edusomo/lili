class SalaryTracker {
    constructor() {
        // Flag para controlar se está inicializando
        this.isInitializing = true;
        
        this.records = [];
        this.employees = [];
        this.currentPage = 1;
        this.recordsPerPage = 8;
        this.currentFilter = null; // null = todos, string = funcionário específico
        this.editingId = null;
        this.pendingAction = null;
        
        // Garantir que modais estão ocultos desde o início
        this.forceHideModals();
        
        this.initializeData();
        this.bindEvents();
        
        // Só renderizar após inicialização completa
        setTimeout(() => {
            this.isInitializing = false;
            this.render();
        }, 100);
    }

    forceHideModals() {
        // Garantir que todos os modais estejam ocultos
        const confirmModal = document.getElementById('confirmation-modal');
        const editModal = document.getElementById('edit-modal');
        
        if (confirmModal) {
            confirmModal.classList.add('hidden');
            confirmModal.style.display = 'none';
        }
        if (editModal) {
            editModal.classList.add('hidden');
            editModal.style.display = 'none';
        }
        
        // Garantir que o body não tenha overflow hidden
        document.body.style.overflow = '';
    }

    initializeData() {
        // Carregar dados do localStorage ou usar dados de exemplo
        const stored = localStorage.getItem('salaryRecords');
        if (stored) {
            try {
                this.records = JSON.parse(stored);
            } catch (e) {
                console.error('Erro ao carregar dados do localStorage:', e);
                this.records = this.getInitialData();
                this.saveData();
            }
        } else {
            // Dados de exemplo iniciais
            this.records = this.getInitialData();
            this.saveData();
        }

        const savedEmployees = localStorage.getItem('employees');
        if (savedEmployees) {
            this.employees = JSON.parse(savedEmployees);
        }
    }

    getInitialData() {
        return [
            {
                id: "1",
                employee: "João Silva",
                date: "2025-05-30",
                amount: 120.00,
                note: "Trabalho normal 8h",
                paid: false,
                timestamp: "2025-05-30T20:00:00.000Z"
            },
            {
                id: "2", 
                employee: "Maria Santos",
                date: "2025-05-30",
                amount: -20.00,
                note: "Desconto material",
                paid: false,
                timestamp: "2025-05-30T20:30:00.000Z"
            },
            {
                id: "3",
                employee: "João Silva", 
                date: "2025-05-29",
                amount: 150.00,
                note: "Trabalho extra",
                paid: false,
                timestamp: "2025-05-29T18:00:00.000Z"
            },
            {
                id: "4",
                employee: "Ana Costa",
                date: "2025-05-28",
                amount: 100.00,
                note: "Meio período",
                paid: false,
                timestamp: "2025-05-28T15:00:00.000Z"
            },
            {
                id: "5",
                employee: "Maria Santos",
                date: "2025-05-28",
                amount: 130.00,
                note: "Trabalho normal",
                paid: false,
                timestamp: "2025-05-28T16:00:00.000Z"
            },
            {
                id: "6",
                employee: "Pedro Lima",
                date: "2025-05-27",
                amount: 80.00,
                note: "4 horas",
                paid: false,
                timestamp: "2025-05-27T14:00:00.000Z"
            }
        ];
    }

    bindEvents() {
        // Não adicionar eventos durante a inicialização para evitar disparos acidentais
        if (this.isInitializing) {
            return;
        }

        // Formulário de novo registro
        const salaryForm = document.getElementById('salary-form');
        if (salaryForm) {
            salaryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addRecord();
            });
        }

        // Exportação
        const exportPdfBtn = document.getElementById('export-pdf');
        const exportExcelBtn = document.getElementById('export-excel');
        
        if (exportPdfBtn) {
            exportPdfBtn.addEventListener('click', () => {
                this.exportToPDF();
            });
        }

        if (exportExcelBtn) {
            exportExcelBtn.addEventListener('click', () => {
                this.exportToExcel();
            });
        }

        // Modais
        this.bindModalEvents();
    }

    bindModalEvents() {
        // Não configurar eventos de modal durante inicialização
        if (this.isInitializing) {
            return;
        }

        // Modal de confirmação
        const confirmModal = document.getElementById('confirmation-modal');
        const modalCancel = document.getElementById('modal-cancel');
        const modalConfirm = document.getElementById('modal-confirm');
        
        if (modalCancel) {
            modalCancel.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.cancelConfirmation();
            });
        }

        if (modalConfirm) {
            modalConfirm.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.executeConfirmation();
            });
        }

        // Modal de edição
        const editModal = document.getElementById('edit-modal');
        const editCancel = document.getElementById('edit-cancel');
        const editForm = document.getElementById('edit-form');
        
        if (editCancel) {
            editCancel.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.cancelEdit();
            });
        }

        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveEdit();
            });
        }

        // Fechar modal clicando no overlay
        if (confirmModal) {
            confirmModal.addEventListener('click', (e) => {
                if (e.target === confirmModal || e.target.classList.contains('modal__overlay')) {
                    this.cancelConfirmation();
                }
            });
        }

        if (editModal) {
            editModal.addEventListener('click', (e) => {
                if (e.target === editModal || e.target.classList.contains('modal__overlay')) {
                    this.cancelEdit();
                }
            });
        }

        // ESC para fechar modais
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (confirmModal && !confirmModal.classList.contains('hidden')) {
                    this.cancelConfirmation();
                }
                if (editModal && !editModal.classList.contains('hidden')) {
                    this.cancelEdit();
                }
            }
        });
    }

    cancelConfirmation() {
        this.pendingAction = null;
        this.hideModal('confirmation-modal');
    }

    executeConfirmation() {
        if (this.pendingAction) {
            this.pendingAction();
            this.pendingAction = null;
        }
        this.hideModal('confirmation-modal');
    }

    cancelEdit() {
        this.editingId = null;
        this.hideModal('edit-modal');
        // Limpar formulário
        const editForm = document.getElementById('edit-form');
        if (editForm) {
            editForm.reset();
        }
    }

    normalizeEmployeeName(name) {
        return name.toLowerCase().trim().split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    addRecord() {
        const form = document.getElementById('salary-form');
        if (!form) return;

        const formData = new FormData(form);
        const employeeName = this.normalizeEmployeeName(formData.get('employee'));
        if (!this.employees.includes(employeeName)) {
            this.employees.push(employeeName);
            localStorage.setItem('employees', JSON.stringify(this.employees));
        }

        // Verifica se é um novo funcionário (não existe nenhum registro, nem invisível)
        const jaExiste = this.records.some(r => r.employee === employeeName);
        if (!jaExiste) {
            this.records.unshift({
                id: 'ghost-' + Date.now(),
                employee: employeeName,
                date: new Date().toISOString().split('T')[0],
                amount: 0,
                note: '',
                paid: false,
                timestamp: new Date().toISOString(),
                invisivel: true
            });
        }

        const record = {
            id: Date.now().toString(),
            employee: employeeName,
            date: formData.get('date'),
            amount: parseFloat(formData.get('amount')),
            note: formData.get('note') || '',
            paid: false,
            timestamp: new Date().toISOString()
        };

        this.records.unshift(record);
        this.saveData();
        form.reset();

        // Definir data atual como padrão
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        this.showFeedback('✅ Registro salvo com sucesso!', 'success');
        this.render();
   }

    addRecordFromModal(data) {
  const employeeName = this.normalizeEmployeeName(data.employee);
  if (!this.employees.includes(employeeName)) {
    this.employees.push(employeeName);
    localStorage.setItem('employees', JSON.stringify(this.employees));
  }
  const jaExiste = this.records.some(r => r.employee === employeeName);
  if (!jaExiste) {
    this.records.unshift({
      id: 'ghost-' + Date.now(),
      employee: employeeName,
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      note: '',
      paid: false,
      timestamp: new Date().toISOString(),
      invisivel: true
    });
  }
  const record = {
    id: Date.now().toString(),
    employee: employeeName,
    date: data.date,
    amount: parseFloat(data.amount),
    note: data.note || '',
    paid: false,
    timestamp: new Date().toISOString()
  };
  this.records.unshift(record);
  this.saveData();
  this.showFeedback('✅ Registro salvo com sucesso!', 'success');
  this.render();
    }

    editRecord(id) {
        // Não permitir edição durante inicialização
        if (this.isInitializing) return;

        const record = this.records.find(r => r.id === id);
        if (!record) return;

        this.editingId = id;
        
        const editEmployee = document.getElementById('edit-employee');
        const editDate = document.getElementById('edit-date');
        const editAmount = document.getElementById('edit-amount');
        const editNote = document.getElementById('edit-note');

        if (editEmployee) editEmployee.value = record.employee;
        if (editDate) editDate.value = record.date;
        if (editAmount) editAmount.value = record.amount;
        if (editNote) editNote.value = record.note;

        // --- HABILITAR BOTÃO SALVAR APENAS SE HOUVER ALTERAÇÃO ---
        const saveBtn = document.querySelector('#edit-form button[type="submit"]');
        if (saveBtn) {
            // Estado original
            const original = {
                employee: editEmployee ? editEmployee.value : '',
                date: editDate ? editDate.value : '',
                amount: editAmount ? editAmount.value : '',
                note: editNote ? editNote.value : ''
            };
            function shallowEqual(obj1, obj2) {
                return Object.keys(obj1).every(k => obj1[k] == obj2[k]) &&
                       Object.keys(obj2).every(k => obj1[k] == obj2[k]);
            }
            function updateState() {
                const current = {
                    employee: editEmployee ? editEmployee.value : '',
                    date: editDate ? editDate.value : '',
                    amount: editAmount ? editAmount.value : '',
                    note: editNote ? editNote.value : ''
                };
                saveBtn.disabled = shallowEqual(current, original);
            }
            // Inicializa estado do botão
            updateState();
            // Observa mudanças
            ['input', 'change'].forEach(ev =>
                document.getElementById('edit-form').addEventListener(ev, updateState)
            );
        }
        // --------------------------------------------------------

        this.showModal('edit-modal');
    }

    saveEdit() {
        const form = document.getElementById('edit-form');
        if (!form) return;

        const formData = new FormData(form);
        
        const recordIndex = this.records.findIndex(r => r.id === this.editingId);
        if (recordIndex === -1) return;

        this.records[recordIndex] = {
            ...this.records[recordIndex],
            employee: this.normalizeEmployeeName(formData.get('employee')),
            date: formData.get('date'),
            amount: parseFloat(formData.get('amount')),
            note: formData.get('note') || ''
        };

        this.saveData();
        this.hideModal('edit-modal');
        this.editingId = null;
        this.render();

        // --- AVISO DE EDIÇÃO ---
        this.showFeedback('✏️ Registro editado com sucesso!', 'success');
    }

    deleteRecord(id) {
        // Não permitir exclusão durante inicialização
        if (this.isInitializing) return;

        this.showConfirmation(
            '🗑️ Excluir Registro',
            'Tem certeza que deseja excluir este registro?',
            () => {
                this.records = this.records.filter(r => r.id !== id);
                this.saveData();
                this.showFeedback('🗑️ Registro excluído com sucesso!', 'success'); // <-- Adicione esta linha
                this.render();
            }
        );
    }

    markAsPaid(employee) {
        // Não permitir marcar como pago durante inicialização
        if (this.isInitializing) return;

        this.showConfirmation(
            '💰 Marcar como Pago',
            `Tem certeza que deseja marcar todos os registros de ${employee} como pagos?`,
            () => {
                this.records.forEach(record => {
                    if (record.employee.toLowerCase() === employee.toLowerCase()) {
                        record.paid = true;
                    }
                });
                this.saveData();
                this.render();
            }
        );
    }

    deleteEmployee(employee) {
        // Não permitir exclusão durante inicialização
        if (this.isInitializing) return;

        this.showConfirmation(
            '❌ Excluir Funcionário',
            `Tem certeza que deseja excluir TODOS os registros de ${employee}?`,
            () => {
                this.records = this.records.filter(r => r.employee.toLowerCase() !== employee.toLowerCase());
                this.employees = this.employees.filter(e => e.toLowerCase() !== employee.toLowerCase());
                localStorage.setItem('employees', JSON.stringify(this.employees));
                
                // Se estava filtrando por este funcionário, voltar para todos
                if (this.currentFilter && this.currentFilter.toLowerCase() === employee.toLowerCase()) {
                    this.currentFilter = null;
                }
                
                this.saveData();
                this.render();
            }
        );
    }

    showConfirmation(title, message, action) {
        // NUNCA mostrar confirmação durante inicialização
        if (this.isInitializing) return;

        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');

        if (modalTitle) modalTitle.textContent = title;
        if (modalMessage) modalMessage.textContent = message;
        
        this.pendingAction = action;
        this.showModal('confirmation-modal');
    }

    showModal(modalId) {
        if (this.isInitializing) return;
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open'); // <-- Adicione aqui
        setTimeout(() => {
            const focusable = modal.querySelector('input, button, textarea, select');
            if (focusable) focusable.focus();
        }, 100);
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.add('hidden');
        modal.style.display = 'none';
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open'); // <-- Adicione aqui
    }

    filterByEmployee(employee) {
        this.currentFilter = employee;
        this.currentPage = 1;
        this.render();
    }

    getFilteredRecords() {
        if (!this.currentFilter) {
            // Só mostra registros não invisíveis
            return this.records.filter(r => !r.invisivel);
        }
        return this.records.filter(record =>
            record.employee.toLowerCase() === this.currentFilter.toLowerCase() && !record.invisivel
        );
    }

    getEmployeeSummary() {
        const summary = {};

        this.records.forEach(record => {
            if (record.invisivel) return; // Pula registros invisíveis
            const employee = record.employee;
            if (!summary[employee]) {
                summary[employee] = {
                    total: 0,
                    count: 0,
                    unpaidTotal: 0,
                    unpaidCount: 0
                };
            }

            summary[employee].total += record.amount;
            summary[employee].count++;

            if (!record.paid) {
                summary[employee].unpaidTotal += record.amount;
                summary[employee].unpaidCount++;
            }
        });

        return summary;
    }

    renderEmployeeSummary() {
        const container = document.getElementById('employee-summary');
        if (!container) return;

        const summary = this.getEmployeeSummary();
        
        let html = '';
        
        // Card "Todos"
        const totalRecords = this.records.length;
        const totalAmount = this.records
            .filter(r => !r.paid)
            .reduce((sum, r) => sum + r.amount, 0);
        
        html += `
            <div class="employee-card employee-card--all ${!this.currentFilter ? 'employee-card--active' : ''}" 
                onclick="window.salaryTracker.filterByEmployee(null)">
                <div class="employee-card__header">
                    <h3 class="employee-card__name">📊 Total Geral</h3>
                </div>
                <div class="employee-card__total ${totalAmount >= 0 ? 'employee-card__total--positive' : 'employee-card__total--negative'}">
                    R$ ${totalAmount.toFixed(2)}
                </div>
            </div>
        `;
        
        // Cards dos funcionários
        this.employees.forEach(employee => {
            const registros = this.records.filter(r => r.employee === employee && !r.invisivel);
            const isActive = this.currentFilter && this.currentFilter.toLowerCase() === employee.toLowerCase();
            const data = summary[employee] || { unpaidTotal: 0, unpaidCount: 0, count: 0 };
            
            html += `
                <div class="employee-card ${isActive ? 'employee-card--active' : ''}" 
                     onclick="window.salaryTracker.filterByEmployee('${employee}')">
                    <div class="employee-card__header">
                        <h3 class="employee-card__name">👤 ${employee}</h3>
                        <button class="employee-card__delete" 
                                onclick="event.stopPropagation(); window.salaryTracker.deleteEmployee('${employee}')"
                                title="Excluir funcionário">
                            ✕
                        </button>
                    </div>
                    <div class="employee-card__total ${data.unpaidTotal >= 0 ? 'employee-card__total--positive' : 'employee-card__total--negative'}">
                        R$ ${data.unpaidTotal.toFixed(2)}
                    </div>
                    <div class="employee-card__records">
                        ${data.unpaidCount} pendente${data.unpaidCount !== 1 ? 's' : ''} de ${data.count} total
                    </div>
                    ${data.unpaidCount > 0 ? `
                        <button class="btn btn--sm btn--secondary btn-pago-parceiro" 
                                onclick="event.stopPropagation(); window.salaryTracker.markAsPaid('${employee}')"
                                style="margin-top: var(--space-12); width: 100%;">
                            💰 Marcar como Pago
                        </button>
                    ` : ''}
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

renderRecords() {
    const container = document.getElementById('records-list');
    const title = document.getElementById('records-title');
    const count = document.getElementById('records-count');
    if (!container) return;

    const filteredRecords = this.getFilteredRecords();
    const startIndex = (this.currentPage - 1) * this.recordsPerPage;
    const endIndex = startIndex + this.recordsPerPage;
    const pageRecords = filteredRecords.slice(startIndex, endIndex);

    // Atualizar título e contador
    if (title) {
        if (this.currentFilter) {
                title.textContent = `Registros de ${this.currentFilter}`;
        } else {
            title.textContent = 'Todos os Registros';
        }
    }
    if (count) {
        count.textContent = `${filteredRecords.length} registro${filteredRecords.length !== 1 ? 's' : ''}`;
    }

    if (pageRecords.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>📭 Nenhum registro encontrado</h3>
                <p>Adicione um novo registro usando o formulário acima.</p>
            </div>
        `;
        return;
    }

    // Agrupar por data
    const grupos = {};
    pageRecords.forEach(record => {
        if (!grupos[record.date]) grupos[record.date] = [];
        grupos[record.date].push(record);
    });
    // Ordenar datas decrescente
    const datasOrdenadas = Object.keys(grupos).sort((a, b) => new Date(b) - new Date(a));

    let html = '';
    datasOrdenadas.forEach((date, idx) => {
        // Cabeçalho da data com botão de expandir/recolher
        const dataObj = new Date(date + 'T00:00:00');
        let dataFormatada = dataObj.toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        dataFormatada = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);

        const groupId = `group-${date.replace(/[^a-zA-Z0-9]/g, '')}`;
        html += `
            <div class="registros-group-header" style="margin-top:24px;margin-bottom:8px;">
                <button class="group-toggle" data-target="${groupId}" style="background:none;border:none;cursor:pointer;font-size:1em;">
                    <span class="seta-group" style="display:inline-block;transition:transform .2s;transform:rotate(0deg);">&#9654;</span>
                    <strong>${dataFormatada}</strong>
                </button>
            </div>
            <div id="${groupId}" class="registros-group-list" style="display:none;">
        `;

        grupos[date].forEach(record => {
            const amount = record.amount;
            const amountClass = amount >= 0 ? 'record-item__amount--positive' : 'record-item__amount--negative';
            const timestamp = new Date(record.timestamp);
            const hora = timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            html += `
                <div class="record-item ${record.paid ? 'record-item--paid' : ''}">
                    <div class="record-item__header">
                        <div class="record-item__info">
                            <div class="record-item__employee">👤 ${record.employee}</div>
                            <div class="record-item__date">📅 ${date.split('-').reverse().join('/')}</div>
                        </div>
                        <div class="record-item__amount ${amountClass}">
                            R$ ${amount.toFixed(2)}
                        </div>
                    </div>
                    ${record.note ? `<div class="record-item__note">📝 ${record.note}</div>` : ''}
                    <div class="record-item__actions">
                        <button class="btn btn--secondary" onclick="window.salaryTracker.editRecord('${record.id}')">
                            ✏️ Editar
                        </button>
                        <button class="btn btn--outline" onclick="window.salaryTracker.deleteRecord('${record.id}')">
                            🗑️ Excluir
                        </button>
                    </div>
                    <div class="record-time">
                         Registro no horário ${hora} (${timestamp.toLocaleDateString('pt-BR')})
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    });

    container.innerHTML = html;

    // Sempre expande todos os grupos por padrão
    container.querySelectorAll('.registros-group-list').forEach(list => {
        list.style.display = 'block';
    });
    container.querySelectorAll('.group-toggle .seta-group').forEach(seta => {
        seta.style.transform = 'rotate(90deg)';
    });

    // Adiciona eventos para expandir/recolher grupos
    container.querySelectorAll('.group-toggle').forEach(btn => {
        btn.onclick = function() {
            const target = btn.dataset.target;
            const list = document.getElementById(target);
            const seta = btn.querySelector('.seta-group');
            if (list.style.display === 'none') {
                list.style.display = 'block';
                seta.style.transform = 'rotate(90deg)';
            } else {
                list.style.display = 'none';
                seta.style.transform = 'rotate(0deg)';
            }
        };
    });
}

    renderPagination() {
        const container = document.getElementById('pagination');
        if (!container) return;

        const filteredRecords = this.getFilteredRecords();
        const totalPages = Math.ceil(filteredRecords.length / this.recordsPerPage);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }
        
        let html = '';
        
        // Botão anterior
        html += `
            <button class="pagination__button" 
                    ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="window.salaryTracker.goToPage(${this.currentPage - 1})">
                ← Anterior
            </button>
        `;
        
        // Números das páginas
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            html += `<button class="pagination__button" onclick="window.salaryTracker.goToPage(1)">1</button>`;
            if (startPage > 2) {
                html += `<span class="pagination__button">...</span>`;
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="pagination__button ${i === this.currentPage ? 'pagination__button--active' : ''}" 
                        onclick="window.salaryTracker.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += `<span class="pagination__button">...</span>`;
            }
            html += `<button class="pagination__button" onclick="window.salaryTracker.goToPage(${totalPages})">${totalPages}</button>`;
        }
        
        // Botão próximo
        html += `
            <button class="pagination__button" 
                    ${this.currentPage === totalPages ? 'disabled' : ''} 
                    onclick="window.salaryTracker.goToPage(${this.currentPage + 1})">
                Próximo →
            </button>
        `;
        
        // Info da página
        const startRecord = (this.currentPage - 1) * this.recordsPerPage + 1;
        const endRecord = Math.min(this.currentPage * this.recordsPerPage, filteredRecords.length);
        
        html += `
            <div class="pagination__info">
                Página ${this.currentPage} de ${totalPages} • 
                Registros ${startRecord}-${endRecord} de ${filteredRecords.length}
            </div>
        `;
        
        container.innerHTML = html;
    }

    goToPage(page) {
        const filteredRecords = this.getFilteredRecords();
        const totalPages = Math.ceil(filteredRecords.length / this.recordsPerPage);
        
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderRecords();
            this.renderPagination();
        }
    }

    exportToPDF() {
        // Simular exportação PDF usando window.print
        const printContent = this.generatePrintContent();
        const printWindow = window.open('', '_blank');
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>Relatório de Salários</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        h1 { color: #21808d; text-align: center; margin-bottom: 30px; }
                        .summary { margin: 20px 0; padding: 15px; background: #f5f5f5; border-radius: 8px; }
                        .summary h2 { margin-top: 0; color: #21808d; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { padding: 12px 8px; border: 1px solid #ddd; text-align: left; }
                        th { background: #21808d; color: white; font-weight: bold; }
                        .positive { color: #21808d; font-weight: bold; }
                        .negative { color: #c0152f; font-weight: bold; }
                        .paid { opacity: 0.6; background: #f9f9f9; }
                        .footer { margin-top: 30px; text-align: center; color: #666; font-size: 12px; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    ${printContent}
                    <div class="footer">
                        Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
                    </div>
                    <script>
                        setTimeout(() => {
                            window.print();
                            setTimeout(() => window.close(), 1000);
                        }, 500);
                    </script>
                </body>
            </html>
        `);
        
        printWindow.document.close();
    }

    exportToExcel() {
        const filteredRecords = this.getFilteredRecords();
        let csv = 'Funcionário,Data,Valor,Observações,Status\n';
        
        filteredRecords.forEach(record => {
            const date = new Date(record.date).toLocaleDateString('pt-BR');
            const amount = record.amount.toFixed(2).replace('.', ',');
            const status = record.paid ? 'Pago' : 'Pendente';
            const note = (record.note || '').replace(/,/g, ';').replace(/"/g, '""');
            
            csv += `"${record.employee}","${date}","R$ ${amount}","${note}","${status}"\n`;
        });
        
        // Adicionar BOM para UTF-8
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio-salarios-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    generatePrintContent() {
        const filteredRecords = this.getFilteredRecords();
        const summary = this.getEmployeeSummary();
        const totalAmount = this.records.reduce((sum, r) => sum + r.amount, 0);
        
        let content = `
            <h1>💰 Relatório de Salários</h1>
            <div class="summary">
                <h2>Resumo Geral</h2>
                <p><strong>Total de registros:</strong> ${this.records.length}</p>
                <p><strong>Valor total:</strong> R$ ${totalAmount.toFixed(2)}</p>
                <p><strong>Registros exibidos:</strong> ${filteredRecords.length}</p>
                
                <h3>Resumo por Funcionário</h3>
        `;
        
        Object.entries(summary).forEach(([employee, data]) => {
            content += `
                <p><strong>${employee}:</strong> 
                R$ ${data.unpaidTotal.toFixed(2)} 
                (${data.unpaidCount} pendente${data.unpaidCount !== 1 ? 's' : ''} de ${data.count} total)</p>
            `;
        });
        
        content += `
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Funcionário</th>
                        <th>Data</th>
                        <th>Valor</th>
                        <th>Observações</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        filteredRecords.forEach(record => {
            const date = new Date(record.date).toLocaleDateString('pt-BR');
            const amountClass = record.amount >= 0 ? 'positive' : 'negative';
            const rowClass = record.paid ? 'paid' : '';
            
            content += `
                <tr class="${rowClass}">
                    <td>${record.employee}</td>
                    <td>${date}</td>
                    <td class="${amountClass}">R$ ${record.amount.toFixed(2)}</td>
                    <td>${record.note || '-'}</td>
                    <td>${record.paid ? 'Pago' : 'Pendente'}</td>
                </tr>
            `;
        });
        
        content += `
                </tbody>
            </table>
        `;
        
        return content;
    }

    showFeedback(message, type = 'success') {
        let backgroundColor;
        switch(type) {
            case 'success':
                backgroundColor = 'var(--color-success, #21808d)';
                break;
            case 'warning':
                backgroundColor = 'var(--color-warning, #a84b2f)';
                break;
            case 'error':
                backgroundColor = 'var(--color-error, #c0152f)';
                break;
            case 'info':
                backgroundColor = 'var(--color-info, #626c71)';
                break;
            default:
                backgroundColor = 'var(--color-success, #21808d)';
        }

        const feedback = document.createElement('div');
        feedback.className = 'feedback-toast';
        feedback.textContent = message;
        feedback.style.background = backgroundColor;

        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transition = 'opacity 0.5s';
            setTimeout(() => {
                feedback.remove();
            }, 500);
        }, 3000);
    }

    saveData() {
        try {
            localStorage.setItem('salaryRecords', JSON.stringify(this.records));
        } catch (e) {
            console.error('Erro ao salvar dados no localStorage:', e);
        }
    }

    render() {
        // Só renderizar se não estiver inicializando
        if (this.isInitializing) return;

        this.renderEmployeeSummary();
        this.renderRecords();
        this.renderPagination();
    }
}

// Inicializar aplicação com proteções contra modais automáticos
document.addEventListener('DOMContentLoaded', function() {
    // Garantir que todos os modais estejam forçadamente ocultos
    const confirmModal = document.getElementById('confirmation-modal');
    const editModal = document.getElementById('edit-modal');
    
    if (confirmModal) {
        confirmModal.classList.add('hidden');
        confirmModal.style.display = 'none';
    }
    if (editModal) {
        editModal.classList.add('hidden');
        editModal.style.display = 'none';
    }
    
    // Garantir que o body não tenha overflow hidden
    document.body.style.overflow = '';
    
    // Aguardar um pouco antes de inicializar para garantir que DOM esteja pronto
    setTimeout(() => {
        // Inicializar a aplicação
        window.salaryTracker = new SalaryTracker();
        
        // Definir data atual como padrão no formulário
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        // Configurar eventos apenas após inicialização completa
        setTimeout(() => {
            if (window.salaryTracker && !window.salaryTracker.isInitializing) {
                window.salaryTracker.bindEvents();
            }
        }, 200);
    }, 50);

    // Função para atualizar sugestões de funcionários
    function updateEmployeeSuggestions() {
        const suggestionsDiv = document.getElementById('employee-suggestions');
        if (!suggestionsDiv || !window.salaryTracker) return;
        // Pega nomes únicos dos funcionários já cadastrados
        const employees = window.salaryTracker.employees;
        suggestionsDiv.innerHTML = '';
        employees.forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'employee-suggestion-btn';
            btn.title = name;
            btn.textContent = name;
            btn.onclick = () => {
                document.getElementById('employee').value = name;
                document.getElementById('employee').focus();
            };
            suggestionsDiv.appendChild(btn);
        });
    }

    // Atualiza sugestões ao inicializar e sempre que renderizar
    setTimeout(() => {
        if (window.salaryTracker) {
            updateEmployeeSuggestions();
            // Atualize também após adicionar novo registro
            const originalRender = window.salaryTracker.render.bind(window.salaryTracker);
            window.salaryTracker.render = function() {
                originalRender();
                updateEmployeeSuggestions();
            };
        }
    }, 300);

    // Botão flutuante para abrir modal
    const btnAdd = document.getElementById('btn-add-record');
    const modalAdd = document.getElementById('modal-add-record');
    const formAdd = document.getElementById('form-add-record');
    const btnCancel = document.getElementById('add-cancel');

    // Função para atualizar sugestões no modal
function updateEmployeeSuggestionsModal() {
  const suggestionsDiv = document.getElementById('employee-suggestions-modal');
  if (!suggestionsDiv || !window.salaryTracker) return;
  const employees = window.salaryTracker.employees;
  suggestionsDiv.innerHTML = '';
  employees.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'employee-suggestion-btn';
    btn.title = name;
    btn.textContent = name;
    btn.onclick = (e) => {
      e.preventDefault();
      document.getElementById('add-employee').value = name;
      document.getElementById('add-employee').focus();
    };
    suggestionsDiv.appendChild(btn);
  });
}

    if (btnAdd && modalAdd && formAdd && btnCancel) {
      btnAdd.onclick = () => {
        modalAdd.classList.remove('hidden');
        modalAdd.style.display = 'flex';
        // Esconde o botão flutuante ao abrir o modal
        btnAdd.style.display = 'none';
        // Data de hoje por padrão
        document.getElementById('add-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('add-employee').focus();
        updateEmployeeSuggestionsModal();
      };
      btnCancel.onclick = () => {
        modalAdd.classList.add('hidden');
        modalAdd.style.display = 'none';
        formAdd.reset();
        // Mostra o botão flutuante ao fechar o modal
        btnAdd.style.display = '';
      };
      modalAdd.querySelector('.modal__overlay').onclick = function(e) {
        if (e.target === this) {
          modalAdd.classList.add('hidden');
          modalAdd.style.display = 'none';
          formAdd.reset();
          // Mostra o botão flutuante ao fechar o modal
          btnAdd.style.display = '';
        }
      };
      formAdd.onsubmit = function(e) {
        e.preventDefault();
        // Adicione o registro usando a lógica do SalaryTracker
        if (window.salaryTracker) {
          const data = {
            employee: document.getElementById('add-employee').value,
            date: document.getElementById('add-date').value,
            amount: parseFloat(document.getElementById('add-amount').value),
            note: document.getElementById('add-note').value
          };
          window.salaryTracker.addRecordFromModal(data);
          modalAdd.classList.add('hidden');
          modalAdd.style.display = 'none';
          formAdd.reset();
          // Mostra o botão flutuante ao fechar o modal
          btnAdd.style.display = '';
        }
      };
    }

    function renderTransacoesParceirosGeral() {
  const container = document.getElementById('parceiro-transacoes-geral');
  if (!container) return;
  let html = '';
  ['Coco', 'Pastel', 'Gelo'].forEach(parc => {
    html += `<h3>${parc}</h3><ul>`;
    (registrosParceiros[parc] || []).forEach(reg => {
      html += `<li>${reg.data} - ${reg.quantidade} x R$${reg.preco} ${reg.observacao ? '- ' + reg.observacao : ''}</li>`;
    });
    html += '</ul>';
  });
  container.innerHTML = html;
}
});
