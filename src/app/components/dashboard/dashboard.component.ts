import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { FinanceiroService } from '../../services/financeiro.service';
import { Lancamento } from '../../services/db.service';
import { AnaliseFinanceiraService } from '../../services/analise-financeira.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { BackupService } from '../../services/backup.service';
import { NotificacaoService } from '../../services/notificacao.service';

import {
  TipoLancamentoFinanceiro,
  ViewAtual
} from '../../services/financeiro.model';

type ViewAtualExtendida = ViewAtual | 'relatorio' | 'metas';

interface ItemDonut {
  categoria: string;
  valor: number;
  quantidade: number;
  percentual: number;
  cor: string;
  iconeSvg: string;
  dashArray: string;
  dashOffset: number;
}

interface AnaliseTipoResultado {
  itens: ItemDonut[];
  total: number;
  quantidadeTotal: number;
}

interface PontoEvolucao {
  x: number;
  y: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule
  ],
  styles: [`
    :host {
      --bg-base: #222224;
      --bg-glow-blue: rgba(39, 145, 130, 0.18);
      --bg-glow-green: rgba(16, 185, 129, 0.14);
      --card-bg: rgba(20, 21, 22, 0.18);
      --card-border: rgba(232, 238, 247, 0.15);
      --card-border-hover: rgba(84, 141, 247, 0.45);
      --text-primary: #fdfcfc;
      --text-secondary: #94a3b8;
      --text-muted: #f0f6fd;
      --primary: #3b82f6;
      --primary-dark: #2563eb;
      --success: #10b981;
      --success-dark: #059669;
      --danger: #ef4444;
      --danger-dark: #b91c1c;
      --warning: #f59e0b;
      --purple: #8b5cf6;
      --purple-dark: #6d28d9;
      --amber: #f59e0b;
      --amber-dark: #d97706;
      --tab-active: #4ade80;
      --nav-height: 66px;
      --radius-lg: 18px;
      --radius-md: 12px;
      --radius-sm: 8px;
      --shadow-soft: 0 8px 24px rgba(0, 0, 0, 0.35);
    }

    * {
      box-sizing: border-box;
    }

    .app-container {
      max-width: 960px;
      margin: 0 auto;
      padding: 0 16px calc(var(--nav-height) + 32px + env(safe-area-inset-bottom));
      width: 100%;
      min-width: 0;
      overflow-x: hidden;
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--text-primary);
      min-height: 100vh;
      background:
        linear-gradient(180deg, rgba(11, 15, 25, 0.25), rgba(11, 15, 25, 0.19)),
        radial-gradient(circle at 15% 0%, var(--bg-glow-blue) 0%, transparent 45%),
        radial-gradient(circle at 85% 20%, var(--bg-glow-green) 0%, transparent 40%),
        url('../../../assets/images/imagem2.png') center center / cover no-repeat fixed;
      background-color: var(--bg-base);
    }

    @media (max-width: 768px) {
      .app-container {
        background-attachment: scroll;
      }
    }

    .topbar {
      display: flex;
      align-items: center;
      gap: 14px;
      padding-top: max(20px, env(safe-area-inset-top));
      padding-bottom: 14px;
      margin-bottom: 20px;
    }

    .btn-hamburguer {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 5px;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      background: rgba(239, 242, 248, 0.29);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      cursor: pointer;
      padding: 0;
      margin-left: 16px;
      transition: background 0.15s ease;
    }

    .btn-hamburguer:hover {
      background: rgba(15, 15, 15, 0.17);
    }

    .btn-hamburguer span {
      display: block;
      height: 2px;
      width: 20px;
      margin: 0 auto;
      background: #3d3d41;
      border-radius: 2px;
    }

    .flux-title {
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(90deg, #3b82f6, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0;
    }

    .drawer {
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      width: 280px;
      max-width: 82vw;
      background: rgba(55, 57, 59, 0.53);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border-right: 1px solid var(--card-border);
      box-shadow: 12px 0 32px rgba(0, 0, 0, 0.13);
      transform: translateX(-105%);
      transition: transform 0.25s ease;
      z-index: 60;
      display: flex;
      flex-direction: column;
      padding: max(20px, env(safe-area-inset-top)) 16px 20px;
      overflow-y: auto;
    }

    .drawer.aberto {
      transform: translateX(0);
    }

    .drawer-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
    }

    .drawer-titulo {
      font-size: 1.15rem;
      font-weight: 800;
      background: linear-gradient(90deg, #3b82f6, #10b981);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .btn-fechar-drawer {
      background: transparent;
      border: none;
      color: #ebf1f1;
      font-size: 1.3rem;
      cursor: pointer;
      line-height: 1;
      padding: 4px 8px;
    }

    .secao-titulo {
      font-size: 0.68rem;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: #64748b;
      margin: 4px 0 8px;
    }

    .acao-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 12px 14px;
      border-radius: var(--radius-sm);
      border: none;
      color: white;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      margin-bottom: 8px;
      transition: opacity 0.2s ease, transform 0.15s ease;
    }

    .acao-item:hover {
      opacity: 0.92;
    }

    .acao-item:active {
      transform: scale(0.98);
    }

    .acao-item:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .acao-pdf { background: linear-gradient(135deg, var(--success), var(--success-dark)); }
    .acao-excel { background: linear-gradient(135deg, #04b980, #047857); }
    .acao-backup { background: linear-gradient(135deg, var(--purple), var(--purple-dark)); }
    .acao-restore { background: linear-gradient(135deg, var(--amber), var(--amber-dark)); }

    .drawer-rodape {
      margin-top: auto;
      padding-top: 16px;
      border-top: 1px solid var(--card-border);
      font-size: 0.72rem;
      color: #64748b;
      text-align: center;
    }

    .backdrop-drawer {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      z-index: 50;
      animation: aparecer 0.2s ease;
    }

    @keyframes aparecer {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .cabecalho-pagina {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .titulo-pagina {
      font-size: 1.3rem;
      font-weight: 800;
      margin: 0;
    }

    .link-voltar {
      background: transparent;
      border: 1px solid var(--card-border);
      color: #fffdfd;
      border-radius: 20px;
      padding: 7px 14px;
      font-weight: 700;
      font-size: 0.8rem;
      cursor: pointer;
    }

    .link-voltar:hover {
      background: rgba(247, 248, 245, 0.9);
      color: #111827;
    }

    /* ===== Seletor de mês: nativo, sem overlay, sem showPicker() ===== */

    .mes-selector-box {
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--card-bg);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      padding: 2px 12px;
      border-radius: 20px;
      border: 1px solid var(--card-border);
      box-shadow: var(--shadow-soft);
      flex-wrap: wrap;
      max-width: 100%;
      width: fit-content;
      margin: 0 0 14px 0;
      font-size: 0.85rem;
    }

    .calendar-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      color: var(--primary);
      flex-shrink: 0;
    }

    .mes-input {
      background: transparent;
      border: none;
      color: #f7f2f2;
      font-size: 0.8rem;
      font-weight: 100;
      padding-left: 10px;
      cursor: pointer;
      outline: none;
      max-width: 150px;
      color-scheme: dark;
    }

    .svg-icon {
      width: 18px;
      height: 18px;
      display: block;
      flex-shrink: 0;
    }

    .svg-icon.grande {
      width: 22px;
      height: 22px;
    }

    .svg-icon-pro {
      width: 16px;
      height: 16px;
      display: inline-block;
      vertical-align: middle;
      fill: currentColor;
    }

    .card-status-hero {
      display: flex;
      align-items: center;
      gap: 14px;
      background: var(--card-bg);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      padding: 10px 18px;
      border-radius: var(--radius-lg);
      border: 1px solid var(--card-border);
      box-shadow: var(--shadow-soft);
      margin-bottom: 14px;
      transition: border-color 0.2s ease;
    }

    .card-status-hero:hover {
      border-color: var(--card-border-hover);
    }

    .status-icone-wrap {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .status-icone-wrap.tranquilo { background: rgba(33, 145, 104, 0.93); }
    .status-icone-wrap.alerta { background: rgba(251, 191, 36, 0.15); }
    .status-icone-wrap.critico { background: rgba(248, 113, 113, 0.15); }

    .status-texto-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .status-eyebrow {
      font-size: 0.64rem;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .status-valor {
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: -0.2px;
    }

    .resumo-mes-card {
      background: var(--card-bg);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-lg);
      padding: 20px 18px 8px;
      margin-bottom: 18px;
      box-shadow: var(--shadow-soft);
    }

    .resumo-mes-titulo {
      font-size: 1.05rem;
      font-weight: 800;
      margin: 0 0 16px 0;
    }

    .resumo-colunas {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 4px;
      margin-bottom: 14px;
    }

    .resumo-coluna {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      text-align: center;
      position: relative;
    }

    .resumo-coluna + .resumo-coluna::before {
      content: '';
      position: absolute;
      left: 0;
      top: 6px;
      bottom: 6px;
      width: 1px;
      background: var(--card-border);
    }

    .resumo-icone {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .resumo-icone.saldo { background: rgba(148, 163, 184, 0.15); color: #cbd5e1; }
    .resumo-icone.entradas { background: rgba(52, 211, 153, 0.15); color: #34d399; }
    .resumo-icone.gastos { background: rgba(248, 113, 113, 0.15); color: #f87171; }

    .resumo-label {
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      color: var(--text-muted);
    }

    .resumo-valor {
      font-size: 0.95rem;
      font-weight: 800;
      letter-spacing: -0.2px;
    }

    .sparkline-wrap {
      width: 100%;
      line-height: 0;
      margin: 0 -18px;
    }

    .sparkline-svg {
      width: 100%;
      height: 90px;
      display: block;
    }

    .patrimonio-card {
      background: var(--card-bg);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-lg);
      padding: 18px;
      margin-bottom: 18px;
      box-shadow: var(--shadow-soft);
    }

    .patrimonio-titulo-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 14px;
    }

    .patrimonio-titulo-row strong {
      font-size: 1.05rem;
      font-weight: 800;
    }

    .patrimonio-info-icon {
      width: 20px;
      height: 20px;
      color: var(--primary);
      cursor: help;
    }

    .patrimonio-subcards {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }

    .patrimonio-subcard {
      display: flex;
      flex-direction: column;
      gap: 8px;
      background: rgba(148, 163, 184, 0.10);
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: var(--radius-md);
      padding: 12px;
    }

    .patrimonio-subcard-cabecalho {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .patrimonio-icone {
      width: 26px;
      height: 26px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .patrimonio-icone.reserva { background: rgba(96, 165, 250, 0.25); color: #93c5fd; }
    .patrimonio-icone.investimento { background: rgba(52, 211, 153, 0.25); color: #6ee7b7; }

    .patrimonio-label {
      font-size: 0.6rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #93c5fd;
      line-height: 1.2;
    }

    .patrimonio-subcard.investimento .patrimonio-label {
      color: #6ee7b7;
    }

    .patrimonio-valor {
      font-size: 1.05rem;
      font-weight: 800;
    }

    .patrimonio-progress-wrap {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .patrimonio-progress-legenda {
      display: flex;
      justify-content: space-between;
      font-size: 0.68rem;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .patrimonio-progress-track {
      width: 100%;
      height: 6px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
    }

    .patrimonio-progress-fill {
      height: 100%;
      border-radius: 20px;
      background: linear-gradient(90deg, #3b82f6, #10b981);
      transition: width 0.35s ease;
    }

    .patrimonio-progress-texto {
      text-align: center;
      font-size: 0.95rem;
      font-weight: 800;
    }

    .analise-card {
      background: linear-gradient(145deg, rgba(24, 26, 30, 0.78), rgba(13, 15, 18, 0.42));
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-lg);
      padding: 18px;
      margin-bottom: 18px;
      box-shadow: var(--shadow-soft);
    }

    .analise-cabecalho {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .analise-titulo {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 1rem;
      font-weight: 800;
    }

    .analise-select {
      background: rgba(56, 57, 58, 0.7);
      border: 1px solid var(--card-border);
      color: var(--text-primary);
      border-radius: var(--radius-sm);
      padding: 9px 12px;
      outline: none;
      font-size: 0.78rem;
      cursor: pointer;
      width: 100%;
      margin-bottom: 18px;
    }

    .analise-select:focus {
      border-color: var(--primary);
    }

    .analise-select option {
      background: #252629;
      color: #ffffff;
    }

    .categoria-corpo {
      display: flex;
      align-items: center;
      gap: 18px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .donut-wrap {
      width: 150px;
      height: 150px;
      flex-shrink: 0;
      position: relative;
    }

    .donut-svg {
      width: 100%;
      height: 100%;
    }

    .donut-svg circle {
      transition: stroke-dasharray 0.4s ease;
    }

    .legend-list {
      flex: 1;
      min-width: 180px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-height: 220px;
      overflow-y: auto;
      padding-right: 4px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .legend-dot {
      width: 9px;
      height: 9px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .legend-icone {
      color: var(--text-secondary);
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .legend-nome {
      flex: 1;
      font-size: 0.82rem;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .legend-valor {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--text-secondary);
      white-space: nowrap;
    }

    .categoria-stats {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .categoria-stat-box {
      background: rgba(255, 255, 255, 0.035);
      border: 1px solid rgba(255, 255, 255, 0.07);
      border-radius: var(--radius-sm);
      padding: 12px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .categoria-stat-label {
      font-size: 0.64rem;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--text-secondary);
    }

    .categoria-stat-valor {
      font-size: 1.15rem;
      font-weight: 800;
    }

    .analise-vazia,
    .placeholder-view {
      padding: 30px 15px;
      text-align: center;
      color: var(--text-secondary);
      border: 1px dashed var(--card-border);
      border-radius: var(--radius-md);
      font-size: 0.8rem;
    }

    .placeholder-view {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 60px 20px;
    }

    .placeholder-icone {
      font-size: 2.4rem;
    }

    .placeholder-titulo {
      font-size: 1rem;
      color: var(--text-primary);
    }

    .placeholder-texto {
      max-width: 320px;
      line-height: 1.5;
    }

    .bottom-nav {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 70;
      display: flex;
      justify-content: space-around;
      align-items: center;
      height: var(--nav-height);
      padding-bottom: env(safe-area-inset-bottom);
      background: rgba(17, 18, 20, 0.85);
      backdrop-filter: blur(18px);
      -webkit-backdrop-filter: blur(18px);
      border-top: 1px solid var(--card-border);
    }

    .nav-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      flex: 1;
      padding: 6px 4px;
    }

    .nav-tab-label {
      font-size: 0.66rem;
      font-weight: 700;
    }

    .nav-tab.ativo {
      color: var(--tab-active);
    }

    .nav-tab-icon {
      width: 22px;
      height: 22px;
      display: block;
    }

    .input-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10px;
      background: var(--card-bg);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      padding: 18px;
      border-radius: var(--radius-lg);
      margin-bottom: 20px;
      border: 1px solid var(--card-border);
      box-shadow: var(--shadow-soft);
    }

    @media (min-width: 640px) {
      .input-grid {
        grid-template-columns: 2fr 1fr 1fr 1fr;
      }
    }

    .input-grid input,
    .input-grid select {
      background: rgba(56, 57, 58, 0.6);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-sm);
      padding: 12px 14px;
      color: var(--text-primary);
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.2s ease;
      width: 100%;
    }

    .input-grid input::placeholder {
      color: var(--text-secondary);
    }

    .input-grid input:focus,
    .input-grid select:focus {
      border-color: var(--primary);
    }

    .input-grid select option {
      background: #252629;
      color: #ffffff;
    }

    .btn-salvar {
      grid-column: 1 / -1;
      padding: 13px;
      border: none;
      border-radius: var(--radius-sm);
      cursor: pointer;
      color: white;
      font-weight: 700;
      font-size: 0.9rem;
      background: linear-gradient(135deg, var(--primary), var(--primary-dark));
      transition: transform 0.15s ease, opacity 0.2s ease;
    }

    @media (min-width: 640px) {
      .btn-salvar {
        grid-column: auto;
      }
    }

    .btn-salvar:hover {
      opacity: 0.92;
    }

    .btn-salvar:active {
      transform: scale(0.97);
    }

    .lancamentos-view {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-width: 0;
    }

    .lancamentos-form-fixed {
      flex: 0 0 auto;
      width: 100%;
      min-width: 0;
      position: relative;
      z-index: 2;
    }

    .lancamentos-list-scroll {
      width: 100%;
      min-width: 0;
      padding-bottom: calc(var(--nav-height) + 24px);
    }

    .lista {
      display: flex;
      flex-direction: column;
      gap: 8px;
      width: 100%;
      min-width: 0;
    }

    .lista-limitada {
      max-height: 340px;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 4px;
      scrollbar-width: thin;
      scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
    }

    .lista-limitada::-webkit-scrollbar {
      width: 5px;
    }

    .lista-limitada::-webkit-scrollbar-track {
      background: transparent;
    }

    .lista-limitada::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.4);
      border-radius: 10px;
    }

    .lista-limitada::-webkit-scrollbar-thumb:hover {
      background: rgba(148, 163, 184, 0.65);
    }

    .item-row {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: stretch;
      width: 100%;
      min-width: 0;
      padding: 16px;
      background: var(--card-bg);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-md);
      transition: border-color 0.2s ease;
    }

    .item-row:hover {
      border-color: var(--card-border-hover);
    }

    @media (min-width: 640px) {
      .item-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .item-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .item-descricao {
      font-weight: 700;
      font-size: 0.95rem;
    }

    .item-categoria {
      font-size: 0.68rem;
      color: var(--text-secondary);
      font-weight: 600;
    }

    .item-linha-central {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    @media (min-width: 640px) {
      .item-linha-central {
        flex: 1;
        padding: 0 16px;
      }
    }

    .badge {
      padding: 5px 12px;
      border-radius: 20px;
      font-size: 0.68rem;
      font-weight: 800;
      text-align: center;
      letter-spacing: 0.4px;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .status-recebido { background: rgba(6, 95, 70, 0.5); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); }
    .status-pago { background: rgba(30, 58, 138, 0.5); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.3); }
    .status-pendente { background: rgba(146, 64, 14, 0.5); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); }
    .status-reserva { background: rgba(37, 99, 235, 0.18); color: #60a5fa; border: 1px solid rgba(96, 165, 250, 0.3); }
    .status-investimento { background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); }
    .status-saida-reserva { background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); }
    .status-saida-investimento { background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); }

    .valor {
      font-weight: 800;
      font-size: 0.95rem;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      white-space: nowrap;
    }

    .valor-entrada { color: #2ce444; }
    .valor-saida { color: #ec0a0a; }
    .valor-reserva { color: #60a5fa; }
    .valor-investimento { color: #34d399; }
    .valor-saida-reserva { color: #f87171; }
    .valor-saida-investimento { color: #f87171; }

    .mono {
      font-family: 'Consolas', monospace;
      font-size: 0.78rem;
      color: var(--text-secondary);
    }

    .acoes-row {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .btn-icon {
      background: rgba(238, 242, 247, 0.5);
      border: 1px solid var(--card-border);
      color: white;
      width: 34px;
      height: 34px;
      border-radius: var(--radius-sm);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background 0.2s ease, transform 0.15s ease;
    }

    .btn-icon:hover { transform: translateY(-1px); }
    .btn-icon.editar:hover { background: rgba(59, 130, 246, 0.5); }
    .btn-icon.excluir { background: rgba(127, 29, 29, 0.6); }
    .btn-icon.excluir:hover { background: rgba(185, 28, 28, 0.8); }

    .vazio {
      text-align: center;
      padding: 40px 20px;
      color: var(--text-secondary);
      background: var(--card-bg);
      border-radius: var(--radius-md);
      border: 1px dashed var(--card-border);
    }

    @media (max-width: 639px) {
      .app-container.lancamentos-ativo {
        height: 100dvh;
        min-height: 100dvh;
        max-height: 100dvh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        padding-bottom: 0;
      }
      .app-container.lancamentos-ativo .topbar { flex: 0 0 auto; }
      .app-container.lancamentos-ativo .lancamentos-view { flex: 1 1 auto; min-height: 0; height: 100%; overflow: hidden; }
      .app-container.lancamentos-ativo .lancamentos-form-fixed { flex: 0 0 auto; width: 100%; min-width: 0; background: var(--bg-base); padding-bottom: 8px; }
      .app-container.lancamentos-ativo .lancamentos-list-scroll { flex: 1 1 auto; width: 100%; min-height: 0; height: 100%; overflow-y: auto; overflow-x: hidden; padding-right: 0; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; }
      .app-container.lancamentos-ativo .lista-limitada { width: 100%; max-width: 100%; max-height: none; height: auto; overflow: visible; padding-right: 0; }
      .app-container.lancamentos-ativo .item-row { width: 100%; max-width: 100%; min-width: 0; padding: 14px; }
      .categoria-corpo { flex-direction: column; align-items: center; }
    }
  `],
  template: `
    <div
      class="app-container"
      [class.lancamentos-ativo]="viewAtual() === 'lancamentos'"
    >
      <div class="topbar">
        <button
          class="btn-hamburguer"
          (click)="alternarMenu()"
          [attr.aria-expanded]="menuAberto()"
          aria-controls="drawer-fluxnexis"
          aria-label="Abrir menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <h1 class="flux-title">
          FluxNexis
        </h1>
      </div>

      <nav
        class="drawer"
        id="drawer-fluxnexis"
        [class.aberto]="menuAberto()"
        role="navigation"
        aria-label="Menu principal"
      >
        <div class="drawer-header">
          <span class="drawer-titulo">
            FluxNexis
          </span>

          <button
            class="btn-fechar-drawer"
            (click)="fecharMenu()"
            aria-label="Fechar menu"
          >
            ✕
          </button>
        </div>

        <p class="secao-titulo">
          Ações
        </p>

        <button
          class="acao-item acao-pdf"
          (click)="gerarPDF()"
          [disabled]="operacaoEmAndamento"
        >
          📄 Exportar PDF
        </button>

        <button
          class="acao-item acao-excel"
          (click)="exportarExcel()"
          [disabled]="operacaoEmAndamento"
        >
          📊 Exportar Excel
        </button>

        <button
          class="acao-item acao-backup"
          (click)="exportarBackup()"
          [disabled]="operacaoEmAndamento"
        >
          💾 Fazer Backup
        </button>

        <input
          #inputBackup
          type="file"
          accept=".json"
          hidden
          (change)="importarBackup($event)"
        />

        <button
          class="acao-item acao-restore"
          (click)="inputBackup.click()"
          [disabled]="operacaoEmAndamento"
        >
          🔄 Restaurar Backup
        </button>

        <div class="drawer-rodape">
          FluxNexis · Controle Financeiro
        </div>
      </nav>

      <div
        class="backdrop-drawer"
        *ngIf="menuAberto()"
        (click)="fecharMenu()"
      ></div>

      <ng-container *ngIf="viewAtual() === 'inicio'">
        <div class="mes-selector-box">
          <span class="calendar-icon">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="3"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </span>

          <input
            type="month"
            [ngModel]="mesAtual"
            (ngModelChange)="selecionarMes($event)"
            class="mes-input"
          />
        </div>

        <div class="card-status-hero">
          <div
            class="status-icone-wrap"
            [class.tranquilo]="statusFinanceiro().nivel === 'tranquilo'"
            [class.alerta]="statusFinanceiro().nivel === 'alerta'"
            [class.critico]="statusFinanceiro().nivel === 'critico'"
          >
            <svg
              class="svg-icon grande"
              viewBox="0 0 24 24"
              fill="none"
              [attr.stroke]="statusFinanceiro().cor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 3v18h18"></path>

              <rect
                x="7"
                y="13"
                width="3"
                height="5"
                [attr.fill]="statusFinanceiro().cor"
                stroke="none"
              ></rect>

              <rect
                x="12"
                y="9"
                width="3"
                height="9"
                [attr.fill]="statusFinanceiro().cor"
                stroke="none"
              ></rect>

              <rect
                x="17"
                y="5"
                width="3"
                height="13"
                [attr.fill]="statusFinanceiro().cor"
                stroke="none"
              ></rect>
            </svg>
          </div>

          <div class="status-texto-wrap">
            <span class="status-eyebrow">
              Status financeiro do mês
            </span>

            <strong
              class="status-valor"
              [style.color]="statusFinanceiro().cor"
            >
              {{ statusFinanceiro().texto }}
            </strong>
          </div>
        </div>

        <div class="resumo-mes-card">
          <strong class="resumo-mes-titulo">
            Resumo do Mês
          </strong>

          <div class="resumo-colunas">
            <div class="resumo-coluna">
              <div class="resumo-icone saldo">
                <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2"></rect>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"></path>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                </svg>
              </div>

              <span class="resumo-label">
                Saldo Real
              </span>

              <strong
                class="resumo-valor"
                [style.color]="saldoReal() >= 0 ? '#34d399' : '#f87171'"
              >
                R$ {{ saldoReal().toFixed(2) }}
              </strong>
            </div>

            <div class="resumo-coluna">
              <div class="resumo-icone entradas">
                <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              </div>

              <span class="resumo-label">
                Entradas
              </span>

              <strong class="resumo-valor">
                R$ {{ totalEntradas().toFixed(2) }}
              </strong>
            </div>

            <div class="resumo-coluna">
              <div class="resumo-icone gastos">
                <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline>
                  <polyline points="17 18 23 18 23 12"></polyline>
                </svg>
              </div>

              <span class="resumo-label">
                Gastos
              </span>

              <strong class="resumo-valor">
                R$ {{ totalGastosMes().toFixed(2) }}
              </strong>
            </div>
          </div>

          <div class="sparkline-wrap">
            <svg
              class="sparkline-svg"
              viewBox="0 0 680 90"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="sparklineArea" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#ef4444" stop-opacity="0.35"></stop>
                  <stop offset="55%" stop-color="#10b981" stop-opacity="0.25"></stop>
                  <stop offset="100%" stop-color="#10b981" stop-opacity="0.45"></stop>
                </linearGradient>
                <linearGradient id="sparklineLinha" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stop-color="#f87171"></stop>
                  <stop offset="55%" stop-color="#34d399"></stop>
                  <stop offset="100%" stop-color="#10b981"></stop>
                </linearGradient>
              </defs>

              <path
                [attr.d]="evolucaoSaldoMensal().area"
                fill="url(#sparklineArea)"
                stroke="none"
              ></path>

              <path
                [attr.d]="evolucaoSaldoMensal().linha"
                fill="none"
                stroke="url(#sparklineLinha)"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              ></path>
            </svg>
          </div>
        </div>

        <div class="patrimonio-card">
          <div class="patrimonio-titulo-row">
            <strong>
              Patrimônio e Investimentos
            </strong>

            <svg
              class="patrimonio-info-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              title="Reserva e investimentos acumulados em todos os meses"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="11"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
          </div>

          <div class="patrimonio-subcards">
            <div class="patrimonio-subcard reserva">
              <div class="patrimonio-subcard-cabecalho">
                <div class="patrimonio-icone reserva">
                  <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                </div>

                <span class="patrimonio-label">
                  Reserva acumulada
                </span>
              </div>

              <strong class="patrimonio-valor">
                R$ {{ totalReserva().toFixed(2) }}
              </strong>
            </div>

            <div class="patrimonio-subcard investimento">
              <div class="patrimonio-subcard-cabecalho">
                <div class="patrimonio-icone investimento">
                  <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    <polyline points="17 6 23 6 23 12"></polyline>
                  </svg>
                </div>

                <span class="patrimonio-label">
                  Investimentos acumulados
                </span>
              </div>

              <strong class="patrimonio-valor">
                R$ {{ totalInvestimentos().toFixed(2) }}
              </strong>
            </div>
          </div>

          <div class="patrimonio-progress-wrap">
            <div class="patrimonio-progress-legenda">
              <span>Economia do mês</span>
              <span>Gastos do mês</span>
            </div>

            <div class="patrimonio-progress-track">
              <div
                class="patrimonio-progress-fill"
                [style.width.%]="percentualEconomiaMes()"
              ></div>
            </div>

            <p class="patrimonio-progress-texto">
              R$ {{ economiaMes().toFixed(2) }} / R$ {{ totalGastosMes().toFixed(2) }}
            </p>
          </div>
        </div>

        <div class="analise-card">
          <div class="analise-cabecalho">
            <span class="analise-titulo">
              📊 Análise por Categoria
            </span>
          </div>

          <select
            class="analise-select"
            [ngModel]="tipoAnaliseSelecionado()"
            (ngModelChange)="selecionarTipoAnalise($event)"
          >
            <option
              *ngFor="let tipo of tiposParaAnalise"
              [value]="tipo"
            >
              {{ rotuloTipo(tipo) }}
            </option>
          </select>

          <ng-container *ngIf="analiseTipoAtual() as analise; else analiseVazia">
            <div class="categoria-corpo">
              <div class="donut-wrap">
                <svg class="donut-svg" viewBox="0 0 160 160">
                  <circle
                    cx="80"
                    cy="80"
                    r="60"
                    fill="none"
                    stroke="rgba(255,255,255,0.06)"
                    stroke-width="20"
                  ></circle>

                  <g transform="rotate(-90 80 80)">
                    <circle
                      *ngFor="let item of analise.itens"
                      cx="80"
                      cy="80"
                      r="60"
                      fill="none"
                      stroke-width="20"
                      [attr.stroke]="item.cor"
                      [attr.stroke-dasharray]="item.dashArray"
                      [attr.stroke-dashoffset]="item.dashOffset"
                    ></circle>
                  </g>
                </svg>
              </div>

              <div class="legend-list">
                <div
                  class="legend-item"
                  *ngFor="let item of analise.itens"
                >
                  <span
                    class="legend-dot"
                    [style.background]="item.cor"
                  ></span>

                  <span class="legend-icone" [innerHTML]="item.iconeSvg"></span>

                  <span class="legend-nome">
                    {{ item.categoria }}
                  </span>

                  <span class="legend-valor">
                    R$ {{ item.valor.toFixed(2) }}
                  </span>
                </div>
              </div>
            </div>

            <div class="categoria-stats">
              <div class="categoria-stat-box">
                <span class="categoria-stat-label">
                  Total ({{ rotuloTipo(tipoAnaliseSelecionado()) }})
                </span>

                <strong class="categoria-stat-valor">
                  R$ {{ analise.total.toFixed(2) }}
                </strong>
              </div>

              <div class="categoria-stat-box">
                <span class="categoria-stat-label">
                  Lançamentos
                </span>

                <strong class="categoria-stat-valor">
                  {{ analise.quantidadeTotal }}
                </strong>
              </div>
            </div>
          </ng-container>

          <ng-template #analiseVazia>
            <div class="analise-vazia">
              Nenhum lançamento do tipo "{{ rotuloTipo(tipoAnaliseSelecionado()) }}" neste mês.
            </div>
          </ng-template>
        </div>
      </ng-container>

      <ng-container *ngIf="viewAtual() === 'relatorio'">
        <div class="cabecalho-pagina">
          <h2 class="titulo-pagina">
            Relatório
          </h2>

          <button class="link-voltar" (click)="irParaInicio()">
            Voltar
          </button>
        </div>

        <div class="placeholder-view">
          <span class="placeholder-icone">📈</span>

          <strong class="placeholder-titulo">
            Relatórios detalhados em breve
          </strong>

          <p class="placeholder-texto">
            Comparativos entre meses, projeção de fluxo de caixa e exportação avançada
            vão entrar aqui. Por ora, use "Exportar PDF" e "Exportar Excel" no menu lateral.
          </p>
        </div>
      </ng-container>

      <ng-container *ngIf="viewAtual() === 'metas'">
        <div class="cabecalho-pagina">
          <h2 class="titulo-pagina">
            Metas
          </h2>

          <button class="link-voltar" (click)="irParaInicio()">
            Voltar
          </button>
        </div>

        <div class="placeholder-view">
          <span class="placeholder-icone">🎯</span>

          <strong class="placeholder-titulo">
            Metas financeiras em breve
          </strong>

          <p class="placeholder-texto">
            Defina limites de gasto por categoria e acompanhe metas de reserva e
            investimento diretamente aqui.
          </p>
        </div>
      </ng-container>

      <ng-container *ngIf="viewAtual() === 'lancamentos'">
        <div class="lancamentos-view">
          <div
            class="lancamentos-form-fixed"
            #formTop
          >
            <div class="cabecalho-pagina">
              <h2 class="titulo-pagina">
                Meus Lançamentos
              </h2>

              <button
                class="link-voltar"
                (click)="irParaInicio()"
              >
                Voltar
              </button>
            </div>

            <div class="input-grid">
              <input
                [(ngModel)]="novo.descricao"
                placeholder="Descrição"
              />

              <input
                type="number"
                [(ngModel)]="novo.valorRealizado"
                placeholder="R$ Valor"
              />

              <input
                [(ngModel)]="novo.categoria"
                placeholder="Categoria"
              />

              <select
                [(ngModel)]="novo.tipo"
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
                <option value="reserva">Reserva</option>
                <option value="investimento">Investimento</option>
                <option value="saida-reserva">Saída (Debitar da Reserva)</option>
                <option value="saida-investimento">Saída (Debitar dos Investimentos)</option>
              </select>

              <select
                [(ngModel)]="novo.statusPagamento"
              >
                <option value="pago">Pago/Recebido</option>
                <option value="pendente">Pendente/Aguardando</option>
              </select>

              <button
                class="btn-salvar"
                (click)="salvar()"
              >
                {{
                  editandoId
                    ? 'Atualizar'
                    : 'Salvar Lançamento'
                }}
              </button>
            </div>
          </div>

          <div class="lancamentos-list-scroll">
            <div
              class="lista lista-limitada"
              *ngIf="
                lancamentos().length > 0;
                else listaVaziaPagina
              "
            >
              <div
                *ngFor="let item of lancamentos()"
                class="item-row"
              >
                <div class="item-info">
                  <span class="item-descricao">
                    {{ item.descricao }}
                  </span>

                  <span class="item-categoria">
                    Categoria:
                    {{ item.categoria || 'Geral' }}
                  </span>

                  <span class="mono">
                    {{
                      item.data
                        | date:'dd/MM/yyyy HH:mm'
                    }}
                  </span>
                </div>

                <div class="item-linha-central">
                  <span
                    class="badge"
                    [ngClass]="{
                      'status-recebido': item.statusPagamento === 'pago' && item.tipo === 'entrada',
                      'status-pago': item.statusPagamento === 'pago' && item.tipo === 'saida',
                      'status-pendente': item.statusPagamento === 'pendente',
                      'status-reserva': item.statusPagamento === 'pago' && item.tipo === 'reserva',
                      'status-investimento': item.statusPagamento === 'pago' && item.tipo === 'investimento',
                      'status-saida-reserva': item.statusPagamento === 'pago' && item.tipo === 'saida-reserva',
                      'status-saida-investimento': item.statusPagamento === 'pago' && item.tipo === 'saida-investimento'
                    }"
                  >
                    {{
                      item.statusPagamento === 'pendente'
                        ? '⏳ PENDENTE'
                        : item.tipo === 'entrada'
                          ? '✅ RECEBIDO'
                          : item.tipo === 'saida'
                            ? '💰 PAGO'
                            : item.tipo === 'reserva'
                              ? '🛡️ RESERVA'
                              : item.tipo === 'investimento'
                                ? '📈 INVESTIMENTO'
                                : item.tipo === 'saida-reserva'
                                  ? '🛡️➖ SAÍDA RESERVA'
                                  : '📈➖ SAÍDA INVEST.'
                    }}
                  </span>

                  <span
                    class="valor"
                    [ngClass]="{
                      'valor-entrada': item.tipo === 'entrada',
                      'valor-saida': item.tipo === 'saida',
                      'valor-reserva': item.tipo === 'reserva',
                      'valor-investimento': item.tipo === 'investimento',
                      'valor-saida-reserva': item.tipo === 'saida-reserva',
                      'valor-saida-investimento': item.tipo === 'saida-investimento'
                    }"
                  >
                    R$ {{ item.valorRealizado.toFixed(2) }}
                  </span>
                </div>

                <div class="acoes-row">
                  <button
                    class="btn-icon editar"
                    (click)="preencherEdicao(item)"
                    title="Editar"
                  >
                    ✎
                  </button>

                  <button
                    class="btn-icon excluir"
                    (click)="excluir(item.id!)"
                    title="Excluir"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <ng-template #listaVaziaPagina>
              <div class="vazio">
                Nenhum lançamento neste mês.
                Cadastre o primeiro acima.
              </div>
            </ng-template>
          </div>
        </div>
      </ng-container>
    </div>

    <nav class="bottom-nav" role="navigation" aria-label="Navegação principal">
      <button
        class="nav-tab"
        [class.ativo]="viewAtual() === 'inicio'"
        (click)="irParaInicio()"
      >
        <svg class="nav-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 10.5 12 3l9 7.5"></path>
          <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"></path>
        </svg>
        <span class="nav-tab-label">Início</span>
      </button>

      <button
        class="nav-tab"
        [class.ativo]="viewAtual() === 'lancamentos'"
        (click)="irParaLancamentos()"
      >
        <svg class="nav-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M7 3v4M7 3H4a1 1 0 0 0-1 1v3"></path>
          <path d="M17 21v-4M17 21h3a1 1 0 0 0 1-1v-3"></path>
          <path d="M3 7h13a4 4 0 0 1 4 4v1"></path>
          <path d="M21 17H8a4 4 0 0 1-4-4v-1"></path>
        </svg>
        <span class="nav-tab-label">Lançamentos</span>
      </button>
    </nav>
  `
})
export class DashboardComponent implements OnInit {
  @ViewChild('formTop')
  formTop?: ElementRef<HTMLDivElement>;

