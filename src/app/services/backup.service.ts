import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

import { AutoBackupService } from './auto-backup.service';
import {
  BackupArquivo,
  LancamentoBackup,
  ModoRestauracao,
  NotaBackup,
  ResultadoRestauracao,
  hojeLocal
} from './backup.model';
import { Lancamento, db } from './db.service';
import { Nota, NotaService } from './nota.service';

const VERSAO_BACKUP = 2;
const CHAVE_ULTIMO_BACKUP_EXTERNO = 'fluxnexis:ultimo-backup-externo';

function pareceLancamento(valor: unknown): valor is Lancamento {
  if (!valor || typeof valor !== 'object') return false;
  const o = valor as Record<string, unknown>;
  return (
    typeof o['descricao'] === 'string' &&
    typeof o['data'] === 'string' &&
    typeof o['tipo'] === 'string' &&
    Number.isFinite(Number(o['valorRealizado']))
  );
}

function pareceNota(valor: unknown): valor is NotaBackup {
  if (!valor || typeof valor !== 'object') return false;
  const o = valor as Record<string, unknown>;
  return typeof o['titulo'] === 'string' && typeof o['conteudo'] === 'string';
}

function chaveLancamento(l: LancamentoBackup): string {
  return `${l.data}|${l.descricao}|${l.valorRealizado}|${l.tipo}|${l.categoria ?? ''}`;
}

function chaveNota(n: { titulo: string; conteudo: string }): string {
  return `${n.titulo}|${n.conteudo}`;
}

@Injectable({ providedIn: 'root' })
export class BackupService {
  private readonly notaService = inject(NotaService);
  private readonly autoBackup = inject(AutoBackupService);

  montarBackup(lancamentos: readonly Lancamento[], notas: readonly Nota[]): BackupArquivo {
    return {
      app: 'fluxnexis',
      versao: VERSAO_BACKUP,
      geradoEm: new Date().toISOString(),
      lancamentos: lancamentos.map(({ id, ...resto }) => resto),
      notas: notas.map(nota => ({
        titulo: nota.titulo,
        conteudo: nota.conteudo,
        cor: typeof nota.cor === 'string' ? nota.cor : undefined,
        dataAtualizacao: nota.dataAtualizacao
          ? new Date(nota.dataAtualizacao as string | number | Date).toISOString()
          : undefined
      }))
    };
  }

  /**
   * Gera o arquivo de backup e abre a folha de compartilhamento do Android
   * (Drive, WhatsApp, e-mail, Arquivos...). No navegador, baixa o arquivo.
   */
  async compartilhar(lancamentos: readonly Lancamento[], notas: readonly Nota[]): Promise<void> {
    const backup = this.montarBackup(lancamentos, notas);
    const conteudo = JSON.stringify(backup, null, 2);
    const nome = `fluxnexis-backup-${hojeLocal()}.json`;

    if (!Capacitor.isNativePlatform()) {
      this.baixarNoNavegador(nome, conteudo);
      this.marcarBackupExterno();
      return;
    }

    const { uri } = await Filesystem.writeFile({
      path: nome,
      data: conteudo,
      directory: Directory.Cache,
      encoding: Encoding.UTF8
    });

    await Share.share({
      title: 'Backup FluxNexis',
      text: `Backup do FluxNexis de ${hojeLocal()}`,
      url: uri,
      dialogTitle: 'Salvar backup'
    });

    this.marcarBackupExterno();
  }

  /** Lê o arquivo escolhido e valida. Aceita o formato antigo (lista de lançamentos) e o novo. */
  async lerArquivo(event: Event): Promise<BackupArquivo | null> {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return null;

    try {
      const texto = await arquivo.text();
      return this.normalizar(JSON.parse(texto));
    } finally {
      input.value = '';
    }
  }

  async lerSnapshot(nome: string): Promise<BackupArquivo> {
    return this.normalizar(await this.autoBackup.lerBruto(nome));
  }

  async restaurar(backup: BackupArquivo, modo: ModoRestauracao): Promise<ResultadoRestauracao> {
    if (modo === 'substituir') {
      return this.substituir(backup);
    }
    return this.mesclar(backup);
  }

