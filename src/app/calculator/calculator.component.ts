import { ChangeDetectionStrategy, Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div style="width: 100%; color: #ffffff; font-family: inherit;">
      <!-- Visor da Calculadora mostrando a expressão completa e o valor atual -->
      <div style="margin-bottom: 14px; text-align: right; background: #07090e; padding: 12px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); min-height: 72px; display: flex; flex-direction: column; justify-content: space-between;">
        <div style="font-size: 0.85rem; font-weight: 700; color: #94a3b8; word-break: break-all; min-height: 20px; letter-spacing: 0.5px;">{{ expressaoVisual() }}</div>
        <div style="font-size: 1.6rem; font-weight: 900; color: #34d399; word-break: break-all; line-height: 1.1;">{{ display() }}</div>
      </div>

      <!-- Teclado da Calculadora -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
        <button (click)="clear()" style="background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(248,113,113,0.3); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">AC</button>
        <button (click)="handlePercent()" style="background: rgba(139, 92, 246, 0.2); color: #c084fc; border: 1px solid rgba(192,132,252,0.3); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">%</button>
        <button (click)="handleOperator('/')" style="background: #1e2638; color: #34d399; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">÷</button>
        <button (click)="handleOperator('*')" style="background: #1e2638; color: #34d399; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">×</button>

        <button (click)="inputDigit('7')" style="background: #161b28; color: #fff; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">7</button>
        <button (click)="inputDigit('8')" style="background: #161b28; color: #fff; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">8</button>
        <button (click)="inputDigit('9')" style="background: #161b28; color: #fff; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">9</button>
        <button (click)="handleOperator('-')" style="background: #1e2638; color: #34d399; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">-</button>

        <button (click)="inputDigit('4')" style="background: #161b28; color: #fff; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">4</button>
        <button (click)="inputDigit('5')" style="background: #161b28; color: #fff; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">5</button>
        <button (click)="inputDigit('6')" style="background: #161b28; color: #fff; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">6</button>
        <button (click)="handleOperator('+')" style="background: #1e2638; color: #34d399; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">+</button>

        <button (click)="inputDigit('1')" style="background: #161b28; color: #fff; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">1</button>
        <button (click)="inputDigit('2')" style="background: #161b28; color: #fff; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">2</button>
        <button (click)="inputDigit('3')" style="background: #161b28; color: #fff; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">3</button>
        <button (click)="calculateResult()" style="grid-row: span 2; background: #8b5cf6; color: #fff; border: none; font-weight: 900; font-size: 1.2rem; border-radius: 12px; cursor: pointer;">=</button>

        <button (click)="inputDigit('0')" style="grid-column: span 2; background: #161b28; color: #fff; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">0</button>
        <button (click)="inputDecimal('.')" style="background: #161b28; color: #fff; border: 1px solid rgba(255,255,255,0.08); font-weight: 800; padding: 12px 0; border-radius: 12px; cursor: pointer;">.</button>
      </div>

      <button (click)="confirmValue()" style="width: 100%; margin-top: 10px; background: linear-gradient(135deg, #34d399, #10b981); color: #07090e; font-weight: 900; padding: 14px 0; border-radius: 12px; border: none; cursor: pointer; box-shadow: 0 8px 20px rgba(16,185,129,0.3);">
        Usar Valor
      </button>
    </div>
  `
})
export class CalculatorComponent {
  @Output() valueSelected = new EventEmitter<number>();

  display = signal<string>('0');
  expressaoVisual = signal<string>('');
  
  private tokens: string[] = [];
  private waitingForOperand = false;

  inputDigit(digit: string): void {
    if (this.waitingForOperand) {
      this.display.set(digit);
      this.waitingForOperand = false;
    } else {
      const current = this.display();
      this.display.set(current === '0' ? digit : current + digit);
    }
    this.atualizarTela();
  }

  inputDecimal(dot: string): void {
    if (this.waitingForOperand) {
      this.display.set('0.');
      this.waitingForOperand = false;
      this.atualizarTela();
      return;
    }
    if (!this.display().includes('.')) {
      this.display.set(this.display() + dot);
    }
    this.atualizarTela();
  }

  handleOperator(operator: string): void {
    const current = this.display();
    this.tokens.push(current);
    this.tokens.push(operator);
    this.waitingForOperand = true;
    this.atualizarTela();
  }

  handlePercent(): void {
    const current = parseFloat(this.display());
    const val = current / 100;
    this.display.set(String(val));
    this.waitingForOperand = true;
    this.atualizarTela();
  }

  calculateResult(): void {
    const current = this.display();
    if (this.tokens.length > 0 && !this.waitingForOperand) {
      this.tokens.push(current);
    }

    if (this.tokens.length === 0) return;

    try {
      const resultado = this.avaliarExpressao(this.tokens);
      this.display.set(String(resultado));
      this.expressaoVisual.set(this.tokens.join(' ') + ' =');
      this.tokens = [];
      this.waitingForOperand = true;
    } catch {
      this.display.set('Erro');
      this.tokens = [];
      this.waitingForOperand = true;
    }
  }

  private atualizarTela(): void {
    const current = this.display();
    const acumulado = this.tokens.join(' ');
    if (acumulado) {
      this.expressaoVisual.set(`${acumulado} ${this.waitingForOperand ? '' : current}`);
    } else {
      this.expressaoVisual.set(current);
    }
  }

  private avaliarExpressao(tokens: string[]): number {
    // Copia os tokens para processar multiplicação e divisão primeiro (Precedência)
    let lista: (string | number)[] = [...tokens];

    let i = 0;
    while (i < lista.length) {
      if (lista[i] === '*' || lista[i] === '/') {
        const op = lista[i];
        const prev = Number(lista[i - 1]);
        const next = Number(lista[i + 1]);
        const res = op === '*' ? prev * next : (next !== 0 ? prev / next : 0);
        
        lista.splice(i - 1, 3, res);
        i = 0; // Reinicia a varredura para garantir precedência correta
      } else {
        i++;
      }
    }

    // Processa adição e subtração
    let resultado = Number(lista[0]);
    i = 1;
    while (i < lista.length) {
      const op = lista[i];
      const next = Number(lista[i + 1]);
      if (op === '+') resultado += next;
      if (op === '-') resultado -= next;
      i += 2;
    }

    return resultado;
  }

  clear(): void {
    this.display.set('0');
    this.expressaoVisual.set('');
    this.tokens = [];
    this.waitingForOperand = false;
  }

  confirmValue(): void {
    const val = parseFloat(this.display());
    if (!isNaN(val)) {
      this.valueSelected.emit(val);
    }
  }
}