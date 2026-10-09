import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { FinanceiroService } from '../../services/financeiro.service';
import { DivisaoLancamento, Lancamento } from '../../services/db.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { BackupService } from '../../services/backup.service';
import { NotificacaoService } from '../../services/notificacao.service';
import { NotaService, Nota } from '../../services/nota.service';

import { CalculatorComponent } from '../../calculator/calculator.component';

import {
  TipoLancamentoFinanceiro,
  ViewAtual
} from '../../services/financeiro.model';

type ViewAtualExtendida = ViewAtual | 'relatorio' | 'metas' | 'analytics';

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

interface HistoricoItem {
  id?: number;
  descricao: string;
  categoria: string;
  data: string;
  tipo: string;
  valor: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, CalculatorComponent],
  styles: [`
    :host {
      --bg-base: #07090e;
      --bg-surface: rgba(18, 22, 33, 0.85);
      --bg-surface-hover: rgba(26, 32, 48, 0.95);
      --card-border: rgba(255, 255, 255, 0.12);
      --card-border-hover: rgba(139, 92, 246, 0.5);
      --text-primary: #ffffff;
      --text-secondary: #cbd5e1;
      --text-muted: #94a3b8;
      --primary: #8b5cf6;
      --primary-dark: #6d28d9;
      --success: #10b981;
      --danger: #ef4444;
      --warning: #f59e0b;
      --nav-height: 76px;
      --radius-lg: 24px;
      --radius-md: 16px;
      --radius-sm: 10px;
      --shadow-glow: 0 16px 40px -10px rgba(139, 92, 246, 0.25);
    }

    * { box-sizing: border-box; }

    .app-container {
      max-width: 680px;
      margin: 0 auto;
      padding: 0 16px calc(var(--nav-height) + 40px + env(safe-area-inset-bottom));
      width: 100%;
      min-width: 0;
      overflow-x: hidden;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      color: var(--text-primary);
      min-height: 100vh;
      background:
        linear-gradient(180deg, rgba(7, 9, 14, 0.9) 0%, rgba(11, 14, 22, 0.99) 100%),
        radial-gradient(circle at 10% 5%, rgba(139, 92, 246, 0.2) 0%, transparent 45%),
        radial-gradient(circle at 90% 15%, rgba(236, 72, 153, 0.18) 0%, transparent 40%),
        url('../../../assets/images/imagem2.png') center center / cover no-repeat fixed;
      background-color: var(--bg-base);
    }

    @media (min-width: 768px) {
      .app-container { max-width: 900px; padding-left: 24px; padding-right: 24px; }
    }

    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding-top: max(22px, env(safe-area-inset-top));
      padding-bottom: 16px; margin-bottom: 20px;
    }

    .brand-section { display: flex; align-items: center; gap: 12px; }

    .btn-hamburguer {
      display: flex; flex-direction: column; justify-content: center; gap: 5px;
      width: 42px; height: 42px; flex-shrink: 0;
      background: var(--bg-surface); border: 1px solid var(--card-border);
      border-radius: var(--radius-sm); cursor: pointer; padding: 0;
      backdrop-filter: blur(12px); transition: all 0.2s ease;
    }
    .btn-hamburguer:hover { background: var(--bg-surface-hover); border-color: var(--card-border-hover); }
    .btn-hamburguer span {
      display: block; height: 2px; width: 18px; margin: 0 auto;
      background: var(--text-primary); border-radius: 2px;
    }

    .brand-title-wrap { display: flex; align-items: center; gap: 10px; }

    .flux-logo-icon {
      width: 40px; height: 40px; border-radius: 12px;
      background: linear-gradient(145deg, rgba(139, 92, 246, 0.2), rgba(56, 189, 248, 0.15));
      border: 1px solid rgba(192, 132, 252, 0.4);
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8px 20px -4px rgba(139, 92, 246, 0.4); flex-shrink: 0;
    }

    .flux-title {
      font-size: 1.45rem; font-weight: 900; letter-spacing: -0.3px;
      background: linear-gradient(135deg, #c084fc 0%, #38bdf8 50%, #34d399 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; margin: 0;
    }

    .hero-balance-card {
      background: var(--bg-surface); backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-lg);
      padding: 26px 24px; margin-bottom: 16px;
      box-shadow: var(--shadow-glow);
      display: flex; align-items: center; justify-content: space-between;
    }
    .hero-balance-content { display: flex; align-items: center; gap: 16px; width: 100%; }

    .wallet-icon-box {
      width: 56px; height: 56px; border-radius: 16px;
      background: rgba(16, 185, 129, 0.18);
      border: 1px solid rgba(16, 185, 129, 0.4);
      display: flex; align-items: center; justify-content: center;
      color: #34d399; box-shadow: inset 0 2px 6px rgba(16, 185, 129, 0.2);
      flex-shrink: 0;
    }

    .hero-subtitle {
      font-size: 0.8rem; font-weight: 800; letter-spacing: 0.8px;
      text-transform: uppercase; color: var(--text-secondary);
      margin-bottom: 4px; display: block;
    }
    .hero-balance-value {
      font-size: clamp(1.4rem, 6vw, 2.1rem);
      font-weight: 900; letter-spacing: -0.5px;
      color: #ffffff; word-break: break-word;
    }

    .status-financeiro-card {
      border-radius: var(--radius-md); padding: 18px 22px;
      margin-bottom: 22px; border: 1px solid;
      display: flex; align-items: center; justify-content: space-between;
      transition: all 0.3s ease; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }
    .status-info-wrap { display: flex; align-items: center; gap: 16px; }
    .status-icon-box {
      width: 46px; height: 46px; border-radius: 12px;
      background: rgba(11, 14, 22, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.12);
      display: flex; align-items: center; justify-content: center;
      color: var(--text-primary); flex-shrink: 0;
    }
    .status-label-top {
      font-size: 0.75rem; font-weight: 800; letter-spacing: 0.9px;
      text-transform: uppercase; color: var(--text-secondary);
      display: block; margin-bottom: 3px;
    }
    .status-value-text {
      font-size: 1.1rem; font-weight: 900; letter-spacing: -0.2px;
      word-break: break-word;
    }
    .status-dot-indicator {
      width: 16px; height: 16px; border-radius: 50%;
      box-shadow: 0 0 14px currentColor; flex-shrink: 0;
    }

    .quick-actions-grid {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 12px; margin-bottom: 24px;
    }
    @media(max-width: 500px) {
      .quick-actions-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .quick-action-btn {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; background: transparent; border: none;
      cursor: pointer; padding: 0;
    }
    .quick-action-icon {
      width: 100%; height: 60px; border-radius: var(--radius-md);
      background: var(--bg-surface); border: 1px solid var(--card-border);
      backdrop-filter: blur(14px);
      display: flex; align-items: center; justify-content: center;
      color: #c084fc; transition: all 0.2s ease;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
    }
    .quick-action-btn:hover .quick-action-icon {
      background: var(--bg-surface-hover);
      border-color: var(--primary);
      transform: translateY(-2px);
      box-shadow: 0 10px 25px rgba(139, 92, 246, 0.35);
      color: #ffffff;
    }
    .quick-action-label {
      font-size: 0.8rem; font-weight: 700;
      color: var(--text-secondary); text-align: center;
    }

    .drawer {
      position: fixed; top: 0; left: 0; height: 100vh;
      width: 300px; max-width: 85vw;
      background: rgba(11, 14, 22, 0.98);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border-right: 1px solid var(--card-border);
      box-shadow: 25px 0 50px rgba(0, 0, 0, 0.7);
      transform: translateX(-105%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      z-index: 60; display: flex; flex-direction: column;
      padding: max(24px, env(safe-area-inset-top)) 20px 24px;
      overflow-y: auto;
    }
    .drawer.aberto { transform: translateX(0); }
    .drawer-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 28px;
    }
    .drawer-titulo {
      font-size: 1.25rem; font-weight: 800;
      background: linear-gradient(135deg, #c084fc, #38bdf8);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .btn-fechar-drawer {
      background: var(--bg-surface); border: 1px solid var(--card-border);
      color: var(--text-secondary); width: 36px; height: 36px;
      border-radius: var(--radius-sm);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.2s;
    }
    .btn-fechar-drawer:hover {
      color: var(--text-primary); background: var(--bg-surface-hover);
      border-color: var(--card-border-hover);
    }

    .secao-titulo {
      font-size: 0.75rem; font-weight: 800; letter-spacing: 1px;
      text-transform: uppercase; color: var(--text-muted);
      margin: 12px 0 10px;
    }
    .acao-item {
      display: flex; align-items: center; gap: 12px; width: 100%;
      padding: 14px 16px; border-radius: var(--radius-sm);
      border: 1px solid var(--card-border); color: var(--text-primary);
      font-weight: 700; font-size: 0.92rem; cursor: pointer;
      margin-bottom: 10px; background: var(--bg-surface);
      transition: all 0.2s ease;
    }
    .acao-item:hover {
      background: var(--bg-surface-hover);
      border-color: var(--card-border-hover);
      transform: translateY(-1px);
    }
    .acao-item:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    .drawer-rodape {
      margin-top: auto; padding-top: 20px;
      border-top: 1px solid var(--card-border);
      font-size: 0.8rem; color: var(--text-muted); text-align: center;
    }

    .backdrop-drawer {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(6px); z-index: 50;
      animation: fadeIn 0.25s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .portfolio-carousel-container {
      position: relative; margin-bottom: 22px;
      display: flex; align-items: center; gap: 8px;
      width: 100%; min-width: 0;
    }
    .portfolio-carousel-track {
      overflow: hidden; width: 100%; min-width: 0;
      border-radius: var(--radius-lg);
    }
    .portfolio-carousel-inner {
      display: flex;
      transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      will-change: transform;
    }
    .portfolio-subcard-lg {
      min-width: 100%; width: 100%; box-sizing: border-box;
      background: linear-gradient(145deg, rgba(22, 27, 40, 0.9), rgba(13, 17, 26, 0.98));
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-lg);
      padding: 22px 18px;
      display: flex; flex-direction: column; gap: 12px;
      box-shadow: 0 16px 40px -10px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08);
      position: relative; overflow: hidden;
    }
    .portfolio-subcard-lg::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
      background: linear-gradient(90deg, transparent, var(--card-accent, var(--primary)), transparent);
    }
    .subcard-header-lg {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
    }
    .subcard-icone {
      width: 38px; height: 38px; border-radius: 12px;
      display: inline-flex; align-items: center; justify-content: center;
      flex-shrink: 0; border: 1px solid;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }
    .subcard-icone svg { width: 20px; height: 20px; display: block; }
    .subcard-label-lg {
      font-size: 0.9rem; font-weight: 900; letter-spacing: 1px;
      text-transform: uppercase; color: var(--text-secondary);
      line-height: 1.2;
    }
    .subcard-valor-lg {
      font-size: clamp(1.4rem, 6vw, 2.35rem);
      font-weight: 900; letter-spacing: -0.5px;
      margin-top: 4px; word-break: break-word;
    }

    .carousel-btn {
      background: var(--bg-surface); border: 1px solid var(--card-border);
      color: var(--text-primary); width: 40px; height: 40px;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; flex-shrink: 0;
      backdrop-filter: blur(12px); transition: all 0.2s ease;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3); z-index: 2;
    }
    .carousel-btn:hover {
      background: var(--bg-surface-hover);
      border-color: var(--primary);
      transform: scale(1.05); color: #c084fc;
    }
    @media (max-width: 360px) {
      .carousel-btn { width: 32px; height: 32px; }
    }

    .carousel-indicators {
      display: flex; justify-content: center; gap: 8px;
      margin-top: 12px; margin-bottom: 22px;
    }
    .indicator-dot {
      width: 8px; height: 8px; border-radius: 4px;
      background: rgba(255, 255, 255, 0.2);
      border: none; cursor: pointer;
      transition: all 0.3s ease; padding: 0;
    }
    .indicator-dot.ativo {
      width: 24px; background: #c084fc;
      box-shadow: 0 0 10px rgba(192, 132, 252, 0.5);
    }

    .mes-selector-box {
      display: flex; align-items: center; justify-content: center;
      background: var(--bg-surface); backdrop-filter: blur(16px);
      padding: 12px 20px; border-radius: var(--radius-md);
      border: 1px solid var(--card-border);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      width: fit-content; margin: 0 0 20px 0; font-size: 0.92rem;
    }
    .calendar-icon {
      display: inline-flex; align-items: center; justify-content: center;
      color: #c084fc; margin-right: 10px;
    }
    .mes-input {
      background: transparent; border: none; color: var(--text-primary);
      font-size: 0.95rem; font-weight: 700; cursor: pointer;
      outline: none; color-scheme: dark;
    }

    .card-modulo {
      background: var(--bg-surface); backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-lg);
      padding: 24px; margin-bottom: 22px;
      box-shadow: 0 12px 35px -8px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }
    .card-titulo {
      font-size: 1.15rem; font-weight: 900; margin: 0 0 18px 0;
      display: flex; align-items: center; gap: 10px;
    }

    .sparkline-wrap {
      width: 100%; line-height: 0;
      margin: 10px -24px -24px -24px;
      border-bottom-left-radius: var(--radius-lg);
      border-bottom-right-radius: var(--radius-lg);
      overflow: hidden;
    }
    .sparkline-svg { width: 100%; height: 95px; display: block; }

    .analise-select {
      background: rgba(11, 14, 22, 0.95);
      border: 1px solid var(--card-border);
      color: var(--text-primary); border-radius: var(--radius-sm);
      padding: 14px; outline: none; font-size: 0.92rem;
      font-weight: 700; cursor: pointer; width: 100%; margin-bottom: 18px;
    }

    .categoria-corpo {
      display: flex; align-items: center; gap: 20px;
      flex-wrap: wrap; margin-bottom: 16px;
    }
    .donut-wrap {
      width: 150px; height: 150px; flex-shrink: 0;
      position: relative; margin: 0 auto;
    }
    .donut-svg { width: 100%; height: 100%; }

    .legend-list {
      flex: 1; min-width: 180px;
      display: flex; flex-direction: column; gap: 8px;
      max-height: 200px; overflow-y: auto; padding-right: 4px;
    }
    .legend-item {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 10px; border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.03);
    }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .legend-nome {
      flex: 1; font-size: 0.85rem; font-weight: 700;
      color: var(--text-secondary);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .legend-valor {
      font-size: 0.85rem; font-weight: 900;
      color: var(--text-primary); white-space: nowrap;
    }

    .bottom-nav {
      position: fixed; left: 16px; right: 16px;
      bottom: max(16px, env(safe-area-inset-bottom));
      max-width: 480px; margin: 0 auto; z-index: 70;
      display: flex; justify-content: space-around; align-items: center;
      height: var(--nav-height); padding: 0 10px;
      background: rgba(15, 20, 30, 0.92);
      backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 28px;
      box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
    }
    .nav-tab {
      display: flex; flex-direction: column; align-items: center;
      gap: 4px; background: transparent; border: none;
      color: var(--text-secondary); cursor: pointer;
      flex: 1; padding: 6px; transition: all 0.2s ease;
    }
    .nav-tab-label {
      font-size: 0.72rem; font-weight: 800; letter-spacing: 0.3px;
    }
    .nav-tab.ativo { color: #c084fc; }

    .cabecalho-pagina {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px; gap: 12px; flex-wrap: wrap;
    }
    .titulo-pagina { font-size: 1.3rem; font-weight: 900; margin: 0; }
    .link-voltar {
      background: var(--bg-surface); border: 1px solid var(--card-border);
      color: var(--text-primary); border-radius: var(--radius-sm);
      padding: 8px 16px; font-weight: 700; font-size: 0.85rem;
      cursor: pointer; transition: all 0.2s;
    }
    .link-voltar:hover {
      background: var(--bg-surface-hover);
      border-color: var(--card-border-hover);
    }

    .input-grid {
      display: grid; grid-template-columns: 1fr; gap: 14px;
      background: var(--bg-surface); backdrop-filter: blur(16px);
      padding: 22px; border-radius: var(--radius-lg);
      margin-bottom: 22px; border: 1px solid var(--card-border);
      box-shadow: var(--shadow-glow);
      scroll-margin-top: 20px;
    }
    @media (min-width: 768px) {
      .input-grid { grid-template-columns: repeat(2, 1fr); }
      .input-grid .btn-salvar { grid-column: 1 / -1; }
    }
    .input-grid input,
    .input-grid select {
      background: rgba(11, 14, 22, 0.95);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-sm);
      padding: 14px 16px; color: var(--text-primary);
      font-size: 0.95rem; font-weight: 600;
      outline: none; width: 100%;
    }
    .input-grid input:focus,
    .input-grid select:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
    }
    .btn-salvar {
      grid-column: 1 / -1; padding: 16px; border: none;
      border-radius: var(--radius-sm); cursor: pointer;
      color: white; font-weight: 900; font-size: 1rem;
      background: linear-gradient(135deg, #8b5cf6, #6d28d9);
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
      transition: all 0.2s ease;
    }
    .btn-salvar:hover { opacity: 0.95; transform: translateY(-1px); }

    .lancamentos-view {
      display: flex; flex-direction: column; width: 100%; min-width: 0;
    }

    .lista-scroll {
      display: flex; flex-direction: column; gap: 14px;
      max-height: 560px; overflow-y: auto; overflow-x: hidden;
      padding: 4px 6px 4px 4px; scroll-behavior: smooth;
      -webkit-overflow-scrolling: touch;
    }
    .lista-scroll::-webkit-scrollbar { width: 8px; }
    .lista-scroll::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.03); border-radius: 4px;
    }
    .lista-scroll::-webkit-scrollbar-thumb {
      background: rgba(139, 92, 246, 0.5); border-radius: 4px;
    }
    .lista-scroll::-webkit-scrollbar-thumb:hover {
      background: rgba(139, 92, 246, 0.75);
    }

    .card-lancamento {
      position: relative; display: flex; flex-direction: column; gap: 14px;
      width: 100%; padding: 18px 20px;
      background: linear-gradient(145deg, rgba(22, 27, 40, 0.9), rgba(13, 17, 26, 0.98));
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--card-border); border-radius: var(--radius-lg);
      box-shadow: 0 12px 32px -8px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06);
      transition: all 0.25s ease; overflow: hidden; flex-shrink: 0;
    }
    .card-lancamento::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
      background: linear-gradient(90deg, transparent, var(--accent, var(--primary)), transparent);
    }
    .card-lancamento:hover {
      border-color: var(--card-border-hover); transform: translateY(-2px);
      box-shadow: 0 16px 40px -8px rgba(139, 92, 246, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }

    .card-entrada        { --accent: #34d399; }
    .card-saida          { --accent: #f87171; }
    .card-reserva        { --accent: #c084fc; }
    .card-investimento   { --accent: #34d399; }
    .card-saida-reserva  { --accent: #f87171; }
    .card-saida-investimento { --accent: #f87171; }

    .card-header {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
    }
    .card-badge {
      padding: 6px 14px; border-radius: 20px; font-size: 0.68rem;
      font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase;
      white-space: nowrap; display: inline-flex; align-items: center; gap: 6px;
    }
    .badge-entrada        { background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.4); }
    .badge-saida          { background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.4); }
    .badge-pendente       { background: rgba(245, 158, 11, 0.18); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.4); }
    .badge-reserva        { background: rgba(139, 92, 246, 0.18); color: #c084fc; border: 1px solid rgba(192, 132, 252, 0.4); }
    .badge-investimento   { background: rgba(16, 185, 129, 0.18); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.4); }
    .badge-saida-reserva,
    .badge-saida-investimento { background: rgba(239, 68, 68, 0.18); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.4); }

    .card-data {
      font-family: 'JetBrains Mono', 'Consolas', monospace;
      font-size: 0.72rem; font-weight: 700; color: var(--text-muted);
      white-space: nowrap; flex-shrink: 0;
    }

    .card-body {
      display: flex; align-items: flex-end; justify-content: space-between; gap: 14px;
    }
    .card-info { display: flex; flex-direction: column; gap: 4px; min-width: 0; flex: 1; }
    .card-descricao {
      font-size: 1.15rem; font-weight: 900; color: var(--text-primary);
      letter-spacing: -0.2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.2;
    }
    .card-categoria {
      font-size: 0.75rem; font-weight: 800; color: var(--text-secondary);
      text-transform: uppercase; letter-spacing: 0.6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .card-valor {
      font-size: 1.5rem; font-weight: 900; letter-spacing: -0.6px;
      white-space: nowrap; flex-shrink: 0; line-height: 1.1;
    }
    .valor-entrada, .valor-investimento { color: #34d399; }
    .valor-saida, .valor-saida-reserva, .valor-saida-investimento { color: #f87171; }
    .valor-reserva { color: #c084fc; }

    .card-footer {
      display: flex; align-items: center; justify-content: flex-end; gap: 8px;
      padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.06);
    }
    .btn-acao {
      display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;
      border-radius: var(--radius-sm); border: 1px solid var(--card-border);
      background: rgba(255, 255, 255, 0.04); color: var(--text-primary);
      font-size: 0.78rem; font-weight: 800; cursor: pointer; transition: all 0.2s ease;
    }
    .btn-acao svg { width: 14px; height: 14px; flex-shrink: 0; }
    .btn-acao.editar:hover {
      color: #60a5fa; border-color: rgba(96, 165, 250, 0.5); background: rgba(59, 130, 246, 0.12); transform: translateY(-1px);
    }
    .btn-acao.excluir:hover {
      color: #f87171; border-color: rgba(248, 113, 113, 0.5); background: rgba(239, 68, 68, 0.12); transform: translateY(-1px);
    }

    .vazio {
      text-align: center; padding: 40px 20px; color: var(--text-secondary);
      background: var(--bg-surface); border-radius: var(--radius-md);
      border: 1px dashed var(--card-border); font-size: 0.95rem; font-weight: 700;
    }

    .svg-icon { width: 22px; height: 22px; display: block; flex-shrink: 0; }

    .analytics-cards-grid {
      display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 22px; width: 100%; min-width: 0;
    }
    @media (min-width: 640px) {
      .analytics-cards-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .analytics-metric-card {
      background: var(--bg-surface); backdrop-filter: blur(16px);
      border: 1px solid var(--card-border); border-radius: var(--radius-md);
      padding: 20px; display: flex; flex-direction: column; gap: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3); min-width: 0; overflow: hidden;
    }
    .analytics-metric-label {
      font-size: 0.78rem; font-weight: 800; letter-spacing: 0.8px;
      text-transform: uppercase; color: var(--text-secondary); line-height: 1.2;
    }
    .analytics-metric-desc { font-size: 0.73rem; color: var(--text-muted); line-height: 1.3; margin-bottom: 2px; }
    .analytics-metric-value {
      font-size: clamp(1.15rem, 5vw, 1.65rem); font-weight: 900; letter-spacing: -0.5px;
      word-break: break-word; overflow-wrap: break-word;
    }

    .historico-subtitulo { font-size: 0.82rem; color: var(--text-muted); margin: -8px 0 16px 0; line-height: 1.4; }
    .historico-lista { display: flex; flex-direction: column; gap: 8px; max-height: 460px; overflow-y: auto; padding-right: 4px; -webkit-overflow-scrolling: touch; }
    .historico-item {
      display: flex; align-items: center; gap: 12px; padding: 12px 14px;
      border-radius: var(--radius-sm); background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--card-border); transition: all 0.15s ease; min-width: 0;
    }
    .historico-item:hover { background: rgba(255, 255, 255, 0.06); border-color: var(--card-border-hover); }
    .historico-icone { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .historico-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .historico-desc { font-size: 0.92rem; font-weight: 800; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .historico-meta { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .historico-valor { font-size: 0.92rem; font-weight: 900; white-space: nowrap; flex-shrink: 0; }
    .historico-vazio {
      text-align: center; padding: 32px 16px; color: var(--text-secondary);
      font-weight: 700; font-size: 0.9rem; background: rgba(255, 255, 255, 0.03);
      border: 1px dashed var(--card-border); border-radius: var(--radius-sm);
    }

    /* Estilos dos Modais (Calculadora e Notas) */
    .calc-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(7, 9, 14, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      padding: 16px;
    }

    .calc-modal-container {
      width: 100%;
      max-width: 320px;
      background: #0f141e;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
      overflow: hidden;
      animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .notas-modal-container {
      width: 100%;
      max-width: 600px;
      max-height: 85vh;
      background: #0f141e;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes scaleIn {
      from { transform: scale(0.92); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .calc-header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      background: #07090e;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .calc-title-text {
      font-size: 0.85rem;
      font-weight: 900;
      color: #34d399;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .calc-close-btn {
      background: #ef4444;
      color: #ffffff;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      cursor: pointer;
      transition: all 0.2s;
    }
    .calc-close-btn:hover {
      background: #dc2626;
      transform: scale(1.05);
    }

    /* Estilos internos do Bloco de Notas no Modal */
    .notas-body-scroll {
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .nota-form-card {
      background: rgba(18, 22, 33, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .input-nota {
      background: rgba(11, 14, 22, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      padding: 12px 14px;
      color: #ffffff;
      font-size: 0.9rem;
      font-weight: 600;
      outline: none;
      width: 100%;
    }
    .input-nota:focus {
      border-color: #8b5cf6;
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
    }
    textarea.input-nota { resize: vertical; min-height: 80px; }
    .btn-salvar-nota {
      padding: 12px; border: none; border-radius: 10px; cursor: pointer;
      color: white; font-weight: 900; font-size: 0.9rem;
      background: linear-gradient(135deg, #8b5cf6, #6d28d9);
      transition: all 0.2s;
    }
    .btn-salvar-nota:hover { opacity: 0.95; transform: translateY(-1px); }
    .notas-grid {
      display: grid; grid-template-columns: 1fr; gap: 12px;
    }
    @media(min-width: 520px) {
      .notas-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .nota-card-item {
      position: relative;
      background: linear-gradient(145deg, rgba(22, 27, 40, 0.9), rgba(13, 17, 26, 0.98));
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 14px; padding: 14px;
      display: flex; flex-direction: column; gap: 8px; overflow: hidden;
    }
    .nota-card-item::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
      background: var(--cor-destaque, #8b5cf6);
    }
    .nota-card-titulo { font-size: 1rem; font-weight: 900; color: #fff; margin: 0; word-break: break-word; }
    .nota-card-texto { font-size: 0.85rem; color: #cbd5e1; white-space: pre-wrap; word-break: break-word; margin: 0; flex: 1; line-height: 1.3; }
    .nota-card-footer {
      display: flex; justify-content: space-between; align-items: center;
      margin-top: 6px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);
      font-size: 0.68rem; color: #94a3b8;
    }
    .nota-acoes { display: flex; gap: 6px; }
    .btn-acao-n {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      color: #cbd5e1; padding: 3px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; cursor: pointer;
    }
    .btn-acao-n.editar:hover { color: #60a5fa; border-color: rgba(96,165,250,0.4); background: rgba(59,130,246,0.15); }
    .btn-acao-n.excluir:hover { color: #f87171; border-color: rgba(248,113,113,0.4); background: rgba(239,68,68,0.15); }
  `],
  template: `
    <div class="app-container">
      <div class="topbar">
        <div class="brand-section">
          <button
            class="btn-hamburguer"
            (click)="alternarMenu()"
            [attr.aria-expanded]="menuAberto()"
            aria-label="Abrir menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          <div class="brand-title-wrap">
            <div class="flux-logo-icon">
              <svg width="22" height="22" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 8C6 6.89543 6.89543 6 8 6H16C20.4183 6 24 9.58172 24 14C24 18.4183 20.4183 22 16 22H10C7.79086 22 6 20.2091 6 18V8Z" stroke="url(#paint0_linear)" stroke-width="3" stroke-linejoin="round"/>
                <path d="M12 16H22C25.3137 16 28 18.6863 28 22C28 25.3137 25.3137 28 22 28H14C11.7909 28 10 26.2091 10 24V22" stroke="url(#paint1_linear)" stroke-width="3" stroke-linecap="round"/>
                <circle cx="16" cy="14" r="3" fill="#ffffff"/>
                <defs>
                  <linearGradient id="paint0_linear" x1="6" y1="6" x2="24" y2="22" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#c084fc"/>
                    <stop offset="1" stop-color="#38bdf8"/>
                  </linearGradient>
                  <linearGradient id="paint1_linear" x1="10" y1="16" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#38bdf8"/>
                    <stop offset="1" stop-color="#34d399"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <h1 class="flux-title">FluxNexis</h1>
          </div>
        </div>
      </div>

      <nav class="drawer" [class.aberto]="menuAberto()" role="navigation" aria-label="Menu principal">
        <div class="drawer-header">
          <span class="drawer-titulo">Menu FluxNexis</span>
          <button class="btn-fechar-drawer" (click)="fecharMenu()" aria-label="Fechar menu">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <p class="secao-titulo">Ferramentas & Ações</p>

        <!-- ATALHO DA CALCULADORA NO MENU -->
        <button class="acao-item" (click)="abrirCalculadora()">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="10" y2="10"></line><line x1="14" y1="10" x2="16" y2="10"></line><line x1="8" y1="14" x2="10" y2="14"></line><line x1="14" y1="14" x2="16" y2="14"></line><line x1="8" y1="18" x2="16" y2="18"></line></svg>
          Calculadora Rápida
        </button>

        <!-- ATALHO DO BLOCO DE NOTAS NO MENU -->
        <button class="acao-item" (click)="abrirNotasModal()">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Bloco de Notas
        </button>

        <p class="secao-titulo">Relatórios & Exportação</p>

        <button class="acao-item" (click)="gerarPDF()" [disabled]="operacaoEmAndamento">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          Exportar Relatório PDF
        </button>

        <button class="acao-item" (click)="exportarExcel()" [disabled]="operacaoEmAndamento">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="9" x2="9" y2="21"></line></svg>
          Exportar Planilha Excel
        </button>

        <button class="acao-item" (click)="exportarBackup()" [disabled]="operacaoEmAndamento">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          Fazer Backup Seguro
        </button>

        <input #inputBackup type="file" accept=".json" hidden (change)="importarBackup($event)" />
        <button class="acao-item" (click)="inputBackup.click()" [disabled]="operacaoEmAndamento">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.65-5.65"></path></svg>
          Restaurar Dados
        </button>

        <div class="drawer-rodape">FluxNexis · Arquitetura Moderna DX</div>
      </nav>

      <div class="backdrop-drawer" *ngIf="menuAberto()" (click)="fecharMenu()"></div>

      <ng-container *ngIf="viewAtual() === 'inicio'">
        <div class="mes-selector-box">
          <span class="calendar-icon">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="3"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </span>
          <input type="month" [ngModel]="mesAtual" (ngModelChange)="selecionarMes($event)" class="mes-input" />
        </div>

        <div class="hero-balance-card">
          <div class="hero-balance-content">
            <div class="wallet-icon-box">
              <svg style="width: 28px; height: 28px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
            <div>
              <span class="hero-subtitle">Saldo Líquido Disponível (No Mês)</span>
              <div class="hero-balance-value">R$ {{ formatarMoeda(saldoReal()) }}</div>
            </div>
          </div>
        </div>

        <div [style.background-color]="statusConfig().bgColor" [style.border-color]="statusConfig().borderColor" class="status-financeiro-card">
          <div class="status-info-wrap">
            <div class="status-icon-box">
              <svg style="width: 22px; height: 22px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <span class="status-label-top">Diagnóstico Financeiro</span>
              <span [style.color]="statusConfig().textColor" class="status-value-text">{{ statusConfig().label }}</span>
            </div>
          </div>
          <span class="status-dot-indicator" [style.background-color]="statusConfig().dotColor"></span>
        </div>

        <!-- BOTÕES DE ATALHOS RÁPIDOS NA TELA INICIAL -->
        <div class="quick-actions-grid">
          <button class="quick-action-btn" (click)="irParaLancamentos()">
            <div class="quick-action-icon">
              <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </div>
            <span class="quick-action-label">Lançamento</span>
          </button>

          <button class="quick-action-btn" (click)="irParaAnalytics()">
            <div class="quick-action-icon">
              <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            </div>
            <span class="quick-action-label">Analytics</span>
          </button>

          <button class="quick-action-btn" (click)="abrirCalculadora()">
            <div class="quick-action-icon">
              <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="10" y2="10"></line></svg>
            </div>
            <span class="quick-action-label">Calculadora</span>
          </button>

          <button class="quick-action-btn" (click)="abrirNotasModal()">
            <div class="quick-action-icon">
              <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            </div>
            <span class="quick-action-label">Notas</span>
          </button>
        </div>

        <div class="portfolio-carousel-container">
          <button class="carousel-btn" (click)="cardAnterior()" aria-label="Anterior">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>

          <div class="portfolio-carousel-track">
            <div class="portfolio-carousel-inner" [style.transform]="'translateX(-' + (indiceCardAtual * 100) + '%)'">

              <!-- ENTRADAS -->
              <div class="portfolio-subcard-lg" style="--card-accent: #34d399;">
                <div class="subcard-header-lg">
                  <span class="subcard-icone" style="background: rgba(52, 211, 153, 0.15); color: #34d399; border-color: rgba(52, 211, 153, 0.35);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 17 17 7"></polyline><polyline points="9 7 17 7 17 15"></polyline></svg>
                  </span>
                  <span class="subcard-label-lg">Entradas Recebidas</span>
                </div>
                <span class="subcard-valor-lg" style="color: #34d399;">R$ {{ formatarMoeda(totalEntradas()) }}</span>
              </div>

              <!-- GASTOS -->
              <div class="portfolio-subcard-lg" style="--card-accent: #f87171;">
                <div class="subcard-header-lg">
                  <span class="subcard-icone" style="background: rgba(248, 113, 113, 0.15); color: #f87171; border-color: rgba(248, 113, 113, 0.35);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 7 7 17"></polyline><polyline points="15 17 7 17 7 9"></polyline></svg>
                  </span>
                  <span class="subcard-label-lg">Gastos</span>
                </div>
                <span class="subcard-valor-lg" style="color: #f87171;">R$ {{ formatarMoeda(totalGastosMes()) }}</span>
              </div>

              <!-- RESERVA -->
              <div class="portfolio-subcard-lg" style="--card-accent: #c084fc;">
                <div class="subcard-header-lg">
                  <span class="subcard-icone" style="background: rgba(192, 132, 252, 0.15); color: #c084fc; border-color: rgba(192, 132, 252, 0.35);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4z"></path></svg>
                  </span>
                  <span class="subcard-label-lg">Reserva</span>
                </div>
                <span class="subcard-valor-lg" style="color: #c084fc;">R$ {{ formatarMoeda(totalReservaMes()) }}</span>
              </div>

              <!-- INVESTIMENTOS -->
              <div class="portfolio-subcard-lg" style="--card-accent: #38bdf8;">
                <div class="subcard-header-lg">
                  <span class="subcard-icone" style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border-color: rgba(56, 189, 248, 0.35);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"></polyline></svg>
                  </span>
                  <span class="subcard-label-lg">Investimentos</span>
                </div>
                <span class="subcard-valor-lg" style="color: #38bdf8;">R$ {{ formatarMoeda(totalInvestimentoMes()) }}</span>
              </div>

            </div>
          </div>

          <button class="carousel-btn" (click)="proximoCard()" aria-label="Próximo">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        <div class="carousel-indicators">
          <button *ngFor="let dot of [0, 1, 2, 3]" class="indicator-dot" [class.ativo]="indiceCardAtual === dot" (click)="irParaCard(dot)"></button>
        </div>

        <div class="card-modulo">
          <strong class="card-titulo">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            Evolução Diária do Saldo
          </strong>
          <div class="sparkline-wrap">
            <svg class="sparkline-svg" viewBox="0 0 680 95" preserveAspectRatio="none">
              <path [attr.d]="evolucaoSaldoMensal().area" fill="rgba(139, 92, 246, 0.2)" stroke="none"></path>
              <path [attr.d]="evolucaoSaldoMensal().linha" fill="none" stroke="#c084fc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="viewAtual() === 'analytics'">
        <div class="cabecalho-pagina">
          <h2 class="titulo-pagina">Balanço Geral & Analytics</h2>
          <button class="link-voltar" (click)="irParaInicio()">Voltar</button>
        </div>

        <div class="analytics-cards-grid">
          <div class="analytics-metric-card">
            <span class="analytics-metric-label">Total de Lançamentos</span>
            <span class="analytics-metric-desc">Quantidade total de registos financeiros.</span>
            <span class="analytics-metric-value" style="color: #c084fc;">{{ todosLancamentos().length }}</span>
          </div>
          <div class="analytics-metric-card">
            <span class="analytics-metric-label">Balanço Acumulado Geral</span>
            <span class="analytics-metric-desc">Resultado financeiro total acumulado.</span>
            <span class="analytics-metric-value" [style.color]="balancoGlobal() >= 0 ? '#34d399' : '#f87171'">R$ {{ formatarMoeda(balancoGlobal()) }}</span>
          </div>
        </div>

        <div class="card-modulo">
          <strong class="card-titulo">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
            Análise por Categoria e Tipo
          </strong>

          <select [ngModel]="tipoAnaliseSelecionado()" (ngModelChange)="tipoAnaliseSelecionado.set($event)" class="analise-select">
            <option *ngFor="let t of tiposParaAnalise" [value]="t">
              {{ rotulosTipo[t] || t }}
            </option>
          </select>

          <div class="categoria-corpo">
            <div class="donut-wrap">
              <svg class="donut-svg" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="16" />
                <circle
                  *ngFor="let item of analisePorTipoSelecionado().itens"
                  cx="70" cy="70" r="60"
                  fill="none"
                  [attr.stroke]="item.cor"
                  stroke-width="16"
                  [attr.stroke-dasharray]="item.dashArray"
                  [attr.stroke-dashoffset]="item.dashOffset"
                  stroke-linecap="round"
                  transform="rotate(-90 70 70)"
                  style="transition: stroke-dashoffset 0.5s ease;"
                />
              </svg>
              <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none;">
                <span style="font-size: 0.68rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Total</span>
                <span style="font-size: 0.95rem; font-weight: 900; color: var(--text-primary);">R$ {{ formatarMoeda(analisePorTipoSelecionado().total) }}</span>
              </div>
            </div>

            <div class="legend-list" *ngIf="analisePorTypeItens().length > 0; else semDadosAnalise">
              <div *ngFor="let item of analisePorTypeItens()" class="legend-item">
                <span class="legend-dot" [style.background-color]="item.cor"></span>
                <span class="legend-nome">{{ item.categoria }} ({{ item.percentual.toFixed(1) }}%)</span>
                <span class="legend-valor">R$ {{ formatarMoeda(item.valor) }}</span>
              </div>
            </div>
            <ng-template #semDadosAnalise>
              <div class="vazio" style="flex: 1; padding: 20px; font-size: 0.85rem;">Nenhum registro para este tipo.</div>
            </ng-template>
          </div>
        </div>

        <div class="card-modulo">
          <strong class="card-titulo">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            Histórico Recente de Lançamentos
          </strong>
          <p class="historico-subtitulo">Últimos registros financeiros consolidados no sistema.</p>

          <div class="historico-lista" *ngIf="historicoRecente().length > 0; else historicoVazio">
            <div *ngFor="let h of historicoRecente()" class="historico-item">
              <div class="historico-icone" [style.background]="h.tipo === 'entrada' ? 'rgba(52,211,153,0.15)' : (h.tipo === 'reserva' ? 'rgba(192,132,252,0.15)' : 'rgba(248,113,113,0.15)')" [style.color]="h.tipo === 'entrada' ? '#34d399' : (h.tipo === 'reserva' ? '#c084fc' : '#f87171')">
                <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              </div>
              <div class="historico-info">
                <span class="historico-desc">{{ h.descricao }}</span>
                <span class="historico-meta">{{ h.categoria }} · {{ h.data | date:'dd/MM/yyyy' }}</span>
              </div>
              <span class="historico-valor" [style.color]="h.tipo === 'entrada' ? '#34d399' : (h.tipo === 'reserva' ? '#c084fc' : '#f87171')">
                {{ h.tipo === 'entrada' ? '+' : '-' }} R$ {{ formatarMoeda(h.valor) }}
              </span>
            </div>
          </div>
          <ng-template #historicoVazio>
            <div class="historico-vazio">Nenhum histórico recente disponível.</div>
          </ng-template>
        </div>
      </ng-container>

      <ng-container *ngIf="viewAtual() === 'lancamentos'">
        <div class="lancamentos-view">
          <div class="cabecalho-pagina">
            <h2 class="titulo-pagina">Gerenciar Lançamentos</h2>
            <button class="link-voltar" (click)="irParaInicio()">Voltar</button>
          </div>

          <div class="input-grid" #formTop>
            <input [(ngModel)]="novo.descricao" placeholder="Descrição (Ex: Supermercado, Aluguel...)" />
            <input
              type="text"
              inputmode="decimal"
              [ngModel]="novoValorTexto"
              (ngModelChange)="onValorChange($event)"
              placeholder="Valor (R$)"
            />
            
            <!-- CAMPO DE CATEGORIA COM DATALIST (PERMITE SELECIONAR PREDEFINIDAS OU DIGITAR/EDITAR) -->
            <input
              list="categorias-predefinidas"
              [(ngModel)]="novo.categoria"
              placeholder="Categoria (Selecione ou digite...)"
            />
            <datalist id="categorias-predefinidas">
              <option *ngFor="let cat of categoriasPadrao" [value]="cat"></option>
            </datalist>

            <select [(ngModel)]="novo.tipo">
              <option value="entrada">Entrada (Receita)</option>
              <option value="saida">Saída (Despesa)</option>
              <option value="reserva">Reserva</option>
              <option value="investimento">Investimento</option>
              <option value="saida-reserva">Saída (Da Reserva)</option>
              <option value="saida-investimento">Saída (Dos Investimentos)</option>
            </select>
            <select [(ngModel)]="novo.statusPagamento">
              <option value="pago">Pago / Recebido</option>
              <option value="pendente">Pendente / Aguardando</option>
            </select>
            <button class="btn-salvar" (click)="salvar()">
              {{ editandoId ? 'Atualizar Lançamento' : 'Salvar Novo Lançamento' }}
            </button>
          </div>

          <div class="lista-scroll" *ngIf="lancamentos().length > 0; else listaVaziaPagina">
            <div
              *ngFor="let item of lancamentos()"
              class="card-lancamento"
              [ngClass]="{
                'card-entrada': item.tipo === 'entrada',
                'card-saida': item.tipo === 'saida',
                'card-reserva': item.tipo === 'reserva',
                'card-investimento': item.tipo === 'investimento',
                'card-saida-reserva': item.tipo === 'saida-reserva',
                'card-saida-investimento': item.tipo === 'saida-investimento'
              }"
            >
              <div class="card-header">
                <span class="card-badge">{{ item.statusPagamento === 'pendente' ? 'PENDENTE' : (item.tipo | uppercase) }}</span>
                <span class="card-data">{{ item.data | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
              <div class="card-body">
                <div class="card-info">
                  <span class="card-descricao">{{ item.descricao }}</span>
                  <span class="card-categoria">{{ item.categoria || 'Geral' }}</span>
                </div>
                <span class="card-valor" [ngClass]="{
                  'valor-entrada': item.tipo === 'entrada' || item.tipo === 'investimento',
                  'valor-saida': item.tipo === 'saida' || item.tipo === 'saida-reserva' || item.tipo === 'saida-investimento',
                  'valor-reserva': item.tipo === 'reserva'
                }">R$ {{ formatarMoeda(item.valorRealizado) }}</span>
              </div>
              <div class="card-footer">
                <button class="btn-acao editar" (click)="preencherEdicao(item)">Editar</button>
                <button class="btn-acao excluir" (click)="excluir(item.id!)">Excluir</button>
              </div>
            </div>
          </div>
          <ng-template #listaVaziaPagina>
            <div class="vazio">Nenhum lançamento registrado neste mês.</div>
          </ng-template>
        </div>
      </ng-container>
    </div>

    <!-- MODAL DA CALCULADORA CENTRALIZADO -->
    @if (isCalculatorOpen()) {
      <div class="calc-modal-overlay" (click)="fecharCalculadora()">
        <div class="calc-modal-container" (click)="$event.stopPropagation()">
          <div class="calc-header-bar">
            <span class="calc-title-text">calcFlux</span>
            <button class="calc-close-btn" (click)="fecharCalculadora()" aria-label="Fechar">
              ✕
            </button>
          </div>
          <div style="padding: 16px;">
            <app-calculator (valueSelected)="fecharCalculadora()"></app-calculator>
          </div>
        </div>
      </div>
    }

    <!-- MODAL DO BLOCO DE NOTAS -->
    @if (isNotasOpen()) {
      <div class="calc-modal-overlay" (click)="fecharNotasModal()">
        <div class="notas-modal-container" (click)="$event.stopPropagation()">
          <div class="calc-header-bar">
            <span class="calc-title-text">Bloco de Notas</span>
            <button class="calc-close-btn" (click)="fecharNotasModal()" aria-label="Fechar">
              ✕
            </button>
          </div>

          <div class="notas-body-scroll">
            <div class="nota-form-card">
              <input class="input-nota" [(ngModel)]="tituloNotaInput" placeholder="Título da nota..." />
              <textarea class="input-nota" [(ngModel)]="conteudoNotaInput" placeholder="Escreva sua nota aqui..."></textarea>
              <button class="btn-salvar-nota" (click)="salvarNota()">
                {{ editandoNotaId ? 'Atualizar Nota' : 'Criar Nova Nota' }}
              </button>
            </div>

            <div class="notas-grid" *ngIf="notas().length > 0; else semNotasModal">
              <div *ngFor="let nota of notas()" class="nota-card-item" [style.--cor-destaque]="nota.cor">
                <h4 class="nota-card-titulo">{{ nota.titulo }}</h4>
                <p class="nota-card-texto">{{ nota.conteudo }}</p>
                <div class="nota-card-footer">
                  <span>{{ nota.dataAtualizacao | date:'dd/MM/yyyy HH:mm' }}</span>
                  <div class="nota-acoes">
                    <button class="btn-acao-n editar" (click)="carregarEdicaoNota(nota)">Editar</button>
                    <button class="btn-acao-n excluir" (click)="excluirNota(nota.id)">Excluir</button>
                  </div>
                </div>
              </div>
            </div>

            <ng-template #semNotasModal>
              <div class="vazio" style="padding: 24px; font-size: 0.85rem;">Nenhuma nota salva. Crie sua primeira nota acima!</div>
            </ng-template>
          </div>
        </div>
      </div>
    }

    <nav class="bottom-nav" role="navigation" aria-label="Navegação principal">
      <button class="nav-tab" [class.ativo]="viewAtual() === 'inicio'" (click)="irParaInicio()">
        <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span class="nav-tab-label">Início</span>
      </button>

      <button class="nav-tab" [class.ativo]="viewAtual() === 'lancamentos'" (click)="irParaLancamentos()">
        <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        <span class="nav-tab-label">Lançamentos</span>
      </button>

      <button class="nav-tab" [class.ativo]="viewAtual() === 'analytics'" (click)="irParaAnalytics()">
        <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        <span class="nav-tab-label">Analytics</span>
      </button>
    </nav>
  `
})
export class DashboardComponent implements OnInit {
  @ViewChild('formTop') formTop?: ElementRef<HTMLDivElement>;