  viewAtual = signal<ViewAtualExtendida>('inicio');
  menuAberto = signal<boolean>(false);
  lancamentos = signal<Lancamento[]>([]);
  todosLancamentos = signal<Lancamento[]>([]);
  tipoAnaliseSelecionado = signal<TipoLancamentoFinanceiro>('saida');
  editandoId: number | null = null;
  operacaoEmAndamento = false;

  mesAtual: string = new Date().toISOString().substring(0, 7);

  novo: Lancamento & {
    tipo: TipoLancamentoFinanceiro;
  } = this.criarLancamentoVazio();

  readonly tiposParaAnalise: TipoLancamentoFinanceiro[] = [
    'saida',
    'entrada',
    'reserva',
    'investimento',
    'saida-reserva',
    'saida-investimento'
  ];

  private readonly rotulosTipo: Partial<Record<TipoLancamentoFinanceiro, string>> = {
    entrada: 'Entrada',
    saida: 'Saída (Despesas)',
    reserva: 'Reserva',
    investimento: 'Investimento',
    'saida-reserva': 'Saída da Reserva',
    'saida-investimento': 'Saída dos Investimentos'
  };

  private readonly iconesSvgCategoria: Record<string, string> = {
    'alimentacao': `<svg class="svg-icon-pro" viewBox="0 0 24 24"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>`,
    'mercado': `<svg class="svg-icon-pro" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>`,
    'transporte': `<svg class="svg-icon-pro" viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.22.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.04 3H5.81l1.04-3zM19 17H5v-4.66l.12-.34h13.76l.12.34V17z"/></svg>`,
    'combustivel': `<svg class="svg-icon-pro" viewBox="0 0 24 24"><path d="M19.77 7.23l.01-.01-3.71-3.71L14.69 5.06 17 7.37V9h-3V6c0-1.1-.9-2-2-2H9c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h3c1.1 0 2-.9 2-2v-4h3v2c0 1.1.9 2 2 2h2c1.1 0 2-.9 2-2v-6.77c0-.69-.28-1.32-.77-1.8zm-5.77 9.77H9V6h5v11z"/></svg>`,
    'lazer': `<svg class="svg-icon-pro" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>`,
    'educacao': `<svg class="svg-icon-pro" viewBox="0 0 24 24"><path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"/></svg>`,
    'saude': `<svg class="svg-icon-pro" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`,
    'moradia': `<svg class="svg-icon-pro" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
    'aluguel': `<svg class="svg-icon-pro" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
    'assinatura': `<svg class="svg-icon-pro" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-5 14H4v-4h11v4zm0-5H4V9h11v4zm5 5h-4V9h4v9z"/></svg>`,
    'geral': `<svg class="svg-icon-pro" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>`
  };

