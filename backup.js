/**
 * Sistema de Backup e Restauração para o App de Controle de Salários
 * Oferece backup automático, sincronização com arquivo e importação de dados
 */

class BackupSystem {
  constructor() {
    this.BACKUP_KEYS = [
      'salaryRecords',
      'employees',
      'parceiroRegistros',
      'parceiroPrecos',
      'parceiroPrecosGelo',
      'vendasDia',
      'blocoNotas',
      'blocoNotasFontSize'
    ];

    this.BACKUP_VERSION = '2.0';
    this.AUTO_BACKUP_INTERVAL = 1000 * 60 * 5; // 5 minutos
    this.initAutoBackup();
  }

  captureAllData() {
    const backup = {
      version: this.BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      data: {},
      invalidJsonKeys: []
    };

    this.BACKUP_KEYS.forEach(key => {
      const value = localStorage.getItem(key);
      if (value === null || value === undefined) {
        backup.data[key] = null;
        return;
      }

      try {
        // Parse the stored value
        const parsed = JSON.parse(value);

        // Ajuste específico: remover 6 registros padrão de salário ao exportar/gerar backup.
        // Muitos usuários têm 6 registros "placeholder" (ex.: João, Mari, Ana...) que
        // permanecem mesmo quando aparentam ter zerado os registros. Removemos até 6
        // desses itens do array salvo para que o arquivo de backup não contenha os
        // placeholders por padrão. Usamos Math.max para evitar valores negativos.
        if (key === 'salaryRecords' && Array.isArray(parsed)) {
          const DEFAULT_REMOVE = 6;
          backup.data[key] = parsed.slice(0, Math.max(0, parsed.length - DEFAULT_REMOVE));
        } else {
          backup.data[key] = parsed;
        }
      } catch (e) {
        console.warn(`backupSystem: valor não-JSON em localStorage['${key}'] - armazenando como string`);
        backup.data[key] = value;
        backup.invalidJsonKeys.push(key);
      }
    });

    return backup;
  }

  restoreFromBackup(backup) {
    if (!backup || !backup.data) throw new Error('Formato de backup inválido');

    Object.entries(backup.data).forEach(([key, value]) => {
      if (value === null) {
        localStorage.removeItem(key);
      } else {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
          // fallback: if value is already a string
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        }
      }
    });

