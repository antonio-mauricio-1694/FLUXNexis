// src/app/components/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceiroService } from '../../services/financeiro.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="padding: 20px;">
      <h1>FluxNeis - Gestão Mensal</h1>

      <div style="display: flex; gap: 20px; margin-bottom: 20px;">
        <div style="padding: 20px; background: #e8f5e9; border-radius: 8px;">
          <h3>Receitas: R$ {{ totalReceitas }}</h3>
        </div>
        <div style="padding: 20px; background: #ffebee; border-radius: 8px;">
          <h3>Despesas: R$ {{ totalDespesas }}</h3>
        </div>
        <div style="padding: 20px; background: #e3f2fd; border-radius: 8px;">
          <h3>Saldo: R$ {{ totalReceitas - totalDespesas }}</h3>
        </div>
      </div>
      
      <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
        <input [(ngModel)]="novo.descricao" placeholder="Descrição">
        <input [(ngModel)]="novo.valor" type="number" placeholder="Valor">
        <select [(ngModel)]="novo.tipo">
          <option value="receita">receita</option>
          <option value="despesa">despesa</option>
        </select>
        <input [(ngModel)]="novo.data" type="date">
        <button (click)="salvar()">{{ editandoId ? 'Atualizar' : 'Adicionar' }}</button>
      </div>

      <table style="width: 100%; margin-top: 20px; border-collapse: collapse;">
        <tr style="text-align: left; background: #ddd;">
          <th>Data</th><th>Descrição</th><th>Tipo</th><th>Valor</th><th>Ações</th>
        </tr>
        <tr *ngFor="let item of lancamentos" style="border-bottom: 1px solid #eee;">
          <td>{{ item.data }}</td>
          <td>{{ item.descricao }}</td>
          <td [style.color]="item.tipo === 'receita' ? 'green' : 'red'">{{ item.tipo }}</td>
          <td>R$ {{ item.valor }}</td>
          <td>
            <button (click)="preencherEdicao(item)">Editar</button>
            <button (click)="excluir(item.id)">Excluir</button>
          </td>
        </tr>
      </table>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  lancamentos: any[] = [];
  novo = { descricao: '', valor: 0, tipo: 'receita', data: '' };
  editandoId: number | null = null;

  constructor(private service: FinanceiroService) {}
  
  ngOnInit() { this.carregar(); }

  get totalReceitas() {
    return this.lancamentos
      .filter(i => i.tipo === 'receita')
      .reduce((acc, curr) => acc + curr.valor, 0);
  }

  get totalDespesas() {
    return this.lancamentos
      .filter(i => i.tipo === 'despesa')
      .reduce((acc, curr) => acc + curr.valor, 0);
  }

  carregar() { this.service.listar().subscribe(d => this.lancamentos = d); }

  salvar() {
    if (this.editandoId) {
      this.service.atualizar(this.editandoId, this.novo).subscribe(() => { this.carregar(); this.resetar(); });
    } else {
      this.service.adicionar(this.novo).subscribe(() => { this.carregar(); this.resetar(); });
    }
  }

  excluir(id: number) { this.service.deletar(id).subscribe(() => this.carregar()); }
  
  preencherEdicao(item: any) { this.editandoId = item.id; this.novo = { ...item }; }
  
  resetar() { this.novo = { descricao: '', valor: 0, tipo: 'receita', data: '' }; this.editandoId = null; }
}