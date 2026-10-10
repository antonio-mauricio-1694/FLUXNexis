import { Injectable } from '@angular/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';

import { BackupArquivo, SnapshotInfo, hojeLocal } from './backup.model';

/**
 * Snapshots automáticos guardados DENTRO do app (Directory.Data).
 * Protegem contra erro, exclusão acidental e restauração errada.
 * Atenção: ao desinstalar o app, o Android apaga essas cópias.
 * Para guardar fora do app, use BackupService.compartilhar().
 */
@Injectable({ providedIn: 'root' })
export class AutoBackupService {
  private readonly pasta = 'backups';
  private readonly arquivoPreRestauracao = 'pre-restauracao.json';
  private readonly padraoDiario = /^auto-\d{4}-\d{2}-\d{2}\.json$/;
  private readonly maximoDiarios = 7;
  private readonly atrasoMs = 2000;

  private temporizador: ReturnType<typeof setTimeout> | null = null;

  /** Agenda um snapshot diário. Várias chamadas seguidas viram uma só (debounce). */
  agendar(montar: () => BackupArquivo): void {
    if (this.temporizador !== null) {
      clearTimeout(this.temporizador);
    }
    this.temporizador = setTimeout(() => {
      this.temporizador = null;
      void this.salvarDiario(montar());
    }, this.atrasoMs);
  }

  async salvarDiario(backup: BackupArquivo): Promise<void> {
    // Nunca sobrescreve um snapshot bom com um vazio (ex.: banco zerado por algum problema).
    if (backup.lancamentos.length === 0 && backup.notas.length === 0) {
      return;
    }
    try {
      await this.gravar(`auto-${hojeLocal()}.json`, backup);
      await this.limparAntigos();
    } catch (erro) {
      console.warn('Backup automático falhou:', erro);
    }
  }

  /** Cópia de segurança feita antes de "Substituir tudo". Lança erro se não conseguir gravar. */
  async salvarPreRestauracao(backup: BackupArquivo): Promise<void> {
    await this.gravar(this.arquivoPreRestauracao, backup);
  }

  async listar(): Promise<SnapshotInfo[]> {
    try {
      const resultado = await Filesystem.readdir({
        path: this.pasta,
        directory: Directory.Data
      });
      return resultado.files
        .map(arquivo => arquivo.name)
        .filter(nome => nome.endsWith('.json'))
        .sort()
        .reverse()
        .map(nome => ({ nome, rotulo: this.rotulo(nome) }));
    } catch {
      return [];
    }
  }

  async lerBruto(nome: string): Promise<unknown> {
    const resultado = await Filesystem.readFile({
      path: `${this.pasta}/${nome}`,
      directory: Directory.Data,
      encoding: Encoding.UTF8
    });
    return JSON.parse(String(resultado.data));
  }

  private async gravar(nome: string, backup: BackupArquivo): Promise<void> {
    await Filesystem.writeFile({
      path: `${this.pasta}/${nome}`,
      data: JSON.stringify(backup),
      directory: Directory.Data,
      encoding: Encoding.UTF8,
      recursive: true
    });
  }

  private async limparAntigos(): Promise<void> {
    const resultado = await Filesystem.readdir({
      path: this.pasta,
      directory: Directory.Data
    });

    const diarios = resultado.files
      .map(arquivo => arquivo.name)
      .filter(nome => this.padraoDiario.test(nome))
      .sort()
      .reverse();

    for (const nome of diarios.slice(this.maximoDiarios)) {
      await Filesystem.deleteFile({
        path: `${this.pasta}/${nome}`,
        directory: Directory.Data
      });
    }
  }

  private rotulo(nome: string): string {
    if (nome === this.arquivoPreRestauracao) {
      return 'Antes da última restauração';
    }
    const partes = /^auto-(\d{4})-(\d{2})-(\d{2})\.json$/.exec(nome);
    return partes ? `Automático · ${partes[3]}/${partes[2]}/${partes[1]}` : nome;
  }
}