  private readonly paletaCoresCategoria: string[] = [
    '#0d9488', '#2563eb', '#10b981', '#f59e0b', '#ef4444',
    '#8b5cf6', '#ec4899', '#facc15', '#06b6d4', '#84cc16'
  ];

  private readonly mapaCorPorCategoria = new Map<string, string>();
  private proximoIndiceCor = 0;

  private readonly raioDonut = 60;
  private readonly circunferenciaDonut = 2 * Math.PI * this.raioDonut;

  totalEntradas = computed(() =>
    this.analiseService.somarValorRealizado(
      this.analiseService.filtrarPorTipoEStatusPago(this.lancamentos(), 'entrada')
    )
  );

  totalDespesas = computed(() =>
    this.analiseService.somarValorRealizado(
      this.analiseService.filtrarPorTipoEStatusPago(this.lancamentos(), 'saida')
    )
  );

  private totalReservaMes = computed(() =>
    this.analiseService.somarValorRealizado(
      this.analiseService.filtrarPorTipoEStatusPago(this.lancamentos(), 'reserva')
    )
  );

  private totalSaidaReservaMes = computed(() =>
    this.analiseService.somarValorRealizado(
      this.analiseService.filtrarPorTipoEStatusPago(this.lancamentos(), 'saida-reserva')
    )
  );

