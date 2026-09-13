import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { db, Lancamento, TipoLancamento } from './db.service';

export interface ResumoFinanceiro {
  entradas: number;
  despesas: number;
  reservas: number;
  investimentos: number;
  saldoReal: number;
}

export interface ResumoCategoria {
  categoria: string;
  total: number;
  quantidade: number;
  media: number;
  percentual: number;
}

export interface EvolucaoCategoria {
  anoMes: string;
  total: number;
}

export interface AnaliseCategoria {
  categoria: string;
  total: number;
  quantidade: number;
  media: number;
  percentual: number;
  evolucao: EvolucaoCategoria[];
}

@Injectable({
  providedIn: 'root'
})
export class FinanceiroService {

  /**
   * =========================================================
   * CONSULTAS
   * =========================================================
   */

  listarPorMes(anoMes: string): Observable<Lancamento[]> {
    return from(
      db.lancamentos
        .where('data')
        .startsWith(anoMes)
        .toArray()
    );
  }

  listar(): Observable<Lancamento[]> {
    return from(db.lancamentos.toArray());
  }

  /**
   * =========================================================
   * CRUD
   * =========================================================
   */

  adicionar(item: Lancamento): Observable<number> {
    const lancamentoNormalizado = this.normalizarLancamento(item);
    return from(db.lancamentos.add(lancamentoNormalizado));
  }

  atualizar(id: number, item: Lancamento): Observable<number> {
    const lancamentoNormalizado = this.normalizarLancamento(item);
    return from(db.lancamentos.update(id, lancamentoNormalizado));
  }

  deletar(id: number): Observable<void> {
    return from(db.lancamentos.delete(id));
  }

  /**
   * =========================================================
   * IMPORTAÇÃO
   * =========================================================
   */

  importarLote(lancamentos: Lancamento[]): Observable<number[]> {
    const semId: Lancamento[] = lancamentos.map(
      ({ id, ...resto }) =>
        this.normalizarLancamento(resto as Lancamento)
    );

    return from(
      db.lancamentos.bulkAdd(semId, { allKeys: true })
    );
  }

  /**
   * =========================================================
   * RESUMO FINANCEIRO
   * =========================================================
   */
calcularResumo(lancamentos: Lancamento[]): ResumoFinanceiro {
    const realizados = this.obterLancamentosRealizados(lancamentos);

    let entradas = 0;
    let despesasSaldo = 0;
    let reservas = 0;
    let investimentos = 0;
    let retiradasReserva = 0;
    let retiradasInvestimento = 0;

    for (const lancamento of realizados) {
      const valor = this.obterValor(lancamento);

      switch (lancamento.tipo) {
        case 'entrada':
          entradas += valor;
          break;

        case 'saida':
          despesasSaldo += valor;
          break;

        case 'saida-reserva':
          retiradasReserva += valor;
          break;

        case 'saida-investimento':
          retiradasInvestimento += valor;
          break;

        case 'reserva':
          reservas += valor;
          break;

        case 'investimento':
          investimentos += valor;
          break;
      }
    }

    const saldoReserva = Math.max(0, reservas - retiradasReserva);
    const saldoInvestimentos = Math.max(0, investimentos - retiradasInvestimento);

    // O saldo real só desconta as saídas comuns da conta, aportes para reserva e aportes para investimento.
    // Retiradas de reserva/investimento NÃO mexem no saldo real (pois já saíram no passado).
    const saldoReal =
      entradas -
      despesasSaldo -
      reservas -
      investimentos;

    // As despesas totais somam tudo para ir direto para os gastos e categorias
    const despesas =
      despesasSaldo +
      retiradasReserva +
      retiradasInvestimento;

    return {
      entradas,
      despesas,
      reservas: saldoReserva,
      investimentos: saldoInvestimentos,
      saldoReal
    };
  }
  calcularTotalReserva(lancamentos: Lancamento[]): number {
    const realizados = this.obterLancamentosRealizados(lancamentos);
    let total = 0;

    for (const lancamento of realizados) {
      const valor = this.obterValor(lancamento);

      if (lancamento.tipo === 'reserva') {
        total += valor;
      } else if (lancamento.tipo === 'saida-reserva') {
        total -= valor;
      }
    }

    return Math.max(0, total);
  }

