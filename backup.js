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

          // Corrigido: não remover arbitrariamente os últimos 6 registros.
          // Em vez disso, excluímos apenas registros marcados como "invisivel"
          // (ghost/placeholder) caso existam, preservando os demais dados.
          if (key === 'salaryRecords') {
            // Preferir a fonte em memória quando disponível — evita inconsistências
            // se outra parte do app estiver atualizando localStorage ao mesmo tempo.
            let source = null;
            try {
              if (window && window.salaryTracker && Array.isArray(window.salaryTracker.records)) {
                // Clonar para não alterar o array original
                source = window.salaryTracker.records.slice();
                console.log(`[captureAllData] Usando fonte em memória: ${source.length} registros`);
              }
            } catch (err) {
              console.warn('[captureAllData] Erro ao acessar window.salaryTracker:', err);
              source = null;
            }

            if (!source && Array.isArray(parsed)) {
              source = parsed.slice();
              console.log(`[captureAllData] Usando localStorage: ${source.length} registros`);
            }

            if (Array.isArray(source)) {
              // Deduplicar por ID para evitar registros duplicados (por segurança)
              const seen = new Set();
              const deduped = [];
              source.forEach(item => {
                if (item && item.id) {
                  if (!seen.has(item.id)) {
                    seen.add(item.id);
                    deduped.push(item);
                  } else {
                    console.warn(`[captureAllData] Registro duplicado removido: ${item.id}`);
                  }
                } else {
                  deduped.push(item); // Registros sem ID sempre são incluídos
                }
              });
              console.log(`[captureAllData] ${source.length} registros capturados, ${deduped.length} após deduplicação`);
              backup.data[key] = deduped;
            } else {
              backup.data[key] = parsed;
            }
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
        return;
      }

      try {
        // Merge strategy for critical keys to avoid data loss on import
        if (key === 'salaryRecords' && Array.isArray(value)) {
          // Parse existing records (if any) and merge by `id`, keeping the most recent by timestamp
          let existing = [];
          try { existing = JSON.parse(localStorage.getItem('salaryRecords') || '[]'); } catch (e) { existing = []; }

          const map = new Map();
          existing.forEach(item => {
            if (item && item.id) map.set(item.id, item);
            else map.set('existing-' + Math.random().toString(36).slice(2,8), item);
          });

          value.forEach(item => {
            if (item && item.id) {
              const cur = map.get(item.id);
              if (!cur) map.set(item.id, item);
              else {
                const tCur = cur.timestamp ? new Date(cur.timestamp).getTime() : 0;
                const tNew = item.timestamp ? new Date(item.timestamp).getTime() : 0;
                if (tNew >= tCur) map.set(item.id, item);
              }
            } else {
              // item without id: add with generated key to avoid losing it
              map.set('import-' + Math.random().toString(36).slice(2,8), item);
            }
          });

          const merged = Array.from(map.values()).sort((a, b) => {
            const da = a && a.date ? new Date(a.date) : (a && a.timestamp ? new Date(a.timestamp) : new Date(0));
            const db = b && b.date ? new Date(b.date) : (b && b.timestamp ? new Date(b.timestamp) : new Date(0));
            return db - da;
          });

          localStorage.setItem(key, JSON.stringify(merged));
          return;
        }

        if (key === 'employees' && Array.isArray(value)) {
          // merge unique employee names
          let existing = [];
          try { existing = JSON.parse(localStorage.getItem('employees') || '[]'); } catch (e) { existing = []; }
          const set = new Set([...existing, ...value]);
          localStorage.setItem('employees', JSON.stringify(Array.from(set)));
          return;
        }

        // Default behavior: overwrite
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        // fallback: if value is already a string
        try {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
        } catch (err) {
          console.error('Erro ao restaurar chave', key, err);
        }
      }
    });

    return true;
  }

  exportAsJSON(filename = null) {
    // FORÇA sincronização: salva os dados em memória para localStorage ANTES de capturar
    // Isso resolve o problema de registros faltando na exportação
    if (window && window.salaryTracker && Array.isArray(window.salaryTracker.records)) {
      try {
        const records = window.salaryTracker.records;
        // Verificar duplicatas por ID em memória
        const idSet = new Set();
        let duplicados = 0;
        records.forEach(r => {
          if (r && r.id) {
            if (idSet.has(r.id)) duplicados++;
            idSet.add(r.id);
          }
        });
        if (duplicados > 0) {
          console.warn(`[exportAsJSON] ⚠️ Detectados ${duplicados} IDs duplicados em memória!`);
        }
        localStorage.setItem('salaryRecords', JSON.stringify(records));
        console.log(`[exportAsJSON] Sincronizados ${records.length} registros de salário para localStorage`);
      } catch (err) {
        console.warn('[exportAsJSON] Erro ao sincronizar salaryRecords:', err);
      }
    }

    const backup = this.captureAllData();
    const recordsCount = backup.data.salaryRecords ? (Array.isArray(backup.data.salaryRecords) ? backup.data.salaryRecords.length : 0) : 0;
    console.log(`[exportAsJSON] Capturados ${recordsCount} registros no backup`);
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
      console.log('[exportAsJSON] JSON exportado com sucesso');
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
      const salary = localStorage.getItem('salaryRecords'); 
      if (salary) { 
        try { 
          const records = JSON.parse(salary);
          // Contar apenas registros visíveis (sem "invisivel: true")
          const visibleCount = records.filter(r => !r.invisivel).length;
          stats.recordsCount.salary = visibleCount;
          console.log(`[getStatistics] Salários: ${records.length} total, ${visibleCount} visíveis`);
        } catch(e){} 
      }
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