  private totalInvestimentoMes = computed(() =>
    this.analiseService.somarValorRealizado(
      this.analiseService.filtrarPorTipoEStatusPago(this.lancamentos(), 'investimento')
    )
  );

  private totalSaidaInvestimentoMes = computed(() =>
    this.analiseService.somarValorRealizado(
      this.analiseService.filtrarPorTipoEStatusPago(this.lancamentos(), 'saida-investimento')
    )
  );

  totalGastosMes = computed(() =>
    this.totalDespesas() +
    this.totalSaidaReservaMes() +
    this.totalSaidaInvestimentoMes()
  );

  totalReserva = computed(() => {
    const aportes = this.analiseService.somarValorRealizado(
      this.analiseService.filtrarPorTipoEStatusPago(this.todosLancamentos(), 'reserva')
    );
    const retiradas = this.analiseService.somarValorRealizado(
      this.analiseService.filtrarPorTipoEStatusPago(this.todosLancamentos(), 'saida-reserva')
    );
    return aportes - retiradas;
  });

  totalInvestimentos = computed(() => {
    const aportes = this.analiseService.somarValorRealizado(
      this.analiseService.filtrarPorTipoEStatusPago(this.todosLancamentos(), 'investimento')
    );
    const retiradas = this.analiseService.somarValorRealizado(
      this.analiseService.filtrarPorTipoEStatusPago(this.todosLancamentos(), 'saida-investimento')
    );
    return aportes - retiradas;
  });

