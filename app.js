// Controle de Salários Diários - Mobile App
class SalaryControlApp {
    constructor() {
        // Dados simulados (em produção seria localStorage)
        this.registros = [
            {
                id: "1",
                funcionario: "João Silva",
                data: "2025-05-30",
                valor: 120.00,
                observacoes: "Trabalho normal 8h",
                status: "pendente"
            },
            {
                id: "2", 
                funcionario: "Maria Santos",
                data: "2025-05-30",
                valor: -20.00,
                observacoes: "Desconto material",
                status: "pendente"
            },
            {
                id: "3",
                funcionario: "João Silva",
                data: "2025-05-29",
                valor: 150.00,
                observacoes: "Trabalho extra",
                status: "pendente"
            }
        ];
        
        this.filtroAtual = "";
        this.editandoId = null;
        this.proximoId = 4;
        this.acaoModal = null;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setDataAtual();
        this.atualizarInterface();
    }
    
    setupEventListeners() {
        // Formulário
        document.getElementById('registroForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.salvarRegistro();
        });
        
        // Filtro de funcionário
        document.getElementById('filtroFuncionario').addEventListener('change', (e) => {
            this.filtroAtual = e.target.value;
            this.atualizarListaRegistros();
        });
        
        // Modal
        document.getElementById('modalCancelar').addEventListener('click', () => {
            this.fecharModal();
        });
        
