import { Injectable } from '@angular/core';

import * as XLSX from 'xlsx';

import { Lancamento } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class ExcelExportService {

  exportar(lancamentos: Lancamento[], mesAtual: string): void {

    const dadosTratados = lancamentos.map(item => ({
      'Data/Hora': new Date(item.data).toLocaleString('pt-BR'),
      'Descrição': item.descricao,
      'Categoria': item.categoria,
      'Tipo': item.tipo.toUpperCase(),
      'Status': item.statusPagamento.toUpperCase(),
      'Valor (R$)': item.valorRealizado
    }));

    const planilha: XLSX.WorkSheet = XLSX.utils.json_to_sheet(dadosTratados);
    const pasta: XLSX.WorkBook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(pasta, planilha, 'Lançamentos');

    XLSX.writeFile(pasta, `FluxNexis_${mesAtual}.xlsx`);

  }

}