  saldoReal = computed(() =>
    this.totalEntradas() -
    this.totalDespesas() -
    this.totalReservaMes() -
    this.totalInvestimentoMes()
  );

  economiaMes = computed(() =>
    this.totalReservaMes() + this.totalInvestimentoMes()
  );

  percentualEconomiaMes = computed(() => {
    const gastos = this.totalGastosMes();
    if (gastos <= 0) return 0;
    return Math.min((this.economiaMes() / gastos) * 100, 100);
  });

  statusFinanceiro = computed(() =>
    this.analiseService.calcularStatusFinanceiro(this.saldoReal())
  );

  analiseTipoAtual = computed<AnaliseTipoResultado | null>(() => {
    const tipo = this.tipoAnaliseSelecionado();
    const registros = this.lancamentos().filter(
      item => item.tipo === tipo && item.statusPagamento === 'pago'
    );

    if (registros.length === 0) {
      return null;
    }

    const mapaCategorias = new Map<string, { valor: number; quantidade: number }>();

    for (const registro of registros) {
      let categoria = registro.categoria?.trim() || 'Geral';

      if (tipo === 'saida-reserva') {
        categoria = `Reserva: ${categoria}`;
      } else if (tipo === 'saida-investimento') {
        categoria = `Investimento: ${categoria}`;
      }

      const atual = mapaCategorias.get(categoria) ?? { valor: 0, quantidade: 0 };
      atual.valor += registro.valorRealizado;
      atual.quantidade += 1;
      mapaCategorias.set(categoria, atual);
    }

    const total = Array.from(mapaCategorias.values())
      .reduce((soma, item) => soma + item.valor, 0);

    if (total <= 0) return null;

    let percentualAcumulado = 0;

    const itens: ItemDonut[] = Array.from(mapaCategorias.entries())
      .sort((a, b) => b[1].valor - a[1].valor)
      .map(([categoria, dados]) => {
        const percentual = (dados.valor / total) * 100;
        const comprimentoArco = (percentual / 100) * this.circunferenciaDonut;
        const dashArray = `${comprimentoArco.toFixed(2)} ${(this.circunferenciaDonut - comprimentoArco).toFixed(2)}`;
        const dashOffset = -((percentualAcumulado / 100) * this.circunferenciaDonut);

        percentualAcumulado += percentual;

        return {
          categoria,
          valor: dados.valor,
          quantidade: dados.quantidade,
          percentual,
          cor: this.corParaCategoria(categoria),
          iconeSvg: this.iconeSvgParaCategoria(categoria),
          dashArray,
          dashOffset
        };
      });

    return {
      itens,
      total,
      quantidadeTotal: registros.length
    };
  });