    return true;
  }

  exportAsJSON(filename = null) {
    const backup = this.captureAllData();
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const finalName = filename || `backup-${this.formatDate(new Date())}.json`;
    link.download = finalName;
    document.body.appendChild(link);
    try {
      link.click();
      try {
        localStorage.setItem('lastManualExport', new Date().toISOString());
      } catch (e) { /* ignore storage errors */ }
    } finally {
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  exportAsCSV(filename = null) {
    const backup = this.captureAllData();
    let csv = 'Chave,Data,Tipo,Conteudo\n';

    Object.entries(backup.data).forEach(([key, value]) => {
      const tipo = Array.isArray(value) ? 'Array' : typeof value;
      const conteudo = typeof value === 'string' ? value : JSON.stringify(value);
      const conteudoEscapado = (conteudo || '').replace(/"/g, '""');
      csv += `"${key}","${backup.timestamp}","${tipo}","${conteudoEscapado}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || `backup-${this.formatDate(new Date())}.csv`;
    document.body.appendChild(link);
    try { link.click(); } finally { document.body.removeChild(link); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }

  loadFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          let text = typeof e.target.result === 'string' ? e.target.result : String(e.target.result);
          if (text && text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
          text = (text || '').trim();

          let backup;
          try {
            backup = JSON.parse(text);
          } catch (parseErr) {
            const snippet = (text || '').slice(0, 120).replace(/\n/g, '\\n');
            return reject({ success: false, message: 'Arquivo selecionado não é um JSON válido: ' + parseErr.message + '. Conteúdo detectado: "' + snippet + '"' });
          }

          this.restoreFromBackup(backup);
          resolve({ success: true, message: 'Backup restaurado com sucesso!', backup: backup });
        } catch (err) {
          reject({ success: false, message: 'Erro ao processar arquivo: ' + (err && err.message ? err.message : err) });
        }
      };

      reader.onerror = () => reject({ success: false, message: 'Erro ao ler arquivo' });
      reader.readAsText(file);
    });
  }

  initAutoBackup() {
    try {
      setInterval(() => this.performAutoBackup(), this.AUTO_BACKUP_INTERVAL);
      window.addEventListener('beforeunload', () => this.performAutoBackup());
    } catch (e) { console.warn('Não foi possível inicializar auto-backup:', e); }
  }

  performAutoBackup() {
    try {
      const backup = this.captureAllData();
      const backups = JSON.parse(localStorage.getItem('autoBackups') || '[]');
      backups.push(backup);
      if (backups.length > 10) backups.shift();
      localStorage.setItem('autoBackups', JSON.stringify(backups));
      console.log(`✅ Backup automático realizado em ${backup.timestamp}`);
    } catch (e) { console.warn('Erro ao fazer backup automático:', e); }
  }

  restoreFromLastAutoBackup() {
    try {
      const backups = JSON.parse(localStorage.getItem('autoBackups') || '[]');
      if (!backups.length) throw new Error('Nenhum backup automático disponível');
      const last = backups[backups.length - 1];
      this.restoreFromBackup(last);
      return { success: true, message: `Restaurado de ${new Date(last.timestamp).toLocaleString('pt-BR')}`, backup: last };
    } catch (e) { return { success: false, message: 'Erro ao restaurar: ' + e.message }; }
  }

  listAutoBackups() {
    try { return JSON.parse(localStorage.getItem('autoBackups') || '[]'); } catch (e) { return []; }
  }

  calculateDataSize() {
    let total = 0;
    this.BACKUP_KEYS.forEach(k => { const v = localStorage.getItem(k); if (v) total += v.length; });
    return total;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes','KB','MB'], i = Math.floor(Math.log(bytes)/Math.log(k));
    return Math.round((bytes/Math.pow(k,i))*100)/100 + ' ' + sizes[i];
  }

  formatDate(date) {
    const y = date.getFullYear(); const m = String(date.getMonth()+1).padStart(2,'0'); const d = String(date.getDate()).padStart(2,'0');
    const h = String(date.getHours()).padStart(2,'0'); const min = String(date.getMinutes()).padStart(2,'0');
    return `${y}-${m}-${d}_${h}-${min}`;
  }

  getStatistics() {
    const stats = { totalSize: this.calculateDataSize(), recordsCount: { salary:0, employees:0, parceiroRegistros:0, vendas:0 }, lastBackup: null, autoBackupsCount:0 };

    try {
      const salary = localStorage.getItem('salaryRecords'); if (salary) { try { stats.recordsCount.salary = JSON.parse(salary).length; } catch(e){} }
      const employees = localStorage.getItem('employees'); if (employees) { try { stats.recordsCount.employees = JSON.parse(employees).length; } catch(e){} }
      const parceiroRegistros = localStorage.getItem('parceiroRegistros'); if (parceiroRegistros) { try { const r = JSON.parse(parceiroRegistros); stats.recordsCount.parceiroRegistros = (r.Coco?.length||0)+(r.Pastel?.length||0)+(r.Gelo?.length||0); } catch(e){} }
      const vendasDia = localStorage.getItem('vendasDia'); if (vendasDia) { try { stats.recordsCount.vendas = JSON.parse(vendasDia).length; } catch(e){} }

      const backups = JSON.parse(localStorage.getItem('autoBackups') || '[]'); stats.autoBackupsCount = backups.length; if (backups.length) stats.lastBackup = new Date(backups[backups.length-1].timestamp).toLocaleString('pt-BR');

      stats.lastManualExport = (function(){ try { const iso = localStorage.getItem('lastManualExport'); return iso ? new Date(iso).toISOString() : null; } catch(e){ return null; } })();
    } catch(e) { /* ignore */ }

    return stats;
  }

  async syncToCloud(apiUrl) {
    try {
      const backup = this.captureAllData();
      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(backup) });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      return { success:true, message:'Sincronizado com nuvem', result };
    } catch (e) { return { success:false, message: 'Erro ao sincronizar: ' + e.message }; }
  }
}

// Expor globalmente para evitar "backupSystem is not defined" em handlers inline
try { window.backupSystem = new BackupSystem(); } catch(e) { console.error('Erro ao inicializar backupSystem:', e); }