  calcularTotalInvestimento(lancamentos: Lancamento[]): number {
    const realizados = this.obterLancamentosRealizados(lancamentos);
    let total = 0;

    for (const lancamento of realizados) {
      const valor = this.obterValor(lancamento);

      if (lancamento.tipo === 'investimento') {
        total += valor;
      } else if (lancamento.tipo === 'saida-investimento') {
        total -= valor;
      }
    }

    return Math.max(0, total);
  }

  calcularSaldoReal(lancamentos: Lancamento[]): number {
    return this.calcularResumo(lancamentos).saldoReal;
  }

  /**
   * =========================================================
   * VALIDAÇÃO DE RECURSO
   * =========================================================
   */

  validarDisponibilidadeRecurso(
    lancamentos: Lancamento[],
    tipoSaida: 'saida' | 'saida-reserva' | 'saida-investimento',
    valor: number
  ): { valido: boolean; disponivel: number; mensagem: string } {
    const valorSolicitado = Number(valor);

    if (!Number.isFinite(valorSolicitado) || valorSolicitado <= 0) {
      return {
        valido: false,
        disponivel: 0,
        mensagem: 'Informe um valor maior que zero.'
      };
    }

    let disponivel = 0;
    let nomeFonte = 'saldo real';

    if (tipoSaida === 'saida') {
      disponivel = this.calcularSaldoReal(lancamentos);
      nomeFonte = 'saldo real';
    } else if (tipoSaida === 'saida-reserva') {
      disponivel = this.calcularTotalReserva(lancamentos);
      nomeFonte = 'reserva';
    } else if (tipoSaida === 'saida-investimento') {
      disponivel = this.calcularTotalInvestimento(lancamentos);
      nomeFonte = 'investimento';
    }

    const valido = valorSolicitado <= disponivel;

    return {
      valido,
      disponivel,
      mensagem: valido
        ? ''
        : `Saldo insuficiente em ${nomeFonte}. Disponível: ${this.formatarMoeda(disponivel)}.`
    };
  }

  /**
   * =========================================================
   * ANÁLISE POR CATEGORIA
   * =========================================================
   */