  evolucaoSaldoMensal = computed(() => {
    const registros = this.lancamentos();
    const larguraSvg = 680;
    const alturaSvg = 90;

    if (!this.mesAtual || registros.length === 0) {
      const linhaBase = `M0,${alturaSvg / 2} L${larguraSvg},${alturaSvg / 2}`;
      return {
        linha: linhaBase,
        area: `${linhaBase} L${larguraSvg},${alturaSvg} L0,${alturaSvg} Z`
      };
    }

    const [ano, mes] = this.mesAtual.split('-').map(Number);
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const saldoPorDia: number[] = new Array(diasNoMes).fill(0);

    for (const registro of registros) {
      if (registro.statusPagamento !== 'pago') continue;
      const dia = new Date(registro.data).getDate();
      const indiceDia = Math.min(Math.max(dia - 1, 0), diasNoMes - 1);
      const sinal = registro.tipo === 'entrada' ? 1 : (registro.tipo === 'saida' || registro.tipo === 'reserva' || registro.tipo === 'investimento' ? -1 : 0);
      saldoPorDia[indiceDia] += registro.valorRealizado * sinal;
    }

    const acumulados: number[] = [];
    let corrente = 0;
    for (const valorDia of saldoPorDia) {
      corrente += valorDia;
      acumulados.push(corrente);
    }

    const minimo = Math.min(...acumulados, 0);
    const maximo = Math.max(...acumulados, 0);
    const amplitude = (maximo - minimo) || 1;
    const passoX = larguraSvg / ((diasNoMes - 1) || 1);

    const pontos: PontoEvolucao[] = acumulados.map((valor, indice) => ({
      x: indice * passoX,
      y: alturaSvg - ((valor - minimo) / amplitude) * alturaSvg
    }));

    const linha = pontos
      .map((ponto, indice) => `${indice === 0 ? 'M' : 'L'}${ponto.x.toFixed(1)},${ponto.y.toFixed(1)}`)
      .join(' ');

    const area = `${linha} L${larguraSvg},${alturaSvg} L0,${alturaSvg} Z`;
    return { linha, area };
  });