  private readonly notaService = inject(NotaService);

  viewAtual = signal<ViewAtualExtendida>('inicio');
  menuAberto = signal<boolean>(false);
  
  isCalculatorOpen = signal<boolean>(false);
  isNotasOpen = signal<boolean>(false);

  notas = this.notaService.notas;
  tituloNotaInput = '';
  conteudoNotaInput = '';
  editandoNotaId: string | null = null;

  lancamentos = signal<Lancamento[]>([]);
  todosLancamentos = signal<Lancamento[]>([]);
  tipoAnaliseSelecionado = signal<TipoLancamentoFinanceiro>('saida');
  editandoId: number | null = null;
  operacaoEmAndamento = false;

  indiceCardAtual = 0;
  mesAtual: string = new Date().toISOString().substring(0, 7);
  novoValorTexto = '';
  novo: Lancamento & { tipo: TipoLancamentoFinanceiro } = this.criarLancamentoVazio();

  // Lista de categorias padrão pré-definidas solicitadas
  readonly categoriasPadrao: string[] = [
    'salario',
    'supermercado',
    'dentista',
    'aluguel',
    'farmacia',
    'corte de cabelo',
    'cosmedico',
    'uber',
    'pix',
    'cartão de crédito'
  ];

  readonly tiposParaAnalise: TipoLancamentoFinanceiro[] = [
    'saida',
    'entrada',
    'reserva',
    'investimento',
    'saida-reserva' as TipoLancamentoFinanceiro,
    'saida-investimento' as TipoLancamentoFinanceiro
  ];
  