  ultimoBackupExterno(): Date | null {
    try {
      const valor = localStorage.getItem(CHAVE_ULTIMO_BACKUP_EXTERNO);
      if (!valor) return null;
      const data = new Date(valor);
      return Number.isNaN(data.getTime()) ? null : data;
    } catch {
      return null;
    }
  }

  private marcarBackupExterno(): void {
    try {
      localStorage.setItem(CHAVE_ULTIMO_BACKUP_EXTERNO, new Date().toISOString());
    } catch {
      // armazenamento indisponível: o aviso só deixa de ser atualizado
    }
  }

  private async substituir(backup: BackupArquivo): Promise<ResultadoRestauracao> {
    // Cópia de segurança do estado atual antes de apagar qualquer coisa.
    const atuais = await db.lancamentos.toArray();
    await this.autoBackup.salvarPreRestauracao(this.montarBackup(atuais, this.notaService.notas()));

    // Apagar e inserir na mesma transação: se der erro, nada é perdido.
    await db.transaction('rw', db.lancamentos, async () => {
      await db.lancamentos.clear();
      await db.lancamentos.bulkAdd(backup.lancamentos as Lancamento[]);
    });

    for (const nota of [...this.notaService.notas()]) {
      this.notaService.deletarNota(nota.id);
    }
    for (const nota of backup.notas) {
      this.notaService.adicionarNota(nota.titulo, nota.conteudo);
    }

    return { lancamentos: backup.lancamentos.length, notas: backup.notas.length };
  }

  private async mesclar(backup: BackupArquivo): Promise<ResultadoRestauracao> {
    const existentes = await db.lancamentos.toArray();
    const chaves = new Set(existentes.map(chaveLancamento));

    const novos = backup.lancamentos.filter(l => {
      const chave = chaveLancamento(l);
      if (chaves.has(chave)) return false;
      chaves.add(chave);
      return true;
    });
    if (novos.length > 0) {
      await db.lancamentos.bulkAdd(novos as Lancamento[]);
    }

    const chavesNotas = new Set(this.notaService.notas().map(chaveNota));
    let notasAdicionadas = 0;
    for (const nota of backup.notas) {
      const chave = chaveNota(nota);
      if (chavesNotas.has(chave)) continue;
      chavesNotas.add(chave);
      this.notaService.adicionarNota(nota.titulo, nota.conteudo);
      notasAdicionadas++;
    }

    return { lancamentos: novos.length, notas: notasAdicionadas };
  }

  private normalizar(bruto: unknown): BackupArquivo {
    let lancamentosBrutos: unknown[];
    let notasBrutas: unknown[] = [];
    let geradoEm = '';

    if (Array.isArray(bruto)) {
      lancamentosBrutos = bruto;
    } else if (
      bruto &&
      typeof bruto === 'object' &&
      Array.isArray((bruto as { lancamentos?: unknown }).lancamentos)
    ) {
      const objeto = bruto as { lancamentos: unknown[]; notas?: unknown; geradoEm?: unknown };
      lancamentosBrutos = objeto.lancamentos;
      notasBrutas = Array.isArray(objeto.notas) ? objeto.notas : [];
      geradoEm = typeof objeto.geradoEm === 'string' ? objeto.geradoEm : '';
    } else {
      throw new Error('Arquivo de backup inválido.');
    }

    const lancamentos: LancamentoBackup[] = lancamentosBrutos
      .filter(pareceLancamento)
      .map(({ id, ...resto }) => resto);

    const notas: NotaBackup[] = notasBrutas.filter(pareceNota).map(nota => ({
      titulo: nota.titulo,
      conteudo: nota.conteudo,
      cor: typeof nota.cor === 'string' ? nota.cor : undefined,
      dataAtualizacao: typeof nota.dataAtualizacao === 'string' ? nota.dataAtualizacao : undefined
    }));

    if (lancamentos.length === 0 && notas.length === 0) {
      throw new Error('O arquivo de backup está vazio ou não tem dados reconhecidos.');
    }

    return { app: 'fluxnexis', versao: VERSAO_BACKUP, geradoEm, lancamentos, notas };
  }

  private baixarNoNavegador(nome: string, conteudo: string): void {
    const blob = new Blob([conteudo], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}