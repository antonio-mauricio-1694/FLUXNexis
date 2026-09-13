import { Injectable } from '@angular/core';

import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileOpener } from '@capacitor-community/file-opener';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { Lancamento } from './db.service';

@Injectable({
  providedIn: 'root'
})
export class PdfExportService {

  async exportar(
    lancamentos: Lancamento[],
    nomeMesAtual: string,
    mesAtual: string
  ): Promise<void> {

    const documento = new jsPDF();

    documento.text(
      `Relatorio Financeiro - ${nomeMesAtual}`,
      14,
      20
    );

    autoTable(documento, {

      startY: 30,

      head: [[
        'Data/Hora',
        'Descricao',
        'Categoria',
        'Tipo',
        'Valor (R$)'
      ]],

      body: lancamentos.map(item => [
        new Date(item.data).toLocaleString('pt-BR'),
        item.descricao,
        item.categoria,
        item.tipo.toUpperCase(),
        item.valorRealizado.toFixed(2)
      ])

    });

    const arquivoSalvo = await Filesystem.writeFile({
      path: `FluxNexis_${mesAtual}.pdf`,
      data: documento.output('datauristring').split(',')[1],
      directory: Directory.Cache
    });

    await FileOpener.open({
      filePath: arquivoSalvo.uri
    });

  }

}