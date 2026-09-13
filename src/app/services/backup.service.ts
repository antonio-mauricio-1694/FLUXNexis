import { Injectable } from '@angular/core';
import { Lancamento } from './db.service';
import { BackupFluxNexis } from './financeiro.model';
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BackupService {

  exportar(lancamentos: Lancamento[]): Promise<void> {
    const dados: BackupFluxNexis = {
      versao: '1.0.0',
      dataExportacao: new Date().toISOString(),
      lancamentos
    };

    const blob = new Blob([JSON.stringify(dados, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fluxnexis-backup-${new Date().toISOString().substring(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    return Promise.resolve();
  }

  lerArquivo(arquivo: File): Promise<BackupFluxNexis> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        try {
          const resultado = JSON.parse(e.target?.result as string) as BackupFluxNexis;
          if (!resultado.lancamentos || !Array.isArray(resultado.lancamentos)) {
            throw new Error('Arquivo de backup inválido ou corrompido.');
          }
          // Tratamento explícito com tipagem para evitar TS7006
          resultado.lancamentos = resultado.lancamentos.map((item: Lancamento) => ({
            ...item,
            valorRealizado: Number(item.valorRealizado) || 0,
            valorPrevisto: Number(item.valorPrevisto) || 0
          }));
          resolve(resultado);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(arquivo);
    });
  }
}