// src/app/services/db.service.ts
import Dexie, { Table } from 'dexie';

export type TipoLancamento =
  | 'entrada'
  | 'saida'
  | 'reserva'
  | 'investimento'
  | 'saida-reserva'
  | 'saida-investimento';

export type StatusPagamento = 'pago' | 'pendente';

export type DivisaoLancamento = 'essencial' | 'lazer' | 'outros';

export interface Lancamento {
  id?: number;
  descricao: string;
  categoria: string;
  tipo: TipoLancamento;
  statusPagamento: StatusPagamento;
  valorPrevisto: number;
  valorRealizado: number;
  data: string;
  divisao: DivisaoLancamento;
}

export class FluxNexisDB extends Dexie {
  lancamentos!: Table<Lancamento, number>;

  constructor() {
    super('FluxNexisDB');

    this.version(1).stores({
      lancamentos: '++id, descricao, categoria, tipo, statusPagamento, data, divisao'
    });

    this.version(2).stores({
      lancamentos: '++id, descricao, categoria, tipo, statusPagamento, data, divisao'
    });

    this.version(3).stores({
      lancamentos: '++id, descricao, categoria, tipo, statusPagamento, data, divisao'
    });

    // Adicionando a versão 4 para gerenciar o gancho de migração automática e substituição limpa
    this.version(4).upgrade(async tx => {
      // Exemplo de rotina automática ao atualizar a versão do banco no dispositivo:
      // Se você quiser limpar dados antigos corrompidos ou inserir dados padrão (seed) ao atualizar o app:
      // await tx.table('lancamentos').clear();
    });
  }
}

export const db = new FluxNexisDB();