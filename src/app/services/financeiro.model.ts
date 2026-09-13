import { Lancamento } from './db.service';

export type TipoLancamentoFinanceiro =
  | 'entrada'
  | 'saida'
  | 'reserva'
  | 'investimento'
  | 'saida-reserva'
  | 'saida-investimento';

export type ViewAtual = 'inicio' | 'lancamentos';

export type NivelStatusFinanceiro = 'tranquilo' | 'alerta' | 'critico';

export interface StatusFinanceiro {
  nivel: NivelStatusFinanceiro;
  texto: string;
  cor: string;
}

export interface EvolucaoItem {
  rotulo: string;
  valor: number;
  percentual: number;
}

export interface CategoriaResumo {
  categoria: string;
  total: number;
}

export interface CategoriaAnaliseResumo {
  categoria: string;
  totalGasto: number;
  quantidade: number;
  media: number;
  percentualDoTotal: number;
  evolucaoDiaria: EvolucaoItem[];
}

export interface BackupFluxNexis {
  versao: string;
  dataExportacao: string;
  lancamentos: Lancamento[];
}