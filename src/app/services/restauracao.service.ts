import { Injectable } from '@angular/core';
import { Lancamento } from './db.service';
import { BackupFluxNexis } from './financeiro.model';

@Injectable({
  providedIn: 'root'
})
export class RestauracaoService {

  processarBackup(dadosBrutos: unknown): BackupFluxNexis {
    if (!dadosBrutos || typeof dadosBrutos !== 'object') {
      throw new Error('Formato de backup inválido.');
    }

    const backup = dadosBrutos as Partial<BackupFluxNexis>;

    if (!backup.lancamentos || !Array.isArray(backup.lancamentos)) {
      throw new Error('A lista de lançamentos no backup está ausente ou inválida.');
    }

    const lancamentosFormatados: Lancamento[] = backup.lancamentos.map((lancamento: Lancamento) => ({
      ...lancamento,
      valorRealizado: Number(lancamento.valorRealizado) || 0,
      valorPrevisto: Number(lancamento.valorPrevisto) || 0
    }));

    return {
      versao: backup.versao ?? '1.0.0',
      dataExportacao: backup.dataExportacao ?? new Date().toISOString(),
      lancamentos: lancamentosFormatados
    };
  }
}