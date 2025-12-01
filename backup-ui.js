/**
 * Interface UI para o Sistema de Backup
 * Gerencia eventos dos botões e atualiza interface
 */

function initBackupUI() {
  console.log('Inicializando backup UI...');
  
  // Event listener para o botão de backup na aba
  const backupTabButton = document.getElementById('btn-backup-tab');
  if (backupTabButton) {
    backupTabButton.addEventListener('click', () => {
      const modal = document.getElementById('modal-backup');
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        if (backupUI && backupUI.updateStats) {
          backupUI.updateStats();
        }
      }
    });
  }

  // Fechar modal ao clicar no overlay
  const backupModal = document.getElementById('modal-backup');
  if (backupModal) {
    const overlay = backupModal.querySelector('.modal__overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          backupModal.classList.add('hidden');
          backupModal.style.display = 'none';
        }
      });
    }

    // Botão fechar (X)
    const closeBtn = backupModal.querySelector('button[style*="margin-left"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        backupModal.classList.add('hidden');
        backupModal.style.display = 'none';
      });
    }
  }

  // Input file para importação
  const fileInput = document.getElementById('backup-file-input');
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && backupUI && backupUI.importFromFile) {
        backupUI.importFromFile(file);
      }
    });
  }

  console.log(' initBackupUI concluído');
}

/**
 * Objeto com funções UI do Backup
 */
const backupUI = {
  updateStats() {
    try {
      if (!backupSystem) {
        console.warn('backupSystem não disponível');
        return;
      }
      
      const stats = backupSystem.getStatistics();
      
      const updates = {
        'backup-size': backupSystem.formatBytes(stats.totalSize),
        'backup-salary-count': stats.recordsCount.salary || 0,
        'backup-employees-count': stats.recordsCount.employees || 0,
        'backup-parceiros-count': stats.recordsCount.parceiroRegistros || 0,
        'backup-vendas-count': stats.recordsCount.vendas || 0
      };
      
      Object.entries(updates).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      });
      
      // Atualiza último export manual (se disponível)
      try {
        const lastIso = stats.lastManualExport;
        const lastEl = document.getElementById('backup-last-export');
        if (lastEl) {
          lastEl.textContent = lastIso ? new Date(lastIso).toLocaleString('pt-BR') : 'Nenhuma exportação';
        }
      } catch (e) {}

      console.log(' Estatísticas atualizadas');
    } catch (e) {
      console.error('Erro ao atualizar estatísticas:', e);
    }
  },

  showAutoBackups() {
    try {
      if (!backupSystem) {
        alert('Sistema de backup não disponível');
        return;
      }
      
      const backups = backupSystem.listAutoBackups();
      if (backups.length === 0) {
        alert('Nenhum backup automático disponível');
        return;
      }

      const backupList = backups.map((b, i) => `${i + 1}. ${b.date}`).join('\n');
      alert(`Backups automáticos disponíveis:\n\n${backupList}`);
    } catch (e) {
      console.error('Erro ao listar backups:', e);
      alert('Erro ao listar backups: ' + e.message);
    }
  },

  async importFromFile(file) {
    try {
      if (!backupSystem) {
        alert('Sistema de backup não disponível');
        return;
      }
      
      const result = await backupSystem.loadFromFile(file);

      // Compatibilidade: se a função retornou diretamente o backup parsed (versões antigas),
      // restauramos e mostramos feedback.
      if (result && result.success === undefined && typeof result === 'object') {
        // Versão antiga: result é o backup em si
        backupSystem.restoreFromBackup(result);
        alert('✅ Backup restaurado com sucesso!');
        setTimeout(() => location.reload(), 1200);
        return;
      }

      if (result && result.success) {
        if (window.salaryTracker && window.salaryTracker.showFeedback) {
          window.salaryTracker.showFeedback('✅ ' + result.message, 'success');
        } else {
          alert(result.message);
        }

        setTimeout(() => {
          location.reload();
        }, 1500);
        return;
      }
    } catch (error) {
      const msg = (error && error.message) ? error.message : (typeof error === 'string' ? error : JSON.stringify(error));
      alert('❌ Erro ao importar: ' + msg);
      console.error('Erro ao importar:', error);
    }
  },

  restoreFromAutoBackup() {
    try {
      if (!backupSystem) {
        alert('Sistema de backup não disponível');
        return;
      }
      
      const result = backupSystem.restoreFromLastAutoBackup();
      if (result.success) {
        if (window.salaryTracker && window.salaryTracker.showFeedback) {
          window.salaryTracker.showFeedback(' ' + result.message, 'success');
        } else {
          alert(result.message);
        }

        setTimeout(() => {
          location.reload();
        }, 1500);
      } else {
        alert(' ' + result.message);
      }
    } catch (e) {
      console.error('Erro ao restaurar:', e);
      alert(' Erro ao restaurar: ' + e.message);
    }
  }
};

// Inicializar UI quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBackupUI);
} else {
  setTimeout(initBackupUI, 100);
}

console.log('Arquivo backup-ui.js carregado');
