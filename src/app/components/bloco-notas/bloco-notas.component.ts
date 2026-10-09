import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Nota, NotaService } from '../../services/nota.service';

@Component({
  selector: 'app-bloco-notas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host {
      display: block;
      width: 100%;
      color: #ffffff;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .notas-container {
      display: flex;
      flex-direction: column;
      gap: 20px;
      width: 100%;
      max-width: 680px;
      margin: 0 auto;
    }
    .nota-form-card {
      background: rgba(18, 22, 33, 0.85);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 12px 35px -8px rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .input-custom {
      background: rgba(11, 14, 22, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 12px 16px;
      color: #ffffff;
      font-size: 0.95rem;
      font-weight: 600;
      outline: none;
      width: 100%;
    }
    .input-custom:focus {
      border-color: #8b5cf6;
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
    }
    textarea.input-custom {
      resize: vertical;
      min-height: 90px;
    }
    .cores-picker {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .cor-opcao {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid transparent;
      cursor: pointer;
      transition: transform 0.2s;
    }
    .cor-opcao.ativa {
      border-color: #ffffff;
      transform: scale(1.15);
    }
    .btn-salvar-nota {
      padding: 14px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      color: white;
      font-weight: 900;
      font-size: 0.95rem;
      background: linear-gradient(135deg, #8b5cf6, #6d28d9);
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
      transition: all 0.2s ease;
    }
    .btn-salvar-nota:hover { opacity: 0.95; transform: translateY(-1px); }
    
    .notas-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
    }
    @media(min-width: 640px) {
      .notas-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .nota-card {
      position: relative;
      background: linear-gradient(145deg, rgba(22, 27, 40, 0.9), rgba(13, 17, 26, 0.98));
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
      transition: transform 0.2s;
    }
    .nota-card::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 5px;
      background: var(--cor-destaque, #8b5cf6);
    }
    .nota-card:hover { transform: translateY(-2px); }
    .nota-titulo {
      font-size: 1.1rem;
      font-weight: 900;
      color: #ffffff;
      margin: 0;
      word-break: break-word;
    }
    .nota-conteudo {
      font-size: 0.9rem;
      color: #cbd5e1;
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.4;
      margin: 0;
      flex: 1;
    }
    .nota-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      padding-top: 10px;
      border-top: 1px solid rgba(255,255,255,0.06);
      font-size: 0.72rem;
      color: #94a3b8;
    }
    .acoes-nota {
      display: flex;
      gap: 8px;
    }
    .btn-acao-nota {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.1);
      color: #cbd5e1;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-acao-nota.excluir:hover { background: rgba(239, 68, 68, 0.2); color: #f87171; border-color: rgba(248,113,113,0.4); }
    .btn-acao-nota.editar:hover { background: rgba(59, 130, 246, 0.2); color: #60a5fa; border-color: rgba(96,165,250,0.4); }
    .vazio-notas {
      text-align: center;
      padding: 40px 20px;
      color: #94a3b8;
      background: rgba(18, 22, 33, 0.6);
      border: 1px dashed rgba(255,255,255,0.12);
      border-radius: 16px;
      font-weight: 700;
    }
  `],
  template: `
    <div class="notas-container">
      <!-- Formulário de Nova/Edição Nota -->
      <div class="nota-form-card">
        <input 
          class="input-custom" 
          [(ngModel)]="tituloInput" 
          placeholder="Título da nota..." 
        />
        <textarea 
          class="input-custom" 
          [(ngModel)]="conteudoInput" 
          placeholder="Escreva sua nota aqui..."
        ></textarea>
        
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div class="cores-picker">
            <span style="font-size: 0.8rem; font-weight: 700; color: #94a3b8;">Cor:</span>
            <button 
              *ngFor="let c of paletaCores" 
              class="cor-opcao" 
              [style.background-color]="c"
              [class.ativa]="corSelecionada === c"
              (click)="corSelecionada = c"
              aria-label="Selecionar cor"
            ></button>
          </div>

          <button class="btn-salvar-nota" (click)="salvarNota()">
            {{ editandoId ? 'Atualizar Nota' : 'Criar Nova Nota' }}
          </button>
        </div>
      </div>

      <!-- Lista de Notas -->
      <div class="notas-grid" *ngIf="notaService.notas().length > 0; else semNotas">
        <div 
          *ngFor="let nota of notaService.notas()" 
          class="nota-card"
          [style.--cor-destaque]="nota.cor"
        >
          <h3 class="nota-titulo">{{ nota.titulo }}</h3>
          <p class="nota-conteudo">{{ nota.conteudo }}</p>
          
          <div class="nota-footer">
            <span>{{ nota.dataAtualizacao | date:'dd/MM/yyyy HH:mm' }}</span>
            <div class="acoes-nota">
              <button class="btn-acao-nota editar" (click)="carregarEdicao(nota)">Editar</button>
              <button class="btn-acao-nota excluir" (click)="notaService.deletarNota(nota.id)">Excluir</button>
            </div>
          </div>
        </div>
      </div>

      <ng-template #semNotas>
        <div class="vazio-notas">Nenhuma nota salva no momento. Crie sua primeira nota acima!</div>
      </ng-template>
    </div>
  `
})
export class BlocoNotasComponent {
  readonly notaService = inject(NotaService);

  tituloInput = '';
  conteudoInput = '';
  corSelecionada = '#8b5cf6';
  editandoId: string | null = null;

  readonly paletaCores = ['#8b5cf6', '#38bdf8', '#34d399', '#f59e0b', '#ec4899', '#6366f1'];

  salvarNota(): void {
    if (!this.conteudoInput.trim() && !this.tituloInput.trim()) return;

    if (this.editandoId) {
      this.notaService.atualizarNota(this.editandoId, this.tituloInput, this.conteudoInput, this.corSelecionada);
      this.editandoId = null;
    } else {
      this.notaService.adicionarNota(this.tituloInput, this.conteudoInput, this.corSelecionada);
    }

    this.tituloInput = '';
    this.conteudoInput = '';
    this.corSelecionada = '#8b5cf6';
  }

  carregarEdicao(nota: Nota): void {
    this.editandoId = nota.id;
    this.tituloInput = nota.titulo;
    this.conteudoInput = nota.conteudo;
    this.corSelecionada = nota.cor;
  }
}