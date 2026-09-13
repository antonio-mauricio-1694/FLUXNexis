import { Injectable } from '@angular/core';

import { Lancamento } from './db.service';

import {
  CategoriaAnaliseResumo,
  CategoriaResumo,
  EvolucaoItem,
  NivelStatusFinanceiro,
  StatusFinanceiro,
  TipoLancamentoFinanceiro
} from './financeiro.model';

const LIMITE_SALDO_TRANQUILO = 800;
const LIMITE_SALDO_ALERTA = 300;
const CATEGORIA_PADRAO = 'Sem categoria';

@Injectable({
  providedIn: 'root'
})
export class AnaliseFinanceiraService {

  listarCategoriasComTotal(lancamentos: Lancamento[]): CategoriaResumo[] {

    const mapa = new Map<string, number>();

    this.filtrarGastosPagos(lancamentos).forEach(item => {

      const categoria = this.normalizarCategoria(item.categoria);

      const totalAtual = mapa.get(categoria) || 0;

      mapa.set(categoria, totalAtual + Number(item.valorRealizado || 0));

    });

    return Array.from(mapa.entries())
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);

  }

  analisarCategoria(
    lancamentos: Lancamento[],
    categoria: string
  ): CategoriaAnaliseResumo {

    const gastosPagos = this.filtrarGastosPagos(lancamentos);

    const gastosDaCategoria = gastosPagos.filter(
      item => this.normalizarCategoria(item.categoria) === categoria
    );

    const totalGasto = this.somarValorRealizado(gastosDaCategoria);
    const totalGeralGastos = this.somarValorRealizado(gastosPagos);
    const quantidade = gastosDaCategoria.length;

    return {

      categoria,

      totalGasto,

      quantidade,

      media:
        quantidade > 0
          ? totalGasto / quantidade
          : 0,

      percentualDoTotal:
        totalGeralGastos > 0
          ? (totalGasto / totalGeralGastos) * 100
          : 0,

      evolucaoDiaria:
        this.calcularEvolucaoDiaria(gastosDaCategoria)

    };

  }

  calcularStatusFinanceiro(saldoReal: number): StatusFinanceiro {

    if (saldoReal >= LIMITE_SALDO_TRANQUILO) {
      return this.montarStatus('Tranquilo', '#34d399', 'tranquilo');
    }

    if (saldoReal >= LIMITE_SALDO_ALERTA) {
      return this.montarStatus('Alerta', '#fbbf24', 'alerta');
    }

    return this.montarStatus('Crítico', '#f87171', 'critico');

  }

  somarValorRealizado(lancamentos: Lancamento[]): number {

    return lancamentos.reduce(
      (total, item) => total + Number(item.valorRealizado || 0),
      0
    );

  }

  filtrarPorTipoEStatusPago(
    lancamentos: Lancamento[],
    tipo: TipoLancamentoFinanceiro
  ): Lancamento[] {

    return lancamentos.filter(
      item => item.tipo === tipo && item.statusPagamento === 'pago'
    );

  }

  private filtrarGastosPagos(lancamentos: Lancamento[]): Lancamento[] {

    return lancamentos.filter(
      item =>
        (
          item.tipo === 'saida' ||
          item.tipo === 'saida-reserva' ||
          item.tipo === 'saida-investimento'
        ) &&
        item.statusPagamento === 'pago'
    );

  }

  private normalizarCategoria(categoria: string | undefined): string {

    return categoria?.trim() || CATEGORIA_PADRAO;

  }

  private calcularEvolucaoDiaria(lancamentos: Lancamento[]): EvolucaoItem[] {

    const mapa = new Map<string, { rotulo: string; valor: number; ordem: number }>();

    lancamentos.forEach(item => {

      const data = new Date(item.data);

      const chave =
        `${data.getFullYear()}-${data.getMonth()}-${data.getDate()}`;

      const rotulo = data.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short'
      });

      const atual = mapa.get(chave) || {
        rotulo,
        valor: 0,
        ordem: data.getTime()
      };

      atual.valor += Number(item.valorRealizado || 0);

      mapa.set(chave, atual);

    });

    const itensOrdenados = Array.from(mapa.values())
      .sort((a, b) => a.ordem - b.ordem);

    const maiorValor = itensOrdenados.reduce(
      (max, item) => Math.max(max, item.valor),
      0
    );

    return itensOrdenados.map(item => ({
      rotulo: item.rotulo,
      valor: item.valor,
      percentual: maiorValor > 0 ? (item.valor / maiorValor) * 100 : 0
    }));

  }

  private montarStatus(
    texto: string,
    cor: string,
    nivel: NivelStatusFinanceiro
  ): StatusFinanceiro {

    return { texto, cor, nivel };

  }

}