  public readonly rotulosTipo: Partial<Record<TipoLancamentoFinanceiro, string>> = {
    entrada: 'Entradas',
    saida: 'Saídas / Despesas',
    reserva: 'Reservas',
    investimento: 'Investimentos',
    'saida-reserva': 'Saída (Da Reserva)',
    'saida-investimento': 'Saída (Dos Investimentos)'
  };

  private readonly paletaCoresCategoria: string[] = ['#8b5cf6', '#38bdf8', '#34d399', '#f59e0b', '#ec4899', '#6366f1'];
  private readonly mapaCorPorCategoria = new Map<string, string>();
  private proximoIndiceCor = 0;
  private readonly circunferenciaDonut = 2 * Math.PI * 60;

  private resumoMes = computed(() => this.service.calcularResumo(this.lancamentos()));
  totalEntradas = computed(() => this.resumoMes().entradas);
  totalDespesas = computed(() => this.resumoMes().despesas);
  totalGastosMes = computed(() => this.resumoMes().despesas);
  totalReservaMes = computed(() => this.resumoMes().reservas);
  totalInvestimentoMes = computed(() => this.resumoMes().investimentos);
  saldoReal = computed(() => this.resumoMes().saldoReal);

  statusConfig = computed(() => {
    const saldo = this.saldoReal();
    if (saldo >= 800) {
      return { label: 'Tranquilo (Bom saldo disponível)', textColor: '#34d399', bgColor: 'rgba(6, 78, 59, 0.4)', borderColor: 'rgba(52, 211, 153, 0.4)', dotColor: '#34d399' };
    } else if (saldo >= 300) {
      return { label: 'Alerta (Cuidado com os gastos)', textColor: '#fbbf24', bgColor: 'rgba(120, 53, 15, 0.4)', borderColor: 'rgba(251, 191, 36, 0.4)', dotColor: '#fbbf24' };
    } else {
      return { label: 'Crítico (Gastos excedem o limite)', textColor: '#f87171', bgColor: 'rgba(127, 29, 29, 0.4)', borderColor: 'rgba(248, 113, 113, 0.4)', dotColor: '#f87171' };
    }
  });

