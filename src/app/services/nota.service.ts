import { Injectable, signal } from '@angular/core';

export interface Nota {
  id: string;
  titulo: string;
  conteudo: string;
  cor: string;
  dataAtualizacao: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotaService {
  private readonly STORAGE_KEY = 'fluxnexis_notas';
  
  // Paleta de cores moderna e harmônica do FluxNexis[cite: 7]
  private readonly paletaCores = ['#8b5cf6', '#38bdf8', '#34d399', '#f59e0b', '#ec4899', '#6366f1'];
  private indiceCorAtual = 0;

  readonly notas = signal<Nota[]>(this.carregarDoStorage());

  private carregarDoStorage(): Nota[] {
    try {
      const dados = localStorage.getItem(this.STORAGE_KEY);
      return dados ? JSON.parse(dados) : [];
    } catch {
      return [];
    }
  }

  private salvarNoStorage(notas: Nota[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(notas));
    this.notas.set(notas);
  }

  private obterProximaCor(): string {
    const cor = this.paletaCores[this.indiceCorAtual % this.paletaCores.length];
    this.indiceCorAtual++;
    return cor;
  }

  adicionarNota(titulo: string, conteudo: string, cor?: string): void {
    const nova: Nota = {
      id: Date.now().toString(),
      titulo: titulo.trim() || 'Nota sem título',
      conteudo: conteudo.trim(),
      cor: cor || this.obterProximaCor(), // Usa a cor passada ou a próxima em ciclo[cite: 7]
      dataAtualizacao: new Date().toISOString()
    };
    this.salvarNoStorage([nova, ...this.notas()]);
  }

  atualizarNota(id: string, titulo: string, conteudo: string, cor?: string): void {
    const atualizadas = this.notas().map(n => 
      n.id === id ? { 
        ...n, 
        titulo, 
        conteudo, 
        ...(cor ? { cor } : {}), 
        dataAtualizacao: new Date().toISOString() 
      } : n
    );
    this.salvarNoStorage(atualizadas);
  }

  deletarNota(id: string): void {
    const filtradas = this.notas().filter(n => n.id !== id);
    this.salvarNoStorage(filtradas);
  }
}