  calcularResumoCategorias(
    lancamentos: Lancamento[],
    anoMes?: string
  ): ResumoCategoria[] {
    const lancamentosFiltrados = anoMes
      ? lancamentos.filter(l => l.data && l.data.startsWith(anoMes))
      : lancamentos;

    // Considera qualquer tipo de saída como despesa para fins de categoria
    const despesas = lancamentosFiltrados.filter(
      l =>
        (l.tipo === 'saida' ||
          l.tipo === 'saida-reserva' ||
          l.tipo === 'saida-investimento') &&
        l.statusPagamento === 'pago' &&
        l.categoria?.trim()
    );

    const grupos = new Map<string, { total: number; quantidade: number }>();

    for (const lancamento of despesas) {
      const categoria = lancamento.categoria.trim();
      const valor = this.obterValor(lancamento);
      const atual = grupos.get(categoria);

      if (atual) {
        atual.total += valor;
        atual.quantidade += 1;
      } else {
        grupos.set(categoria, { total: valor, quantidade: 1 });
      }
    }

    const totalDespesas = despesas.reduce(
      (total, l) => total + this.obterValor(l),
      0
    );

    return Array.from(grupos.entries())
      .map(([categoria, dados]) => {
        const percentual =
          totalDespesas > 0 ? (dados.total / totalDespesas) * 100 : 0;
        const media =
          dados.quantidade > 0 ? dados.total / dados.quantidade : 0;

        return {
          categoria,
          total: dados.total,
          quantidade: dados.quantidade,
          media,
          percentual
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  calcularTotalCategoria(
    lancamentos: Lancamento[],
    categoria: string,
    anoMes?: string
  ): number {
    const lancamentosFiltrados = anoMes
      ? lancamentos.filter(l => l.data && l.data.startsWith(anoMes))
      : lancamentos;

    const categoriaNormalizada = categoria.trim().toLocaleLowerCase();

    return lancamentosFiltrados
      .filter(
        l =>
          (l.tipo === 'saida' ||
            l.tipo === 'saida-reserva' ||
            l.tipo === 'saida-investimento') &&
          l.statusPagamento === 'pago' &&
          l.categoria?.trim().toLocaleLowerCase() === categoriaNormalizada
      )
      .reduce((total, l) => total + this.obterValor(l), 0);
  }

  filtrarPorCategoria(
    lancamentos: Lancamento[],
    categoria: string
  ): Lancamento[] {
    const categoriaNormalizada = categoria.trim().toLocaleLowerCase();
    return lancamentos.filter(
      l => l.categoria?.trim().toLocaleLowerCase() === categoriaNormalizada
    );
  }

  calcularEvolucaoCategoria(
    lancamentos: Lancamento[],
    categoria: string
  ): EvolucaoCategoria[] {
    const categoriaNormalizada = categoria.trim().toLocaleLowerCase();
    const grupos = new Map<string, number>();

    for (const lancamento of lancamentos) {
      const ehSaidaValida =
        lancamento.tipo === 'saida' ||
        lancamento.tipo === 'saida-reserva' ||
        lancamento.tipo === 'saida-investimento';

      if (!ehSaidaValida || lancamento.statusPagamento !== 'pago') {
        continue;
      }

      if (
        lancamento.categoria?.trim().toLocaleLowerCase() !==
        categoriaNormalizada
      ) {
        continue;
      }

      const anoMes = lancamento.data.substring(0, 7);
      const valor = this.obterValor(lancamento);

      grupos.set(anoMes, (grupos.get(anoMes) || 0) + valor);
    }

    return Array.from(grupos.entries())
      .map(([anoMes, total]) => ({ anoMes, total }))
      .sort((a, b) => a.anoMes.localeCompare(b.anoMes));
  }

  analisarCategoria(
    lancamentos: Lancamento[],
    categoria: string,
    anoMes?: string
  ): AnaliseCategoria {
    const resumoCategorias = this.calcularResumoCategorias(lancamentos, anoMes);
    const resumo = resumoCategorias.find(
      item =>
        item.categoria.trim().toLocaleLowerCase() ===
        categoria.trim().toLocaleLowerCase()
    );

    const evolucao = this.calcularEvolucaoCategoria(lancamentos, categoria);

    if (!resumo) {
      return {
        categoria,
        total: 0,
        quantidade: 0,
        media: 0,
        percentual: 0,
        evolucao
      };
    }

    return {
      categoria: resumo.categoria,
      total: resumo.total,
      quantidade: resumo.quantidade,
      media: resumo.media,
      percentual: resumo.percentual,
      evolucao
    };
  }

  /**
   * =========================================================
   * HELPERS
   * =========================================================
   */

  private obterLancamentosRealizados(
    lancamentos: Lancamento[]
  ): Lancamento[] {
    return lancamentos.filter(
      l => l.statusPagamento === 'pago'
    );
  }

  private normalizarLancamento(lancamento: Lancamento): Lancamento {
    return {
      ...lancamento,
      categoria: lancamento.categoria?.trim() || 'Geral'
    };
  }

  private obterValor(lancamento: Lancamento): number {
    const valor = Number(lancamento.valorRealizado || 0);
    if (!Number.isFinite(valor) || valor < 0) {
      return 0;
    }
    return valor;
  }

  private formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }
}