  totalGlobalEntradas = computed(() => this.service.calcularResumo(this.todosLancamentos()).entradas);
  totalGlobalSaidas = computed(() => this.service.calcularResumo(this.todosLancamentos()).despesas);
  balancoGlobal = computed(() => this.totalGlobalEntradas() - this.totalGlobalSaidas());

  analisePorTipoSelecionado = computed<AnaliseTipoResultado>(() => {
    const tipoAlvo = this.tipoAnaliseSelecionado();
    const filtrados = this.lancamentos().filter(l => l.tipo === tipoAlvo);
    const mapa = new Map<string, { valor: number; quantidade: number }>();

    for (const item of filtrados) {
      const cat = (item.categoria || 'Geral').trim();
      const val = Number(item.valorRealizado) || 0;
      const atual = mapa.get(cat) || { valor: 0, quantidade: 0 };
      mapa.set(cat, { valor: atual.valor + val, quantidade: atual.quantidade + 1 });
    }

    let totalGeral = 0;
    for (const data of mapa.values()) {
      totalGeral += data.valor;
    }

    const itensCalculados: ItemDonut[] = [];
    let acumuladoOffset = 0;

    for (const [cat, data] of mapa.entries()) {
      if (!this.mapaCorPorCategoria.has(cat)) {
        this.mapaCorPorCategoria.set(cat, this.paletaCoresCategoria[this.proximoIndiceCor % this.paletaCoresCategoria.length]);
        this.proximoIndiceCor++;
      }
      const cor = this.mapaCorPorCategoria.get(cat)!;
      const percentual = totalGeral > 0 ? (data.valor / totalGeral) * 100 : 0;
      const comprimentoTraco = totalGeral > 0 ? (data.valor / totalGeral) * this.circunferenciaDonut : 0;
      const dashArray = `${comprimentoTraco} ${this.circunferenciaDonut}`;
      const dashOffset = -acumuladoOffset;
      acumuladoOffset += comprimentoTraco;

      itensCalculados.push({
        categoria: cat,
        valor: data.valor,
        quantidade: data.quantidade,
        percentual,
        cor,
        iconeSvg: '',
        dashArray,
        dashOffset
      });
    }

    return {
      itens: itensCalculados.sort((a, b) => b.valor - a.valor),
      total: totalGeral,
      quantidadeTotal: filtrados.length
    };
  });

