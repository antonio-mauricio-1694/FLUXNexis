import { Injectable } from '@angular/core';
import { Lancamento, db } from './db.service';

@Injectable({ providedIn: 'root' })
export class BackupService {

  async exportar(lancamentos: Lancamento[]): Promise<void> {
    const dados = lancamentos.map(({ id, ...resto }) => resto);
    const blob = new Blob([JSON.stringify(dados, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fluxnexis-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  importar(event: Event): Promise<Lancamento[]> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return Promise.resolve([]);

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const bruto = JSON.parse(String(reader.result)) as Lancamento[];
          const limpos = bruto.map(({ id, ...resto }) => resto as Lancamento);
          await db.lancamentos.bulkAdd(limpos);
          input.value = '';
          resolve(limpos);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }
}