        document.getElementById('modalConfirmar').addEventListener('click', () => {
            // Executar a ação e fechar imediatamente
            if (typeof this.acaoModal === 'function') {
                this.acaoModal();
            }
            this.fecharModal();
        });
    }
    
    setDataAtual() {
        const hoje = new Date().toISOString().split('T')[0];
        document.getElementById('data').value = hoje;
    }
    
    salvarRegistro() {
        const funcionario = document.getElementById('funcionario').value.trim();
        const data = document.getElementById('data').value;
        const valorInput = document.getElementById('valor').value;
        const observacoes = document.getElementById('observacoes').value.trim();
        
        if (!funcionario || !data || valorInput === '') {
            this.mostrarFeedback('⚠️ Preencha os campos obrigatórios!', 'warning');
            return;
        }
        
        const valor = parseFloat(valorInput);
        
        const registro = {
            id: this.editandoId || this.proximoId.toString(),
            funcionario: funcionario,
            data: data,
            valor: valor,
            observacoes: observacoes,
            status: "pendente"
        };
        
        if (this.editandoId) {
            // Editando registro existente
            const index = this.registros.findIndex(r => r.id === this.editandoId);
            if (index !== -1) {
                this.registros[index] = registro;
            }
            this.editandoId = null;
        } else {
            // Novo registro
            this.registros.push(registro);
            this.proximoId++;
        }
        
        // Limpar formulário
        document.getElementById('registroForm').reset();
        this.setDataAtual();
        this.atualizarInterface();
        
        // Feedback visual
        this.mostrarFeedback('✅ Registro salvo com sucesso!', 'success');
    }
    
    editarRegistro(id) {
        const registro = this.registros.find(r => r.id === id);
        if (!registro) return;
        
        this.editandoId = id;
        document.getElementById('funcionario').value = registro.funcionario;
        document.getElementById('data').value = registro.data;
        document.getElementById('valor').value = registro.valor;
        document.getElementById('observacoes').value = registro.observacoes;
        
        // Scroll para o formulário
        document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });
    }
    
    excluirRegistro(id) {
        const registro = this.registros.find(r => r.id === id);
        if (!registro) return;
        
        this.abrirModal(
            `Tem certeza que deseja excluir este registro de ${registro.funcionario}?`,
            () => {
                this.registros = this.registros.filter(r => r.id !== id);
                this.atualizarInterface();
                this.mostrarFeedback('🗑️ Registro excluído com sucesso!', 'success');
            }
        );
    }
    
    limparHistoricoFuncionario(funcionario) {
        const registrosPendentes = this.registros.filter(
            r => r.funcionario === funcionario && r.status === 'pendente'
        );
        
        if (registrosPendentes.length === 0) {
            this.mostrarFeedback('ℹ️ Não há registros pendentes para este funcionário', 'info');
            return;
        }
        
        this.abrirModal(
            `Marcar todos os registros de "${funcionario}" como pagos?<br><small>Os registros serão movidos para o histórico.</small>`,
            () => {
                // Marca todos os registros como pagos
                this.registros.forEach(registro => {
                    if (registro.funcionario === funcionario && registro.status === 'pendente') {
                        registro.status = 'pago';
                    }
                });
                
                // Atualiza a interface após a alteração
                this.atualizarInterface();
                this.mostrarFeedback('💰 Registros marcados como pagos!', 'success');
            }
        );
    }
    
    atualizarInterface() {
        this.atualizarFiltroFuncionarios();
        this.atualizarResumoFuncionarios();
        this.atualizarListaRegistros();
        this.atualizarTotalGeral();
    }
    
    atualizarFiltroFuncionarios() {
        const funcionarios = [...new Set(this.registros.map(r => r.funcionario))].sort();
        const select = document.getElementById('filtroFuncionario');
        
        // Preservar seleção atual
        const valorAtual = select.value;
        
        select.innerHTML = '<option value="">Todos os funcionários</option>';
        funcionarios.forEach(funcionario => {
            const option = document.createElement('option');
            option.value = funcionario;
            option.textContent = funcionario;
            select.appendChild(option);
        });
        
        // Restaurar seleção
        select.value = valorAtual;
    }
    
    atualizarResumoFuncionarios() {
        const funcionarios = [...new Set(this.registros.map(r => r.funcionario))].sort();
        const container = document.getElementById('resumoFuncionarios');
        
        if (funcionarios.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">👥</div><p class="empty-state__text">Nenhum funcionário cadastrado ainda</p></div>';
            return;
        }
        
        container.innerHTML = '';
        
        funcionarios.forEach(funcionario => {
            const registrosFuncionario = this.registros.filter(r => r.funcionario === funcionario);
            const totalPendente = registrosFuncionario
                .filter(r => r.status === 'pendente')
                .reduce((sum, r) => sum + r.valor, 0);
            const totalPago = registrosFuncionario
                .filter(r => r.status === 'pago')
                .reduce((sum, r) => sum + r.valor, 0);
            
            const card = document.createElement('div');
            card.className = 'funcionario-card';
            
            const valorClass = totalPendente > 0 ? 'valor-positivo' : 
                             totalPendente < 0 ? 'valor-negativo' : 'valor-zero';
            
            card.innerHTML = `
                <div class="funcionario-card__header">
                    <h4 class="funcionario-card__name">👤 ${funcionario}</h4>
                    <span class="status-badge status-badge--${registrosFuncionario.some(r => r.status === 'pendente') ? 'pendente' : 'pago'}">
                        ${registrosFuncionario.some(r => r.status === 'pendente') ? 'Pendente' : 'Pago'}
                    </span>
                </div>
                <div class="funcionario-card__total ${valorClass}">
                    Pendente: ${this.formatarMoeda(totalPendente)}
                </div>
                <div class="funcionario-card__total valor-positivo" style="font-size: var(--font-size-base); margin-bottom: var(--space-16);">
                    Histórico Pago: ${this.formatarMoeda(totalPago)}
                </div>
                <div class="funcionario-card__actions">
                    <button class="btn btn--outline btn--small" onclick="app.filtrarPorFuncionario('${funcionario}')">
                        🔍 Ver Registros
                    </button>
                    ${totalPendente !== 0 ? `
                        <button class="btn btn--success btn--small" onclick="app.limparHistoricoFuncionario('${funcionario}')">
                            💰 Marcar como Pago
                        </button>
                    ` : ''}
                </div>
            `;
            
            container.appendChild(card);
        });
    }
    
    filtrarPorFuncionario(funcionario) {
        document.getElementById('filtroFuncionario').value = funcionario;
        this.filtroAtual = funcionario;
        this.atualizarListaRegistros();
        
        // Scroll para a seção de registros
        document.querySelector('.registros-section').scrollIntoView({ behavior: 'smooth' });
    }
    
    atualizarListaRegistros() {
        let registrosFiltrados = this.registros;
        
        if (this.filtroAtual) {
            registrosFiltrados = this.registros.filter(r => r.funcionario === this.filtroAtual);
        }
        
        // Ordenar por data (mais recente primeiro)
        registrosFiltrados.sort((a, b) => new Date(b.data) - new Date(a.data));
        
        const container = document.getElementById('listaRegistros');
        
        if (registrosFiltrados.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state__icon">📋</div><p class="empty-state__text">Nenhum registro encontrado</p></div>';
            return;
        }
        
        container.innerHTML = '';
        
        registrosFiltrados.forEach(registro => {
            const item = document.createElement('div');
            item.className = 'registro-item';
            
            const valorClass = registro.valor > 0 ? 'valor-positivo' : 
                             registro.valor < 0 ? 'valor-negativo' : 'valor-zero';
            
            const dataFormatada = this.formatarData(registro.data);
            
            item.innerHTML = `
                <div class="registro-item__header">
                    <div class="registro-item__info">
                        <h4 class="registro-item__funcionario">${registro.funcionario}</h4>
                        <div class="registro-item__data">📅 ${dataFormatada}</div>
                    </div>
                    <div class="registro-item__valor ${valorClass}">
                        ${this.formatarMoeda(registro.valor)}
                    </div>
                </div>
                
                ${registro.observacoes ? `
                    <div class="registro-item__observacoes">
                        💭 ${registro.observacoes}
                    </div>
                ` : ''}
                
                <div class="flex justify-between items-center" style="margin-top: var(--space-12);">
                    <span class="status-badge status-badge--${registro.status}">
                        ${registro.status === 'pendente' ? 'Pendente' : 'Pago'}
                    </span>
                    
                    <div class="registro-item__actions">
                        <button class="btn btn--outline btn--small" onclick="app.editarRegistro('${registro.id}')">
                            ✏️ Editar
                        </button>
                        <button class="btn btn--danger btn--small" onclick="app.excluirRegistro('${registro.id}')">
                            🗑️ Excluir
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(item);
        });
    }
    
    atualizarTotalGeral() {
        let total = 0;
        
        if (this.filtroAtual) {
            total = this.registros
                .filter(r => r.funcionario === this.filtroAtual && r.status === 'pendente')
                .reduce((sum, r) => sum + r.valor, 0);
        } else {
            total = this.registros
                .filter(r => r.status === 'pendente')
                .reduce((sum, r) => sum + r.valor, 0);
        }
        
        const elemento = document.getElementById('totalGeral');
        elemento.textContent = this.formatarMoeda(total);
        elemento.className = `total-value ${total > 0 ? 'valor-positivo' : total < 0 ? 'valor-negativo' : 'valor-zero'}`;
    }
    
    formatarMoeda(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }
    
    formatarData(data) {
        return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
    }
    
    abrirModal(mensagem, callback) {
        document.getElementById('modalMensagem').innerHTML = mensagem;
        document.getElementById('modalConfirmacao').classList.remove('hidden');
        this.acaoModal = callback;
    }
    
    fecharModal() {
        document.getElementById('modalConfirmacao').classList.add('hidden');
        this.acaoModal = null;
    }
    
    mostrarFeedback(mensagem, tipo = 'success') {
        // Definir cores baseadas no tipo
        let backgroundColor, textColor;
        
        switch(tipo) {
            case 'success':
                backgroundColor = 'var(--color-success)';
                textColor = 'white';
                break;
            case 'warning':
                backgroundColor = 'var(--color-warning)';
                textColor = 'white';
                break;
            case 'error':
                backgroundColor = 'var(--color-error)';
                textColor = 'white';
                break;
            case 'info':
                backgroundColor = 'var(--color-info)';
                textColor = 'white';
                break;
            default:
                backgroundColor = 'var(--color-success)';
                textColor = 'white';
        }
        
        // Criar elemento de feedback
        const feedback = document.createElement('div');
        feedback.className = 'feedback-toast';
        feedback.textContent = mensagem;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${backgroundColor};
            color: ${textColor};
            padding: var(--space-12) var(--space-20);
            border-radius: var(--radius-base);
            font-weight: var(--font-weight-medium);
            z-index: 1001;
            box-shadow: var(--shadow-lg);
            font-size: var(--font-size-base);
            max-width: 90%;
            text-align: center;
        `;
        
        document.body.appendChild(feedback);
        
        // Remover após 3 segundos
        setTimeout(() => {
            feedback.style.opacity = '0';
            feedback.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                feedback.remove();
            }, 500);
        }, 3000);
    }
}

// Inicializar a aplicação
const app = new SalaryControlApp();

// Prevenir zoom duplo-toque no mobile
document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Inicializar lastTouchEnd
let lastTouchEnd = 0;