  analisePorTypeItens = computed(() => this.analisePorTipoSelecionado().itens);

  historicoRecente = computed<HistoricoItem[]>(() => {
    return [...this.todosLancamentos()]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 10)
      .map(item => ({
        id: item.id,
        descricao: item.descricao,
        categoria: item.categoria || 'Geral',
        data: item.data,
        tipo: item.tipo,
        valor: Number(item.valorRealizado) || 0
      }));
  });

  evolucaoSaldoMensal = computed(() => {
    const registros = this.lancamentos();
    const largura = 680;
    const altura = 95;
    if (!this.mesAtual || registros.length === 0) {
      const base = `M0,${altura / 2} L${largura},${altura / 2}`;
      return { linha: base, area: `${base} L${largura},${altura} L0,${altura} Z` };
    }
    const [ano, mes] = this.mesAtual.split('-').map(Number);
    const dias = new Date(ano, mes, 0).getDate();
    const acumulados: number[] = new Array(dias).fill(0);
    for (const r of registros) {
      if (r.statusPagamento !== 'pago') continue;
      const dia = new Date(r.data).getDate() - 1;
      if (dia >= 0 && dia < dias) {
        acumulados[dia] += r.tipo === 'entrada' ? (Number(r.valorRealizado) || 0) : -(Number(r.valorRealizado) || 0);
      }
    }
    let corrente = 0;
    const saldos = acumulados.map(v => (corrente += v));
    const min = Math.min(...saldos, 0);
    const max = Math.max(...saldos, 0);
    const amp = (max - min) || 1;
    const passoX = largura / ((dias - 1) || 1);
    const pontos = saldos.map((v, i) => ({ x: i * passoX, y: altura - ((v - min) / amp) * altura }));
    const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return { linha, area: `${linha} L${largura},${altura} L0,${altura} Z` };
  });

  constructor(
    private readonly service: FinanceiroService,
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

  formatarMoeda(valor: number | null | undefined): string {
    const n = Number(valor);
    if (!Number.isFinite(n)) return '0,00';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatarNomeMes(anoMes: string): string {
    if (!/^\d{4}-\d{2}$/.test(anoMes)) return anoMes;
    const [ano, mes] = anoMes.split('-').map(Number);
    const nome = new Date(ano, mes - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    return nome.charAt(0).toUpperCase() + nome.slice(1).replace(' de ', ' ');
  }

  onValorChange(v: string): void {
    this.novoValorTexto = v;
    const limpo = v.replace(/\./g, '').replace(',', '.').trim();
    const n = parseFloat(limpo);
    this.novo.valorRealizado = Number.isFinite(n) ? n : 0;
  }

  proximoCard(): void { this.indiceCardAtual = (this.indiceCardAtual + 1) % 4; }
  cardAnterior(): void { this.indiceCardAtual = (this.indiceCardAtual - 1 + 4) % 4; }
  irParaCard(i: number): void { this.indiceCardAtual = i; }

  alternarMenu(): void { this.menuAberto.update(v => !v); }
  fecharMenu(): void { this.menuAberto.set(false); }

  abrirCalculadora(): void {
    this.isCalculatorOpen.set(true);
    this.fecharMenu();
  }

  fecharCalculadora(): void {
    this.isCalculatorOpen.set(false);
  }

  abrirNotasModal(): void {
    this.isNotasOpen.set(true);
    this.fecharMenu();
  }

  fecharNotasModal(): void {
    this.isNotasOpen.set(false);
    this.editandoNotaId = null;
    this.tituloNotaInput = '';
    this.conteudoNotaInput = '';
  }

  salvarNota(): void {
    if (!this.conteudoNotaInput.trim() && !this.tituloNotaInput.trim()) return;

    if (this.editandoNotaId) {
      this.notaService.atualizarNota(
        this.editandoNotaId,
        this.tituloNotaInput.trim() || 'Nota sem título',
        this.conteudoNotaInput.trim()
      );
      this.editandoNotaId = null;
    } else {
      this.notaService.adicionarNota(
        this.tituloNotaInput.trim() || 'Nota sem título',
        this.conteudoNotaInput.trim()
      );
    }

    this.tituloNotaInput = '';
    this.conteudoNotaInput = '';
    this.cdr.markForCheck();
  }

  carregarEdicaoNota(nota: Nota): void {
    this.editandoNotaId = nota.id;
    this.tituloNotaInput = nota.titulo;
    this.conteudoNotaInput = nota.conteudo;
  }

  excluirNota(id: string): void {
    if (confirm('Deseja realmente excluir esta nota?')) {
      this.notaService.deletarNota(id);
      this.cdr.markForCheck();
    }
  }

  irParaInicio(): void { this.viewAtual.set('inicio'); this.fecharMenu(); }
  irParaLancamentos(): void { this.viewAtual.set('lancamentos'); this.fecharMenu(); }
  irParaAnalytics(): void { this.viewAtual.set('analytics'); this.fecharMenu(); }

  async carregar(): Promise<void> {
    if (!/^\d{4}-\d{2}$/.test(this.mesAtual)) {
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

  async selecionarMes(m: string): Promise<void> {
    this.mesAtual = m;
    await this.carregar();
  }

  async salvar(): Promise<void> {
    if (!this.novo.descricao.trim()) {
      this.notificacaoService.avisar('Informe uma descrição.');
      return;
    }
    if (!this.novo.valorRealizado || this.novo.valorRealizado <= 0) {
      this.notificacaoService.avisar('Informe um valor válido.');
      return;
    }
    if (!this.novo.categoria?.trim()) this.novo.categoria = 'geral';
    if (!this.editandoId) this.novo.data = new Date().toISOString();

    this.operacaoEmAndamento = true;
    try {
      if (this.editandoId) {
        await firstValueFrom(this.service.atualizar(this.editandoId, this.novo));
        this.notificacaoService.avisar('Atualizado com sucesso!');
      } else {
        await firstValueFrom(this.service.adicionar(this.novo));
        this.notificacaoService.avisar('Salvo com sucesso!');
      }
      this.novo = this.criarLancamentoVazio();
      this.novoValorTexto = '';
      this.editandoId = null;
      await this.carregar();
      await this.carregarTodosLancamentos();
    } finally {
      this.operacaoEmAndamento = false;
    }
  }

  preencherEdicao(item: Lancamento): void {
    this.editandoId = item.id ?? null;
    this.novo = { ...item, tipo: item.tipo as TipoLancamentoFinanceiro };
    this.novoValorTexto = this.formatarMoeda(item.valorRealizado);
    if (this.viewAtual() !== 'lancamentos') {
      this.viewAtual.set('lancamentos');
      this.fecharMenu();
    }
  }

  async excluir(id: number): Promise<void> {
    if (confirm('Deseja realmente excluir este lançamento?')) {
      await firstValueFrom(this.service.deletar(id));
      await this.carregar();
      await this.carregarTodosLancamentos();
    }
  }

  gerarPDF(): void {
    const nomeMesAtual = this.formatarNomeMes(this.mesAtual);
    this.pdfExportService.exportar(this.lancamentos(), nomeMesAtual, this.mesAtual);
    this.fecharMenu();
  }

  exportarExcel(): void {
    this.excelExportService.exportar(this.lancamentos(), this.mesAtual);
    this.fecharMenu();
  }

  async exportarBackup(): Promise<void> {
    await this.backupService.exportar(this.todosLancamentos());
    this.fecharMenu();
  }

  async importarBackup(e: Event): Promise<void> {
    try {
      await this.backupService.importar(e);
      this.notificacaoService.avisar('Backup restaurado com sucesso!');
      await this.carregar();
      await this.carregarTodosLancamentos();
    } catch {
      this.notificacaoService.avisar('Falha ao restaurar backup.');
    }
    this.fecharMenu();
  }

  private criarLancamentoVazio(): Lancamento & { tipo: TipoLancamentoFinanceiro } {
    return {
      descricao: '',
      valorRealizado: 0,
      valorPrevisto: 0,
      divisao: '' as unknown as DivisaoLancamento,
      categoria: 'salario',
      tipo: 'saida' as TipoLancamentoFinanceiro,
      statusPagamento: 'pago' as const,
      data: new Date().toISOString()
    };
  }
}