  constructor(
    private readonly service: FinanceiroService,
    private readonly analiseService: AnaliseFinanceiraService,
    private readonly pdfExportService: PdfExportService,
    private readonly excelExportService: ExcelExportService,
    private readonly backupService: BackupService,
    private readonly notificacaoService: NotificacaoService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    await this.carregar();
    await this.carregarTodosLancamentos();
  }

  alternarMenu(): void { this.menuAberto.update(valor => !valor); }
  fecharMenu(): void { this.menuAberto.set(false); }
  irParaInicio(): void { this.viewAtual.set('inicio'); this.fecharMenu(); }
  irParaLancamentos(): void { this.viewAtual.set('lancamentos'); this.fecharMenu(); }
  irParaRelatorio(): void { this.viewAtual.set('relatorio'); this.fecharMenu(); }
  irParaMetas(): void { this.viewAtual.set('metas'); this.fecharMenu(); }

  selecionarTipoAnalise(tipo: string): void {
    this.tipoAnaliseSelecionado.set(tipo as TipoLancamentoFinanceiro);
  }

  rotuloTipo(tipo: TipoLancamentoFinanceiro): string {
    return this.rotulosTipo[tipo] ?? tipo;
  }

  private iconeSvgParaCategoria(categoria: string): string {
    const normalizada = this.normalizarTexto(categoria);
    const chave = Object.keys(this.iconesSvgCategoria).find(
      k => normalizada === k || normalizada.includes(k)
    );
    return chave ? this.iconesSvgCategoria[chave] : this.iconesSvgCategoria['geral'];
  }

