import { Lancamento } from './db.service';

export type LancamentoBackup = Omit<Lancamento, 'id'>;

export interface NotaBackup {
  titulo: string;
  conteudo: string;
  cor?: string;
  dataAtualizacao?: string;
}

export interface BackupArquivo {
  app: 'fluxnexis';
  versao: number;
  geradoEm: string;
  lancamentos: LancamentoBackup[];
  notas: NotaBackup[];
}

export interface SnapshotInfo {
  nome: string;
  rotulo: string;
}

export type ModoRestauracao = 'mesclar' | 'substituir';

export interface ResultadoRestauracao {
  lancamentos: number;
  notas: number;
}

/** Data local no formato YYYY-MM-DD (toISOString usa UTC e erra o dia à noite no Brasil). */
export function hojeLocal(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${agora.getFullYear()}-${mes}-${dia}`;
}