  private corParaCategoria(categoria: string): string {
    const chave = this.normalizarTexto(categoria);

    const corExistente = this.mapaCorPorCategoria.get(chave);
    if (corExistente) {
      return corExistente;
    }

    const corNova = this.paletaCoresCategoria[this.proximoIndiceCor % this.paletaCoresCategoria.length];
    this.mapaCorPorCategoria.set(chave, corNova);
    this.proximoIndiceCor++;

    return corNova;
  }

  private normalizarTexto(valor: string): string {
    return valor.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  async carregar(): Promise<void> {
    if (!this.mesEhValido(this.mesAtual)) {
      this.lancamentos.set([]);
      return;
    }
    const lista = await firstValueFrom(this.service.listarPorMes(this.mesAtual));
    this.lancamentos.set(lista);
    this.cdr.markForCheck();
  }

  async carregarTodosLancamentos(): Promise<void> {
    const lista = await firstValueFrom(this.service.listar());
    this.todosLancamentos.set(lista);
    this.cdr.markForCheck();
  }

  get nomeMesAtual(): string {
    if (!this.mesAtual) return 'Selecione o mês';
    const [ano, mes] = this.mesAtual.split('-').map(Number);
    return new Date(ano, mes - 1, 1).toLocaleString('pt-BR', { month: 'long' });
  }

  async selecionarMes(novoMes: string): Promise<void> {
    this.mesAtual = novoMes;
    await this.carregar();
  }

  private mesEhValido(mes: string): boolean {
    return /^\d{4}-\d{2}$/.test(mes);
  }

  async salvar(): Promise<void> {
    if (!this.novo.descricao.trim()) {
      this.notificacaoService.avisar('Informe uma descrição.');
      return;
    }
    if (!this.novo.valorRealizado || this.novo.valorRealizado <= 0) {
      this.notificacaoService.avisar('Informe um valor maior que zero.');
      return;
    }

    if (this.novo.tipo === 'saida-reserva' || this.novo.tipo === 'saida-investimento') {
      const tipoValidacao = this.novo.tipo;
      const validacao = (this.service as any).validarDisponibilidadeRecurso
        ? (this.service as any).validarDisponibilidadeRecurso(
            this.todosLancamentos(),
            tipoValidacao,
            this.novo.valorRealizado
          )
        : { valido: true };

      if (!validacao.valido) {
        this.notificacaoService.avisar(validacao.mensagem);
        return;
      }
    }

    if (!this.novo.categoria?.trim()) {
      this.novo.categoria = 'Geral';
    }

    if (!this.editandoId) {
      this.novo.data = new Date().toISOString();
    }

    const lancamentoParaSalvar: Lancamento = {
      ...this.novo,
      categoria: this.novo.categoria.trim(),
      tipo: this.novo.tipo as Lancamento['tipo']
    };

    try {
      this.operacaoEmAndamento = true;
      if (this.editandoId) {
        await firstValueFrom(this.service.atualizar(this.editandoId, lancamentoParaSalvar));
      } else {
        await firstValueFrom(this.service.adicionar(lancamentoParaSalvar));
      }
      this.resetForm();
      await this.carregar();
      await this.carregarTodosLancamentos();
    } catch (error) {
      this.notificarErro('Erro ao salvar lançamento: ', error);
    } finally {
      this.operacaoEmAndamento = false;
      this.cdr.markForCheck();
    }
  }

  exportarExcel(): void {
    this.operacaoEmAndamento = true;
    try {
      this.excelExportService.exportar(this.lancamentos(), this.mesAtual);
      this.fecharMenu();
    } catch (error) {
      this.notificarErro('Erro ao exportar Excel: ', error);
    } finally {
      this.operacaoEmAndamento = false;
      this.cdr.markForCheck();
    }
  }

  async gerarPDF(): Promise<void> {
    this.operacaoEmAndamento = true;
    try {
      await this.pdfExportService.exportar(this.lancamentos(), this.nomeMesAtual, this.mesAtual);
      this.fecharMenu();
    } catch (error) {
      this.notificarErro('Erro ao gerar PDF: ', error);
    } finally {
      this.operacaoEmAndamento = false;
      this.cdr.markForCheck();
    }
  }

  async exportarBackup(): Promise<void> {
    this.operacaoEmAndamento = true;
    try {
      const todosLancamentos = await firstValueFrom(this.service.listar());
      await this.backupService.exportar(todosLancamentos);
      this.fecharMenu();
    } catch (error) {
      this.notificarErro('Erro ao gerar backup: ', error);
    } finally {
      this.operacaoEmAndamento = false;
      this.cdr.markForCheck();
    }
  }

  async importarBackup(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const arquivo = input.files?.[0];
    if (!arquivo) return;

    this.operacaoEmAndamento = true;
    try {
      const backup = await this.backupService.lerArquivo(arquivo);
      const confirmar = this.notificacaoService.confirmar(
        `Importar ${backup.lancamentos.length} lançamentos do backup de ` +
        `${new Date(backup.dataExportacao).toLocaleDateString('pt-BR')}?\n\n` +
        `Isso vai ADICIONAR aos dados atuais (não substitui nada).`
      );

      if (!confirmar) return;

      await firstValueFrom(this.service.importarLote(backup.lancamentos));
      this.notificacaoService.avisar(`${backup.lancamentos.length} lançamentos importados com sucesso!`);
      await this.carregar();
      await this.carregarTodosLancamentos();
      this.fecharMenu();
    } catch (error) {
      this.notificarErro('Erro ao importar backup: ', error);
    } finally {
      this.operacaoEmAndamento = false;
      input.value = '';
      this.cdr.markForCheck();
    }
  }

  async excluir(id: number): Promise<void> {
    const confirmar = this.notificacaoService.confirmar('Deseja realmente excluir este lançamento?');
    if (!confirmar) return;

    try {
      this.operacaoEmAndamento = true;
      await firstValueFrom(this.service.deletar(id));
      await this.carregar();
      await this.carregarTodosLancamentos();
    } catch (error) {
      this.notificarErro('Erro ao excluir lançamento: ', error);
    } finally {
      this.operacaoEmAndamento = false;
      this.cdr.markForCheck();
    }
  }

  preencherEdicao(item: Lancamento): void {
    this.editandoId = item.id!;
    this.novo = {
      ...item,
      tipo: item.tipo as TipoLancamentoFinanceiro
    };
    this.viewAtual.set('lancamentos');

    setTimeout(() => {
      this.formTop?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  }

  resetForm(): void {
    this.novo = this.criarLancamentoVazio();
    this.editandoId = null;
  }

  private criarLancamentoVazio(): Lancamento & { tipo: TipoLancamentoFinanceiro } {
    return {
      descricao: '',
      valorRealizado: 0,
      valorPrevisto: 0,
      tipo: 'saida',
      statusPagamento: 'pago',
      data: new Date().toISOString(),
      categoria: 'Geral',
      divisao: 'essencial'
    };
  }

  private notificarErro(prefixo: string, error: unknown): void {
    const mensagem = error instanceof Error ? error.message : String(error);
    this.notificacaoService.avisar(prefixo + mensagem);
  }
}