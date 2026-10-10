import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';

import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { FinanceiroService } from '../../services/financeiro.service';
import { DivisaoLancamento, Lancamento } from '../../services/db.service';
import { PdfExportService } from '../../services/pdf-export.service';
import { ExcelExportService } from '../../services/excel-export.service';
import { BackupService } from '../../services/backup.service';
import { BackupArquivo, ModoRestauracao, SnapshotInfo } from '../../services/backup.model';
import { NotificacaoService } from '../../services/notificacao.service';
import { NotaService, Nota } from '../../services/nota.service';
import { AutoBackupService } from '../../services/auto-backup.service';
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

interface GrupoDia {
  chave: string;
  rotulo: string;
  itens: Lancamento[];
}

interface EvolucaoSaldo {
  linha: string;
  area: string;
  menor: number;
  maior: number;
  saldoAtual: number;
  rotuloAtual: string;
  hojeX: number | null;
}

interface ChipFiltro {
  valor: string;
  rotulo: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePipe, CalculatorComponent],
  styles: [`
    :host {
      --bg-base: #07090e;
      --bg-surface: rgba(18, 22, 33, 0.94);
      --bg-surface-hover: rgba(26, 32, 48, 0.98);
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
      --shadow-glow: 0 10px 24px -10px rgba(139, 92, 246, 0.25);
    }

    * { box-sizing: border-box; }

    :host *,
    :host *::before,
    :host *::after {
      -webkit-tap-highlight-color: transparent;
    }
    :host button,
    :host [role='option'] {
      font-family: inherit;
      outline: none;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
    }
    :host button:focus-visible,
    :host [role='option']:focus-visible {
      outline: 2px solid rgba(192, 132, 252, 0.8);
      outline-offset: 2px;
    }
    :host input,
    :host select,
    :host textarea {
      font-family: inherit;
      outline: none;
    }

    .app-container {
      position: relative;
      isolation: isolate;
      max-width: 680px;
      margin: 0 auto;
      padding: 0 16px calc(var(--nav-height) + 40px + env(safe-area-inset-bottom));
      width: 100%;
      min-width: 0;
      overflow-x: hidden;
      font-family: 'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      font-variant-numeric: tabular-nums;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
      color: var(--text-primary);
      min-height: 100vh;
      background-color: var(--bg-base);
    }

    .app-container::before {
      content: '';
      position: fixed;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      background:
        linear-gradient(180deg, rgba(7, 9, 14, 0.9) 0%, rgba(11, 14, 22, 0.99) 100%),
        radial-gradient(circle at 10% 5%, rgba(139, 92, 246, 0.2) 0%, transparent 45%),
        radial-gradient(circle at 90% 15%, rgba(236, 72, 153, 0.18) 0%, transparent 40%),
        url('../../../assets/images/imagem2.png') center center / cover no-repeat;
      background-color: var(--bg-base);
    }

    @media (min-width: 768px) {
      .app-container { max-width: 900px; padding-left: 24px; padding-right: 24px; }
    }

    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      padding-top: max(22px, env(safe-area-inset-top));
      padding-bottom: 16px; margin-bottom: 12px;
    }

    .brand-section { display: flex; align-items: center; gap: 12px; }

    .btn-hamburguer,
    .btn-topo {
      display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 5px;
      width: 42px; height: 42px; flex-shrink: 0;
      background: var(--bg-surface); border: 1px solid var(--card-border);
      border-radius: var(--radius-sm); cursor: pointer; padding: 0;
      color: var(--text-secondary);
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }
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
      box-shadow: 0 6px 14px -4px rgba(139, 92, 246, 0.4); flex-shrink: 0;
    }

    .flux-title {
      font-size: 1.45rem; font-weight: 900; letter-spacing: -0.3px;
      background: linear-gradient(135deg, #c084fc 0%, #38bdf8 50%, #34d399 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text; margin: 0;
    }

    /* Seletor de mês com setas */
    .mes-nav {
      display: flex; align-items: center; justify-content: space-between; gap: 8px;
      max-width: 340px; margin: 0 auto 20px;
      background: var(--bg-surface); border: 1px solid var(--card-border);
      border-radius: var(--radius-md); padding: 6px;
    }
    .mes-seta {
      width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
      background: transparent; border: none; color: var(--text-secondary);
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    .mes-nome { font-size: 1rem; font-weight: 800; text-align: center; flex: 1; }

    .hero-balance-card {
      background: var(--bg-surface);
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
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
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
      font-size: 0.78rem; font-weight: 800; letter-spacing: 0.9px;
      text-transform: uppercase; color: var(--text-secondary);
      display: block; margin-bottom: 3px;
    }
    .status-value-text {
      font-size: 1.1rem; font-weight: 900; letter-spacing: -0.2px;
      word-break: break-word;
    }
    .status-dot-indicator {
      width: 16px; height: 16px; border-radius: 50%;
      box-shadow: 0 0 10px currentColor; flex-shrink: 0; margin-left: 12px;
    }

    .quick-actions-grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 12px; margin-bottom: 22px;
    }
    .quick-action-btn {
      display: flex; flex-direction: column; align-items: center;
      gap: 8px; background: transparent; border: none;
      cursor: pointer; padding: 0;
    }
    .quick-action-icon {
      width: 100%; height: 60px; border-radius: var(--radius-md);
      background: var(--bg-surface); border: 1px solid var(--card-border);
      display: flex; align-items: center; justify-content: center;
      color: #c084fc;
      transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
      box-shadow: 0 6px 14px rgba(0, 0, 0, 0.3);
    }
    .quick-action-label {
      font-size: 0.85rem; font-weight: 700;
      color: var(--text-secondary); text-align: center;
    }

    /* Grade de resumo 2x2 (substitui o carrossel) */
    .resumo-grid {
      display: grid; grid-template-columns: repeat(2, 1fr);
      gap: 12px; margin-bottom: 22px;
    }
    .resumo-card {
      position: relative; overflow: hidden; min-width: 0;
      background: linear-gradient(145deg, rgba(22, 27, 40, 0.96), rgba(13, 17, 26, 0.99));
      border: 1px solid var(--card-border);
      border-radius: var(--radius-md);
      padding: 16px; display: flex; flex-direction: column; gap: 10px;
    }
    .resumo-card::before {
      content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, transparent, var(--cor), transparent);
    }
    .resumo-topo { display: flex; align-items: center; gap: 10px; }
    .resumo-icone {
      width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      color: var(--cor);
      background: color-mix(in srgb, var(--cor) 16%, transparent);
      border: 1px solid color-mix(in srgb, var(--cor) 35%, transparent);
    }
    .resumo-icone svg { width: 18px; height: 18px; display: block; }
    .resumo-label {
      font-size: 0.8rem; font-weight: 800; letter-spacing: 0.6px;
      text-transform: uppercase; color: var(--text-secondary); line-height: 1.2;
    }
    .resumo-valor {
      font-size: clamp(1.05rem, 4.6vw, 1.55rem); font-weight: 900;
      letter-spacing: -0.4px; color: var(--cor); word-break: break-word;
    }
    .resumo-sub {
      font-size: 0.78rem; font-weight: 700; color: var(--text-muted);
      margin-top: -4px; word-break: break-word;
    }

    .drawer {
      position: fixed; top: 0; left: 0; height: 100vh;
      width: 300px; max-width: 85vw;
      background: rgba(11, 14, 22, 0.99);
      border-right: 1px solid var(--card-border);
      transform: translateX(-105%);
      visibility: hidden;
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), visibility 0s linear 0.3s;
      z-index: 60; display: flex; flex-direction: column;
      padding: max(24px, env(safe-area-inset-top)) 20px 24px;
      overflow-y: auto;
    }
    .drawer.aberto {
      transform: translateX(0);
      visibility: visible;
      transition-delay: 0s;
      box-shadow: 18px 0 40px rgba(0, 0, 0, 0.6);
    }
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
      cursor: pointer;
      transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }

    .secao-titulo {
      font-size: 0.78rem; font-weight: 800; letter-spacing: 1px;
      text-transform: uppercase; color: var(--text-muted);
      margin: 12px 0 10px;
    }
    .acao-item {
      display: flex; align-items: center; gap: 12px; width: 100%;
      padding: 14px 16px; border-radius: var(--radius-sm);
      border: 1px solid var(--card-border); color: var(--text-primary);
      font-weight: 700; font-size: 0.92rem; cursor: pointer;
      margin-bottom: 10px; background: var(--bg-surface);
      transition: background-color 0.2s ease, border-color 0.2s ease;
    }
    .acao-item:disabled { opacity: 0.5; cursor: not-allowed; }

    .drawer-rodape {
      margin-top: auto; padding-top: 20px;
      border-top: 1px solid var(--card-border);
      font-size: 0.8rem; color: var(--text-muted); text-align: center;
    }

    .backdrop-drawer {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.78);
      z-index: 50;
      animation: fadeIn 0.25s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .card-modulo {
      background: var(--bg-surface);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-lg);
      padding: 24px; margin-bottom: 22px;
      box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.5);
      overflow: hidden;
    }
    .card-titulo {
      font-size: 1.15rem; font-weight: 900; margin: 0 0 18px 0;
      display: flex; align-items: center; gap: 10px;
    }

    .grafico-stats {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: -6px 0 14px;
    }
    .stat { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .stat-label {
      font-size: 0.78rem; font-weight: 800; letter-spacing: 0.5px;
      text-transform: uppercase; color: var(--text-muted);
    }
    .stat-valor { font-size: 0.95rem; font-weight: 900; word-break: break-word; }

    .sparkline-wrap {
      width: 100%; line-height: 0;
      margin: 10px -24px -24px -24px;
      border-bottom-left-radius: var(--radius-lg);
      border-bottom-right-radius: var(--radius-lg);
      overflow: hidden;
    }
    .sparkline-svg { width: 100%; height: 95px; display: block; }

    /* Chips (filtros e tipo de análise) */
    .chips {
      display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 6px;
      -webkit-overflow-scrolling: touch; scrollbar-width: none;
      /* esmaece a borda direita para indicar que dá para rolar */
      -webkit-mask-image: linear-gradient(to right, #000 calc(100% - 32px), transparent);
      mask-image: linear-gradient(to right, #000 calc(100% - 32px), transparent);
      padding-right: 28px;
    }
    .chips::-webkit-scrollbar { display: none; }
    .chip {
      flex-shrink: 0; padding: 9px 14px; border-radius: 999px;
      background: var(--bg-surface); border: 1px solid var(--card-border);
      color: var(--text-secondary); font-size: 0.85rem; font-weight: 800;
      cursor: pointer; white-space: nowrap;
      transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
    }
    .chip.ativo {
      background: rgba(139, 92, 246, 0.25); border-color: var(--primary); color: #ffffff;
    }
    /* Analytics: todas as opções visíveis, quebrando em várias linhas */
    .chips-analise {
      flex-wrap: wrap; overflow-x: visible; margin-bottom: 18px;
      -webkit-mask-image: none; mask-image: none;
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
      background: rgba(15, 20, 30, 0.97);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 28px;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.6);
    }
    .nav-tab {
      display: flex; flex-direction: column; align-items: center;
      gap: 4px; background: transparent; border: none;
      color: var(--text-secondary); cursor: pointer;
      flex: 1; padding: 6px; transition: color 0.2s ease;
    }
    .nav-tab-label {
      font-size: 0.78rem; font-weight: 800; letter-spacing: 0.3px;
    }
    .nav-tab.ativo { color: #c084fc; }

    .cabecalho-pagina {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 16px; gap: 12px; flex-wrap: wrap;
    }
    .titulo-pagina { font-size: 1.3rem; font-weight: 900; margin: 0; }

    /* Lançamentos: lista agrupada por dia */
    .lancamentos-view {
      display: flex; flex-direction: column; width: 100%; min-width: 0;
      padding-bottom: 72px;
    }
    .filtros { margin-bottom: 18px; }
    .busca-wrap { position: relative; margin-bottom: 12px; }
    .busca-wrap svg {
      position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
      color: var(--text-muted); pointer-events: none;
    }
    .busca-input {
      width: 100%; background: rgba(11, 14, 22, 0.95);
      border: 1px solid var(--card-border); border-radius: var(--radius-sm);
      padding: 13px 14px 13px 42px; color: var(--text-primary);
      font-size: 0.95rem; font-weight: 600; outline: none;
    }
    .busca-input:focus {
      border-color: var(--primary); box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
    }

    .grupo-dia { margin-bottom: 20px; }
    .grupo-titulo {
      display: flex; align-items: center; gap: 8px;
      font-size: 0.88rem; font-weight: 800; letter-spacing: 0.3px;
      color: var(--text-secondary); margin: 0 0 8px 4px;
    }
    .grupo-qtd {
      font-size: 0.78rem; font-weight: 800; color: var(--text-muted);
      background: rgba(255, 255, 255, 0.08); padding: 2px 8px; border-radius: 999px;
    }
    .grupo-lista { display: flex; flex-direction: column; gap: 8px; }

    .linha {
      position: relative; display: flex; align-items: center; gap: 12px;
      padding: 12px 8px 12px 18px; overflow: hidden;
      background: var(--bg-surface); border: 1px solid var(--card-border);
      border-radius: var(--radius-md);
      content-visibility: auto; contain-intrinsic-size: auto 66px;
      transition: border-color 0.2s ease;
    }
    .linha::before {
      content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px;
      background: var(--cor);
    }
    .linha-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .linha-desc {
      font-size: 1rem; font-weight: 800; color: var(--text-primary);
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .linha-meta {
      display: flex; align-items: center; gap: 6px;
      font-size: 0.8rem; font-weight: 700; color: var(--text-muted);
      overflow: hidden; white-space: nowrap;
    }
    .linha-meta-texto { overflow: hidden; text-overflow: ellipsis; }
    .tag-pendente {
      flex-shrink: 0; padding: 1px 8px; border-radius: 999px;
      font-size: 0.72rem; font-weight: 900; letter-spacing: 0.4px; text-transform: uppercase;
      background: rgba(245, 158, 11, 0.18); color: #fbbf24;
      border: 1px solid rgba(251, 191, 36, 0.4);
    }
    .linha-valor {
      font-size: 1.05rem; font-weight: 900; color: var(--cor);
      white-space: nowrap; flex-shrink: 0;
    }
    .linha-acoes { display: flex; flex-shrink: 0; }
    .btn-icone {
      width: 36px; height: 36px; border-radius: 10px;
      background: transparent; border: none; color: var(--text-muted);
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      transition: background-color 0.2s ease, color 0.2s ease;
    }
    .btn-icone svg { width: 18px; height: 18px; display: block; }

    .vazio {
      text-align: center; padding: 40px 20px; color: var(--text-secondary);
      background: var(--bg-surface); border-radius: var(--radius-md);
      border: 1px dashed var(--card-border); font-size: 0.95rem; font-weight: 700;
      display: flex; flex-direction: column; align-items: center; gap: 16px;
    }
    .vazio p { margin: 0; }
    .btn-primario,
    .btn-secundario {
      padding: 12px 20px; border-radius: var(--radius-sm); cursor: pointer;
      font-weight: 900; font-size: 0.92rem; color: #ffffff;
      transition: opacity 0.2s ease, background-color 0.2s ease;
    }
    .btn-primario {
      border: none; background: linear-gradient(135deg, #8b5cf6, #6d28d9);
    }
    .btn-secundario {
      background: rgba(255, 255, 255, 0.06); border: 1px solid var(--card-border);
    }

    .btn-primario:disabled,
    .btn-secundario:disabled { opacity: 0.6; cursor: not-allowed; }

    .aviso-backup {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; flex-wrap: wrap; padding: 14px 16px; margin-bottom: 22px;
      border-radius: var(--radius-md);
      background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(251, 191, 36, 0.4);
    }
    .aviso-backup p {
      margin: 0; flex: 1; min-width: 180px;
      font-size: 0.9rem; font-weight: 700; color: #fde68a;
    }
    .aviso-backup .btn-secundario { padding: 9px 14px; font-size: 0.85rem; }

    .modal-corpo { padding: 20px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
    .modal-corpo p { margin: 0; font-size: 0.95rem; line-height: 1.45; color: var(--text-secondary); }
    .modal-corpo strong { color: var(--text-primary); }
    .modal-corpo .modal-dica { font-size: 0.85rem; color: var(--text-muted); }
    .modal-acoes { display: flex; flex-direction: column; gap: 10px; }
    .snapshot-item {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 12px 14px; border-radius: var(--radius-sm);
      background: rgba(255, 255, 255, 0.03); border: 1px solid var(--card-border);
      font-weight: 700; font-size: 0.92rem;
    }
    .snapshot-item .btn-secundario { padding: 9px 14px; font-size: 0.85rem; }

    /* Botão flutuante */
    .fab {
      position: fixed; z-index: 45;
      right: max(20px, calc((100vw - 680px) / 2 + 16px));
      bottom: calc(var(--nav-height) + 32px + env(safe-area-inset-bottom));
      width: 58px; height: 58px; border-radius: 50%; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center; color: #ffffff;
      background: linear-gradient(135deg, #8b5cf6, #6d28d9);
      box-shadow: 0 8px 20px rgba(139, 92, 246, 0.5);
      transition: transform 0.2s ease;
    }

    /* Painel de formulário (sobe de baixo) */
    .sheet-overlay {
      position: fixed; inset: 0; background: rgba(0, 0, 0, 0.72);
      z-index: 85; animation: fadeIn 0.2s ease;
    }
    .sheet {
      position: fixed; left: 0; right: 0; bottom: 0; margin: 0 auto;
      max-width: 680px; max-height: 92vh; overflow-y: auto;
      background: #0f141e; border: 1px solid rgba(255, 255, 255, 0.15); border-bottom: none;
      border-radius: 24px 24px 0 0; z-index: 90;
      padding: 10px 20px calc(20px + env(safe-area-inset-bottom));
      animation: subir 0.28s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes subir { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .sheet-handle {
      width: 42px; height: 4px; border-radius: 2px; margin: 0 auto 12px;
      background: rgba(255, 255, 255, 0.2);
    }
    .sheet-header {
      display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;
    }
    .sheet-titulo { font-size: 1.15rem; font-weight: 900; margin: 0; }

    .form-grid { display: grid; grid-template-columns: 1fr; gap: 14px; }
    @media (min-width: 520px) {
      .form-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .form-grid input,
    .form-grid select {
      background: rgba(11, 14, 22, 0.95);
      border: 1px solid var(--card-border);
      border-radius: var(--radius-sm);
      padding: 14px 16px; color: var(--text-primary);
      font-size: 0.95rem; font-weight: 600;
      outline: none; width: 100%;
    }
    .form-grid input:focus,
    .form-grid select:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
    }

    .combo { position: relative; width: 100%; }
    .combo.aberto { z-index: 25; }
    .form-grid .combo-input { padding-right: 52px; }
    .combo-seta {
      position: absolute; top: 50%; right: 8px; transform: translateY(-50%);
      width: 36px; height: 36px; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      background: transparent; border: none; color: var(--text-secondary);
      cursor: pointer;
    }
    .combo-seta svg { transition: transform 0.2s ease; }
    .combo-seta.aberta svg { transform: rotate(180deg); }
    .combo-overlay { position: fixed; inset: 0; z-index: 20; background: transparent; }
    .combo-lista {
      position: absolute; top: calc(100% + 6px); left: 0; right: 0;
      margin: 0; padding: 6px; list-style: none;
      max-height: 220px; overflow-y: auto;
      background: #0f141e;
      border: 1px solid var(--card-border-hover);
      border-radius: var(--radius-sm);
      box-shadow: 0 12px 28px rgba(0, 0, 0, 0.6);
      z-index: 25;
      -webkit-overflow-scrolling: touch;
    }
    .combo-lista li {
      padding: 12px 14px; border-radius: 8px;
      font-size: 0.92rem; font-weight: 700; color: var(--text-primary);
      cursor: pointer; text-transform: capitalize;
    }
    .combo-lista li.selecionada { background: rgba(139, 92, 246, 0.2); color: #c084fc; }

    .btn-salvar {
      grid-column: 1 / -1; padding: 16px; border: none;
      border-radius: var(--radius-sm); cursor: pointer;
      color: white; font-weight: 900; font-size: 1rem;
      background: linear-gradient(135deg, #8b5cf6, #6d28d9);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
      transition: opacity 0.2s ease;
    }
    .btn-salvar:disabled { opacity: 0.6; cursor: not-allowed; }

    .svg-icon { width: 22px; height: 22px; display: block; flex-shrink: 0; }

    .analytics-cards-grid {
      display: grid; grid-template-columns: 1fr; gap: 16px; margin-bottom: 22px; width: 100%; min-width: 0;
    }
    @media (min-width: 640px) {
      .analytics-cards-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .analytics-metric-card {
      background: var(--bg-surface);
      border: 1px solid var(--card-border); border-radius: var(--radius-md);
      padding: 20px; display: flex; flex-direction: column; gap: 8px;
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3); min-width: 0; overflow: hidden;
    }
    .analytics-metric-label {
      font-size: 0.8rem; font-weight: 800; letter-spacing: 0.8px;
      text-transform: uppercase; color: var(--text-secondary); line-height: 1.2;
    }
    .analytics-metric-desc { font-size: 0.8rem; color: var(--text-muted); line-height: 1.3; margin-bottom: 2px; }
    .analytics-metric-value {
      font-size: clamp(1.15rem, 5vw, 1.65rem); font-weight: 900; letter-spacing: -0.5px;
      word-break: break-word; overflow-wrap: break-word;
    }

    .historico-subtitulo { font-size: 0.85rem; color: var(--text-muted); margin: -8px 0 16px 0; line-height: 1.4; }
    .historico-lista { display: flex; flex-direction: column; gap: 8px; max-height: 460px; overflow-y: auto; padding-right: 4px; -webkit-overflow-scrolling: touch; }
    .historico-item {
      display: flex; align-items: center; gap: 12px; padding: 12px 14px;
      border-radius: var(--radius-sm); background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--card-border); min-width: 0;
      content-visibility: auto;
      contain-intrinsic-size: auto 62px;
    }
    .historico-icone {
      width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      color: var(--cor);
      background: color-mix(in srgb, var(--cor) 16%, transparent);
    }
    .historico-info { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
    .historico-desc { font-size: 0.92rem; font-weight: 800; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .historico-meta { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .historico-valor { font-size: 0.92rem; font-weight: 900; white-space: nowrap; flex-shrink: 0; color: var(--cor); }
    .historico-vazio {
      text-align: center; padding: 32px 16px; color: var(--text-secondary);
      font-weight: 700; font-size: 0.9rem; background: rgba(255, 255, 255, 0.03);
      border: 1px dashed var(--card-border); border-radius: var(--radius-sm);
    }

    /* Modais (Calculadora e Notas) */
    .calc-modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: rgba(7, 9, 14, 0.92);
      padding: 16px;
    }

    .calc-modal-container {
      width: 100%;
      max-width: 320px;
      background: #0f141e;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 24px;
      box-shadow: 0 16px 36px -12px rgba(0, 0, 0, 0.8);
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
      box-shadow: 0 16px 36px -12px rgba(0, 0, 0, 0.8);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes scaleIn {
      from { transform: scale(0.94); opacity: 0; }
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
      transition: background-color 0.2s ease;
    }

    .notas-body-scroll {
      padding: 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .nota-form-card {
      background: rgba(18, 22, 33, 0.95);
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
      transition: opacity 0.2s ease;
    }
    .notas-grid {
      display: grid; grid-template-columns: 1fr; gap: 12px;
    }
    @media(min-width: 520px) {
      .notas-grid { grid-template-columns: repeat(2, 1fr); }
    }
    .nota-card-item {
      position: relative;
      background: linear-gradient(145deg, rgba(22, 27, 40, 0.96), rgba(13, 17, 26, 0.99));
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
      font-size: 0.78rem; color: #94a3b8;
    }
    .nota-acoes { display: flex; gap: 6px; }
    .btn-acao-n {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1);
      color: #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; cursor: pointer;
      transition: color 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
    }

    /* Hover só com mouse: no toque o :hover "gruda" e vira sombra quadrada */
    @media (hover: hover) and (pointer: fine) {
      .btn-hamburguer:hover,
      .btn-topo:hover { background: var(--bg-surface-hover); border-color: var(--card-border-hover); color: #ffffff; }
      .quick-action-btn:hover .quick-action-icon {
        background: var(--bg-surface-hover); border-color: var(--primary); color: #ffffff;
      }
      .btn-fechar-drawer:hover {
        color: var(--text-primary); background: var(--bg-surface-hover); border-color: var(--card-border-hover);
      }
      .acao-item:hover:not(:disabled) { background: var(--bg-surface-hover); border-color: var(--card-border-hover); }
      .mes-seta:hover { background: rgba(255, 255, 255, 0.08); color: #ffffff; }
      .chip:hover { border-color: var(--card-border-hover); color: #ffffff; }
      .linha:hover { border-color: var(--card-border-hover); }
      .btn-icone:hover { background: rgba(255, 255, 255, 0.08); color: #ffffff; }
      .btn-icone.excluir:hover { background: rgba(239, 68, 68, 0.15); color: #f87171; }
      .btn-icone.editar:hover { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
      .btn-primario:hover,
      .btn-salvar:hover:not(:disabled),
      .btn-salvar-nota:hover { opacity: 0.92; }
      .btn-secundario:hover { background: rgba(255, 255, 255, 0.1); }
      .fab:hover { transform: scale(1.05); }
      .calc-close-btn:hover { background: #dc2626; }
      .btn-acao-n.editar:hover { color: #60a5fa; border-color: rgba(96,165,250,0.4); background: rgba(59,130,246,0.15); }
      .btn-acao-n.excluir:hover { color: #f87171; border-color: rgba(248,113,113,0.4); background: rgba(239,68,68,0.15); }
      .combo-lista li:hover { background: rgba(139, 92, 246, 0.18); }
      .combo-seta:hover { color: #c084fc; }
    }
  `],
  template: `
    <div class="app-container">
      <div class="topbar">
        <div class="brand-section">
          <button
            type="button"
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

        <button
          type="button"
          class="btn-topo"
          (click)="alternarValoresOcultos()"
          [attr.aria-pressed]="valoresOcultos()"
          [attr.aria-label]="valoresOcultos() ? 'Mostrar valores' : 'Ocultar valores'"
        >
          @if (valoresOcultos()) {
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
          } @else {
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          }
        </button>
      </div>

      <nav class="drawer" [class.aberto]="menuAberto()" role="navigation" aria-label="Menu principal">
        <div class="drawer-header">
          <span class="drawer-titulo">Menu FluxNexis</span>
          <button type="button" class="btn-fechar-drawer" (click)="fecharMenu()" aria-label="Fechar menu">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <p class="secao-titulo">Ferramentas & Ações</p>

        <button type="button" class="acao-item" (click)="abrirCalculadora()">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="10" y2="10"></line><line x1="14" y1="10" x2="16" y2="10"></line><line x1="8" y1="14" x2="10" y2="14"></line><line x1="14" y1="14" x2="16" y2="14"></line><line x1="8" y1="18" x2="16" y2="18"></line></svg>
          Calculadora Rápida
        </button>

        <button type="button" class="acao-item" (click)="abrirNotasModal()">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Bloco de Notas
        </button>

        <p class="secao-titulo">Relatórios & Exportação</p>

        <button type="button" class="acao-item" (click)="gerarPDF()" [disabled]="operacaoEmAndamento()">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          Exportar Relatório PDF
        </button>

        <button type="button" class="acao-item" (click)="exportarExcel()" [disabled]="operacaoEmAndamento()">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line><line x1="9" y1="9" x2="9" y2="21"></line></svg>
          Exportar Planilha Excel
        </button>

        <button type="button" class="acao-item" (click)="exportarBackup()" [disabled]="operacaoEmAndamento()">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          Salvar backup (Drive, WhatsApp…)
        </button>

        <input #inputBackup type="file" accept=".json" hidden (change)="importarBackup($event)" />
        <button type="button" class="acao-item" (click)="inputBackup.click()" [disabled]="operacaoEmAndamento()">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.65-5.65"></path></svg>
          Restaurar de arquivo
        </button>

        <button type="button" class="acao-item" (click)="abrirBackupsAutomaticos()" [disabled]="operacaoEmAndamento()">
          <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Backups automáticos
        </button>

        <div class="drawer-rodape">FluxNexis · Arquitetura Moderna DX</div>
      </nav>

      @if (menuAberto()) {
        <div class="backdrop-drawer" (click)="fecharMenu()"></div>
      }

      @if (viewAtual() === 'inicio') {
        <div class="mes-nav">
          <button type="button" class="mes-seta" (click)="mudarMes(-1)" aria-label="Mês anterior">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <span class="mes-nome" aria-live="polite">{{ nomeMesAtual() }}</span>
          <button type="button" class="mes-seta" (click)="mudarMes(1)" aria-label="Próximo mês">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>

        <div class="hero-balance-card">
          <div class="hero-balance-content">
            <div class="wallet-icon-box">
              <svg style="width: 28px; height: 28px;" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </div>
            <div>
              <span class="hero-subtitle">Saldo Líquido Disponível</span>
              <div class="hero-balance-value">R$ {{ moeda(saldoReal()) }}</div>
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

        @if (mostrarAvisoBackup()) {
          <div class="aviso-backup" role="status">
            <p>{{ textoAvisoBackup() }}</p>
            <button type="button" class="btn-secundario" (click)="exportarBackup()" [disabled]="operacaoEmAndamento()">Salvar agora</button>
          </div>
        }

        <div class="quick-actions-grid">
          <button type="button" class="quick-action-btn" (click)="abrirCalculadora()">
            <div class="quick-action-icon">
              <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="8" y1="10" x2="10" y2="10"></line></svg>
            </div>
            <span class="quick-action-label">Calculadora</span>
          </button>

          <button type="button" class="quick-action-btn" (click)="abrirNotasModal()">
            <div class="quick-action-icon">
              <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            </div>
            <span class="quick-action-label">Notas</span>
          </button>
        </div>

        <div class="resumo-grid">
          <div class="resumo-card" style="--cor: #34d399;">
            <div class="resumo-topo">
              <span class="resumo-icone">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="7 17 17 7"></polyline><polyline points="9 7 17 7 17 15"></polyline></svg>
              </span>
              <span class="resumo-label">Entradas</span>
            </div>
            <span class="resumo-valor">R$ {{ moeda(totalEntradas()) }}</span>
          </div>

          <div class="resumo-card" style="--cor: #f87171;">
            <div class="resumo-topo">
              <span class="resumo-icone">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 7 7 17"></polyline><polyline points="15 17 7 17 7 9"></polyline></svg>
              </span>
              <span class="resumo-label">Gastos</span>
            </div>
            <span class="resumo-valor">R$ {{ moeda(totalGastosMes()) }}</span>
          </div>

          <div class="resumo-card" style="--cor: #c084fc;">
            <div class="resumo-topo">
              <span class="resumo-icone">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 4v5c0 5-3.5 9-8 10-4.5-1-8-5-8-10V7l8-4z"></path></svg>
              </span>
              <span class="resumo-label">Reserva</span>
            </div>
            <span class="resumo-valor">R$ {{ moeda(totalReservaAcumulada()) }}</span>
            <span class="resumo-sub">Neste mês: R$ {{ moeda(totalReservaMes()) }}</span>
          </div>

          <div class="resumo-card" style="--cor: #38bdf8;">
            <div class="resumo-topo">
              <span class="resumo-icone">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 17 9 11 13 15 21 7"></polyline></svg>
              </span>
              <span class="resumo-label">Investimentos</span>
            </div>
            <span class="resumo-valor">R$ {{ moeda(totalInvestimentoAcumulado()) }}</span>
            <span class="resumo-sub">Neste mês: R$ {{ moeda(totalInvestimentoMes()) }}</span>
          </div>
        </div>

        <div class="card-modulo">
          <strong class="card-titulo">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            Evolução Diária do Saldo
          </strong>

          <div class="grafico-stats">
            <div class="stat">
              <span class="stat-label">Menor</span>
              <span class="stat-valor" style="color: #f87171;">R$ {{ moeda(evolucaoSaldoMensal().menor) }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">Maior</span>
              <span class="stat-valor" style="color: #34d399;">R$ {{ moeda(evolucaoSaldoMensal().maior) }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">{{ evolucaoSaldoMensal().rotuloAtual }}</span>
              <span class="stat-valor" style="color: #c084fc;">R$ {{ moeda(evolucaoSaldoMensal().saldoAtual) }}</span>
            </div>
          </div>

          <div class="sparkline-wrap">
            <svg class="sparkline-svg" viewBox="0 0 680 95" preserveAspectRatio="none" role="img" aria-label="Gráfico de evolução diária do saldo">
              <path [attr.d]="evolucaoSaldoMensal().area" fill="rgba(139, 92, 246, 0.2)" stroke="none"></path>
              <path [attr.d]="evolucaoSaldoMensal().linha" fill="none" stroke="#c084fc" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
              @if (evolucaoSaldoMensal().hojeX !== null) {
                <line
                  [attr.x1]="evolucaoSaldoMensal().hojeX"
                  [attr.x2]="evolucaoSaldoMensal().hojeX"
                  y1="0" y2="95"
                  stroke="rgba(255,255,255,0.45)" stroke-width="2" stroke-dasharray="4 4"
                  vector-effect="non-scaling-stroke"
                ></line>
              }
            </svg>
          </div>
        </div>
      }

      @if (viewAtual() === 'analytics') {
        <div class="cabecalho-pagina">
          <h2 class="titulo-pagina">Balanço Geral & Analytics</h2>
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
            <span class="analytics-metric-value" [style.color]="balancoGlobal() >= 0 ? '#34d399' : '#f87171'">R$ {{ moeda(balancoGlobal()) }}</span>
          </div>
        </div>

        <div class="card-modulo">
          <strong class="card-titulo">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
            Análise por Categoria e Tipo
          </strong>

          <div class="chips chips-analise" role="group" aria-label="Tipo de análise">
            @for (t of tiposParaAnalise; track t) {
              <button
                type="button"
                class="chip"
                [class.ativo]="tipoAnaliseSelecionado() === t"
                [attr.aria-pressed]="tipoAnaliseSelecionado() === t"
                (click)="tipoAnaliseSelecionado.set(t)"
              >{{ rotulosCurtos[t] }}</button>
            }
          </div>

          <div class="categoria-corpo">
            <div class="donut-wrap">
              <svg class="donut-svg" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="16" />
                @for (item of analisePorTipoSelecionado().itens; track item.categoria) {
                  <circle
                    cx="70" cy="70" r="60"
                    fill="none"
                    [attr.stroke]="item.cor"
                    stroke-width="16"
                    [attr.stroke-dasharray]="item.dashArray"
                    [attr.stroke-dashoffset]="item.dashOffset"
                    stroke-linecap="round"
                    transform="rotate(-90 70 70)"
                  />
                }
              </svg>
              <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none;">
                <span style="font-size: 0.78rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Total</span>
                <span style="font-size: 0.95rem; font-weight: 900; color: var(--text-primary);">R$ {{ moeda(analisePorTipoSelecionado().total) }}</span>
              </div>
            </div>

            @if (analisePorTypeItens().length > 0) {
              <div class="legend-list">
                @for (item of analisePorTypeItens(); track item.categoria) {
                  <div class="legend-item">
                    <span class="legend-dot" [style.background-color]="item.cor"></span>
                    <span class="legend-nome">{{ item.categoria }} ({{ item.percentual.toFixed(1) }}%)</span>
                    <span class="legend-valor">R$ {{ moeda(item.valor) }}</span>
                  </div>
                }
              </div>
            } @else {
              <div class="vazio" style="flex: 1; padding: 20px; font-size: 0.85rem;">Nenhum registro para este tipo.</div>
            }
          </div>
        </div>

        <div class="card-modulo">
          <strong class="card-titulo">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            Histórico Recente de Lançamentos
          </strong>
          <p class="historico-subtitulo">Últimos registros financeiros consolidados no sistema.</p>

          @if (historicoRecente().length > 0) {
            <div class="historico-lista">
              @for (h of historicoRecente(); track h.id) {
                <div class="historico-item" [style.--cor]="corTipo(h.tipo)">
                  <div class="historico-icone">
                    <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
                  </div>
                  <div class="historico-info">
                    <span class="historico-desc">{{ h.descricao }}</span>
                    <span class="historico-meta">{{ h.categoria }} · {{ h.data | date:'dd/MM/yyyy' }}</span>
                  </div>
                  <span class="historico-valor">
                    {{ sinalTipo(h.tipo) }} R$ {{ moeda(h.valor) }}
                  </span>
                </div>
              }
            </div>
          } @else {
            <div class="historico-vazio">Nenhum histórico recente disponível.</div>
          }
        </div>
      }

      @if (viewAtual() === 'lancamentos') {
        <div class="lancamentos-view">
          <div class="cabecalho-pagina">
            <h2 class="titulo-pagina">Lançamentos</h2>
          </div>

          <div class="mes-nav">
            <button type="button" class="mes-seta" (click)="mudarMes(-1)" aria-label="Mês anterior">
              <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>
            <span class="mes-nome" aria-live="polite">{{ nomeMesAtual() }}</span>
            <button type="button" class="mes-seta" (click)="mudarMes(1)" aria-label="Próximo mês">
              <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>

          <div class="filtros">
            <div class="busca-wrap">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input
                type="search"
                class="busca-input"
                [ngModel]="busca()"
                (ngModelChange)="busca.set($event)"
                placeholder="Buscar descrição ou categoria"
                aria-label="Buscar lançamentos"
              />
            </div>
            <div class="chips" role="group" aria-label="Filtrar por tipo">
              @for (c of chipsFiltro; track c.valor) {
                <button
                  type="button"
                  class="chip"
                  [class.ativo]="filtroTipo() === c.valor"
                  [attr.aria-pressed]="filtroTipo() === c.valor"
                  (click)="filtroTipo.set(c.valor)"
                >{{ c.rotulo }}</button>
              }
            </div>
          </div>

          @if (lancamentosAgrupados().length > 0) {
            @for (grupo of lancamentosAgrupados(); track grupo.chave) {
              <section class="grupo-dia">
                <h3 class="grupo-titulo">
                  {{ grupo.rotulo }}
                  <span class="grupo-qtd">{{ grupo.itens.length }}</span>
                </h3>
                <div class="grupo-lista">
                  @for (item of grupo.itens; track item.id) {
                    <div class="linha" [style.--cor]="corTipo(item.tipo)">
                      <div class="linha-info">
                        <span class="linha-desc">{{ item.descricao }}</span>
                        <span class="linha-meta">
                          <span class="linha-meta-texto">{{ item.categoria || 'Geral' }} · {{ rotuloCurto(item.tipo) }} · {{ item.data | date:'HH:mm' }}</span>
                          @if (item.statusPagamento === 'pendente') {
                            <span class="tag-pendente">Pendente</span>
                          }
                        </span>
                      </div>
                      <span class="linha-valor">{{ sinalTipo(item.tipo) }} R$ {{ moeda(item.valorRealizado) }}</span>
                      <div class="linha-acoes">
                        <button type="button" class="btn-icone editar" (click)="preencherEdicao(item)" aria-label="Editar lançamento">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </button>
                        <button type="button" class="btn-icone excluir" (click)="excluir(item.id!)" aria-label="Excluir lançamento">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></svg>
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </section>
            }
          } @else {
            @if (lancamentos().length === 0) {
              <div class="vazio">
                <p>Nenhum lançamento neste mês.</p>
                <button type="button" class="btn-primario" (click)="abrirNovoLancamento()">Adicionar lançamento</button>
              </div>
            } @else {
              <div class="vazio">
                <p>Nada encontrado com esses filtros.</p>
                <button type="button" class="btn-secundario" (click)="limparFiltros()">Limpar filtros</button>
              </div>
            }
          }
        </div>
      }
    </div>

    @if (viewAtual() === 'lancamentos' && !formularioAberto()) {
      <button type="button" class="fab" (click)="abrirNovoLancamento()" aria-label="Novo lançamento">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
      </button>
    }

    @if (formularioAberto()) {
      <div class="sheet-overlay" (click)="fecharFormulario()"></div>
      <section
        class="sheet"
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="editandoId ? 'Editar lançamento' : 'Novo lançamento'"
        (keydown.escape)="fecharFormulario()"
      >
        <div class="sheet-handle"></div>
        <header class="sheet-header">
          <h3 class="sheet-titulo">{{ editandoId ? 'Editar lançamento' : 'Novo lançamento' }}</h3>
          <button type="button" class="btn-fechar-drawer" (click)="fecharFormulario()" aria-label="Fechar">
            <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </header>

        <div class="form-grid">
          <input [(ngModel)]="novo.descricao" placeholder="Descrição (Ex: Supermercado, Aluguel...)" aria-label="Descrição" />
          <input
            type="text"
            inputmode="decimal"
            [ngModel]="novoValorTexto"
            (ngModelChange)="onValorChange($event)"
            placeholder="Valor (R$)"
            aria-label="Valor"
          />

          <div class="combo" [class.aberto]="categoriaAberta()" (keydown.escape)="fecharCategorias(); $event.stopPropagation()">
            <input
              class="combo-input"
              type="text"
              autocomplete="off"
              autocapitalize="none"
              spellcheck="false"
              [(ngModel)]="novo.categoria"
              (focus)="fecharCategorias()"
              placeholder="Categoria (digite ou toque na seta)"
              aria-label="Categoria"
            />
            <button
              type="button"
              class="combo-seta"
              [class.aberta]="categoriaAberta()"
              (click)="alternarCategorias()"
              aria-label="Mostrar categorias"
              aria-haspopup="listbox"
              [attr.aria-expanded]="categoriaAberta()"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>

            @if (categoriaAberta()) {
              <div class="combo-overlay" (click)="fecharCategorias()"></div>
              <ul class="combo-lista" role="listbox" aria-label="Categorias">
                @for (cat of categoriasPadrao; track cat) {
                  <li
                    role="option"
                    tabindex="0"
                    [class.selecionada]="novo.categoria === cat"
                    [attr.aria-selected]="novo.categoria === cat"
                    (click)="selecionarCategoria(cat)"
                    (keydown.enter)="selecionarCategoria(cat)"
                    (keydown.space)="selecionarCategoria(cat); $event.preventDefault()"
                  >{{ cat }}</li>
                }
              </ul>
            }
          </div>

          <select [(ngModel)]="novo.tipo" aria-label="Tipo de lançamento">
            <option value="entrada">Entrada (Receita)</option>
            <option value="saida">Saída (Despesa)</option>
            <option value="reserva">Reserva</option>
            <option value="investimento">Investimento</option>
            <option value="saida-reserva">Saída (Da Reserva)</option>
            <option value="saida-investimento">Saída (Dos Investimentos)</option>
          </select>
          <select [(ngModel)]="novo.statusPagamento" aria-label="Status do pagamento">
            <option value="pago">Pago / Recebido</option>
            <option value="pendente">Pendente / Aguardando</option>
          </select>
          <button type="button" class="btn-salvar" (click)="salvar()" [disabled]="operacaoEmAndamento()">
            {{ editandoId ? 'Atualizar Lançamento' : 'Salvar Novo Lançamento' }}
          </button>
        </div>
      </section>
    }

    @if (isCalculatorOpen()) {
      <div class="calc-modal-overlay" (click)="fecharCalculadora()">
        <div class="calc-modal-container" (click)="$event.stopPropagation()">
          <div class="calc-header-bar">
            <span class="calc-title-text">calcFlux</span>
            <button type="button" class="calc-close-btn" (click)="fecharCalculadora()" aria-label="Fechar">
              ✕
            </button>
          </div>
          <div style="padding: 16px;">
            <app-calculator (valueSelected)="fecharCalculadora()"></app-calculator>
          </div>
        </div>
      </div>
    }

    @if (isNotasOpen()) {
      <div class="calc-modal-overlay" (click)="fecharNotasModal()">
        <div class="notas-modal-container" (click)="$event.stopPropagation()">
          <div class="calc-header-bar">
            <span class="calc-title-text">Bloco de Notas</span>
            <button type="button" class="calc-close-btn" (click)="fecharNotasModal()" aria-label="Fechar">
              ✕
            </button>
          </div>

          <div class="notas-body-scroll">
            <div class="nota-form-card">
              <input class="input-nota" [(ngModel)]="tituloNotaInput" placeholder="Título da nota..." aria-label="Título da nota" />
              <textarea class="input-nota" [(ngModel)]="conteudoNotaInput" placeholder="Escreva sua nota aqui..." aria-label="Conteúdo da nota"></textarea>
              <button type="button" class="btn-salvar-nota" (click)="salvarNota()">
                {{ editandoNotaId ? 'Atualizar Nota' : 'Criar Nova Nota' }}
              </button>
            </div>

            @if (notas().length > 0) {
              <div class="notas-grid">
                @for (nota of notas(); track nota.id) {
                  <div class="nota-card-item" [style.--cor-destaque]="nota.cor">
                    <h4 class="nota-card-titulo">{{ nota.titulo }}</h4>
                    <p class="nota-card-texto">{{ nota.conteudo }}</p>
                    <div class="nota-card-footer">
                      <span>{{ nota.dataAtualizacao | date:'dd/MM/yyyy HH:mm' }}</span>
                      <div class="nota-acoes">
                        <button type="button" class="btn-acao-n editar" (click)="carregarEdicaoNota(nota)">Editar</button>
                        <button type="button" class="btn-acao-n excluir" (click)="excluirNota(nota.id)">Excluir</button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="vazio" style="padding: 24px; font-size: 0.85rem;">Nenhuma nota salva. Crie sua primeira nota acima!</div>
            }
          </div>
        </div>
      </div>
    }

    @if (restauracaoPendente(); as pendente) {
      <div class="calc-modal-overlay" (click)="cancelarRestauracao()">
        <div class="notas-modal-container" style="max-width: 460px;" role="dialog" aria-modal="true" aria-label="Restaurar backup" (click)="$event.stopPropagation()">
          <div class="calc-header-bar">
            <span class="calc-title-text">Restaurar backup</span>
            <button type="button" class="calc-close-btn" (click)="cancelarRestauracao()" aria-label="Fechar">✕</button>
          </div>
          <div class="modal-corpo">
            <p>
              Origem: {{ pendente.origem }}
              @if (pendente.backup.geradoEm) {
                · gerado em {{ pendente.backup.geradoEm | date:'dd/MM/yyyy HH:mm' }}
              }
            </p>
            <p>
              Contém <strong>{{ pendente.backup.lancamentos.length }}</strong> lançamentos
              e <strong>{{ pendente.backup.notas.length }}</strong> notas.
            </p>
            <p class="modal-dica">
              <strong>Mesclar</strong> adiciona só o que ainda não existe, sem duplicar.
              <strong>Substituir tudo</strong> apaga os dados atuais; antes disso o app guarda uma cópia de segurança.
            </p>
            <div class="modal-acoes">
              <button type="button" class="btn-primario" (click)="confirmarRestauracao('mesclar')" [disabled]="operacaoEmAndamento()">Mesclar</button>
              <button type="button" class="btn-secundario" (click)="confirmarRestauracao('substituir')" [disabled]="operacaoEmAndamento()">Substituir tudo</button>
              <button type="button" class="btn-secundario" (click)="cancelarRestauracao()">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    }

    @if (backupsAutomaticosAberto()) {
      <div class="calc-modal-overlay" (click)="fecharBackupsAutomaticos()">
        <div class="notas-modal-container" style="max-width: 460px;" role="dialog" aria-modal="true" aria-label="Backups automáticos" (click)="$event.stopPropagation()">
          <div class="calc-header-bar">
            <span class="calc-title-text">Backups automáticos</span>
            <button type="button" class="calc-close-btn" (click)="fecharBackupsAutomaticos()" aria-label="Fechar">✕</button>
          </div>
          <div class="modal-corpo">
            <p class="modal-dica">
              O app guarda uma cópia por dia (últimas 7) dentro dele. Elas somem se o app for
              desinstalado, então use também "Salvar backup" para guardar fora do app.
            </p>
            @for (s of listaBackups(); track s.nome) {
              <div class="snapshot-item">
                <span>{{ s.rotulo }}</span>
                <button type="button" class="btn-secundario" (click)="restaurarSnapshot(s.nome)">Restaurar</button>
              </div>
            } @empty {
              <div class="vazio" style="padding: 24px; font-size: 0.85rem;">Nenhum backup automático ainda. O primeiro é criado quando houver dados.</div>
            }
          </div>
        </div>
      </div>
    }

    <nav class="bottom-nav" role="navigation" aria-label="Navegação principal">
      <button type="button" class="nav-tab" [class.ativo]="viewAtual() === 'inicio'" (click)="irParaInicio()">
        <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
        <span class="nav-tab-label">Início</span>
      </button>

      <button type="button" class="nav-tab" [class.ativo]="viewAtual() === 'lancamentos'" (click)="irParaLancamentos()">
        <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        <span class="nav-tab-label">Lançamentos</span>
      </button>

      <button type="button" class="nav-tab" [class.ativo]="viewAtual() === 'analytics'" (click)="irParaAnalytics()">
        <svg class="svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
        <span class="nav-tab-label">Analytics</span>
      </button>
    </nav>
  `
})
export class DashboardComponent implements OnInit {
  private readonly service = inject(FinanceiroService);
  private readonly pdfExportService = inject(PdfExportService);
  private readonly excelExportService = inject(ExcelExportService);
  private readonly backupService = inject(BackupService);
  private readonly autoBackup = inject(AutoBackupService);
  private readonly notificacaoService = inject(NotificacaoService);
  private readonly notaService = inject(NotaService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly viewAtual = signal<ViewAtualExtendida>('inicio');
  readonly menuAberto = signal<boolean>(false);

  readonly isCalculatorOpen = signal<boolean>(false);
  readonly isNotasOpen = signal<boolean>(false);
  readonly formularioAberto = signal<boolean>(false);
  readonly categoriaAberta = signal<boolean>(false);

  readonly restauracaoPendente = signal<{ backup: BackupArquivo; origem: string } | null>(null);
  readonly backupsAutomaticosAberto = signal<boolean>(false);
  readonly listaBackups = signal<SnapshotInfo[]>([]);
  readonly diasSemBackupExterno = signal<number | null>(null);

  /** Avisa quando nunca houve backup fora do app ou faz 7+ dias (e já existem dados). */
  readonly mostrarAvisoBackup = computed(() => {
    const dias = this.diasSemBackupExterno();
    return this.todosLancamentos().length > 0 && (dias === null || dias >= 7);
  });
  readonly textoAvisoBackup = computed(() => {
    const dias = this.diasSemBackupExterno();
    return dias === null
      ? 'Você ainda não salvou um backup fora do app.'
      : `Faz ${dias} dias que você não salva um backup fora do app.`;
  });
  readonly valoresOcultos = signal<boolean>(this.lerPreferenciaOculto());

  readonly notas = this.notaService.notas;
  tituloNotaInput = '';
  conteudoNotaInput = '';
  editandoNotaId: string | null = null;

  readonly lancamentos = signal<Lancamento[]>([]);
  readonly todosLancamentos = signal<Lancamento[]>([]);
  readonly tipoAnaliseSelecionado = signal<TipoLancamentoFinanceiro>('saida');
  readonly filtroTipo = signal<string>('todos');
  readonly busca = signal<string>('');
  editandoId: number | null = null;
  readonly operacaoEmAndamento = signal<boolean>(false);

  readonly mesAtual = signal<string>(this.obterMesCorrente());
  readonly nomeMesAtual = computed(() => this.formatarNomeMes(this.mesAtual()));

  novoValorTexto = '';
  novo: Lancamento & { tipo: TipoLancamentoFinanceiro } = this.criarLancamentoVazio();

  readonly categoriasPadrao: readonly string[] = [
    'salario',
    'supermercado',
    'dentista',
    'aluguel',
    'farmacia',
    'corte de cabelo',
    'cosmedico',
    'uber',
    'pix',
    'cartão de crédito',
    'Reserva',
    'Investimento'
  ];

  readonly tiposParaAnalise: TipoLancamentoFinanceiro[] = [
    'saida',
    'entrada',
    'reserva',
    'investimento',
    'saida-reserva' as TipoLancamentoFinanceiro,
    'saida-investimento' as TipoLancamentoFinanceiro
  ];

  readonly rotulosCurtos: Record<string, string> = {
    entrada: 'Entradas',
    saida: 'Saídas',
    reserva: 'Reservas',
    investimento: 'Investimentos',
    'saida-reserva': 'Saída da reserva',
    'saida-investimento': 'Saída de invest.'
  };

  readonly chipsFiltro: readonly ChipFiltro[] = [
    { valor: 'todos', rotulo: 'Todos' },
    { valor: 'entrada', rotulo: 'Entradas' },
    { valor: 'saida', rotulo: 'Saídas' },
    { valor: 'reserva', rotulo: 'Reservas' },
    { valor: 'investimento', rotulo: 'Investimentos' },
    { valor: 'saida-reserva', rotulo: 'Saída da reserva' },
    { valor: 'saida-investimento', rotulo: 'Saída de invest.' }
  ];

  private readonly rotulosUnitarios: Record<string, string> = {
    entrada: 'Entrada',
    saida: 'Saída',
    reserva: 'Reserva',
    investimento: 'Investimento',
    'saida-reserva': 'Saída da reserva',
    'saida-investimento': 'Saída de invest.'
  };

  private readonly coresPorTipo: Record<string, string> = {
    entrada: '#34d399',
    saida: '#f87171',
    reserva: '#c084fc',
    investimento: '#38bdf8',
    'saida-reserva': '#f87171',
    'saida-investimento': '#f87171'
  };

  private readonly paletaCoresCategoria: readonly string[] = [
    '#8b5cf6', '#38bdf8', '#34d399', '#f59e0b', '#ec4899',
    '#6366f1', '#14b8a6', '#f43f5e', '#a3e635', '#fb923c'
  ];
  private readonly circunferenciaDonut = 2 * Math.PI * 60;

  private readonly resumoMes = computed(() => this.service.calcularResumo(this.lancamentos()));
  readonly totalEntradas = computed(() => this.resumoMes().entradas);
  readonly totalDespesas = computed(() => this.resumoMes().despesas);
  readonly totalGastosMes = computed(() => this.resumoMes().despesas);
  readonly totalReservaMes = computed(() => this.resumoMes().reservas);
  readonly totalInvestimentoMes = computed(() => this.resumoMes().investimentos);
  readonly saldoReal = computed(() => this.resumoMes().saldoReal);

  /**
   * Reserva e Investimentos são acumulativos: o card mostra tudo que foi guardado
   * até o mês selecionado (inclusive), descontando as saídas da reserva/investimento.
   * Só entram lançamentos pagos; pendentes ficam de fora até serem pagos.
   * Para contar também os pendentes, remova a linha do "continue" sobre statusPagamento.
   */
  private readonly acumuladoAteMes = computed(() => {
    const limite = this.mesAtual();
    let reserva = 0;
    let investimento = 0;

    for (const l of this.todosLancamentos()) {
      if (l.statusPagamento === 'pendente') continue;
      if (this.chaveMes(l.data) > limite) continue;

      const tipo: string = l.tipo;
      const valor = Number(l.valorRealizado) || 0;

      switch (tipo) {
        case 'reserva': reserva += valor; break;
        case 'saida-reserva': reserva -= valor; break;
        case 'investimento': investimento += valor; break;
        case 'saida-investimento': investimento -= valor; break;
      }
    }

    return { reserva, investimento };
  });
  readonly totalReservaAcumulada = computed(() => this.acumuladoAteMes().reserva);
  readonly totalInvestimentoAcumulado = computed(() => this.acumuladoAteMes().investimento);

  /**
   * Diagnóstico relativo à renda do mês (e não a valores fixos em reais).
   * Limites: até 60% da renda gasta = tranquilo; até 85% = alerta; acima disso (ou saldo negativo) = crítico.
   */
  readonly statusConfig = computed(() => {
    const entradas = this.totalEntradas();
    const gastos = this.totalGastosMes();
    const saldo = this.saldoReal();

    if (entradas <= 0 && gastos <= 0) {
      return { label: 'Sem movimentações neste mês', textColor: '#cbd5e1', bgColor: 'rgba(51, 65, 85, 0.4)', borderColor: 'rgba(148, 163, 184, 0.4)', dotColor: '#94a3b8' };
    }

    if (entradas <= 0) {
      return { label: 'Crítico (gastos sem nenhuma entrada)', textColor: '#f87171', bgColor: 'rgba(127, 29, 29, 0.4)', borderColor: 'rgba(248, 113, 113, 0.4)', dotColor: '#f87171' };
    }

    const comprometido = (gastos / entradas) * 100;
    const pct = Math.round(comprometido);

    if (saldo < 0 || comprometido > 85) {
      return { label: `Crítico (${pct}% da renda gasta)`, textColor: '#f87171', bgColor: 'rgba(127, 29, 29, 0.4)', borderColor: 'rgba(248, 113, 113, 0.4)', dotColor: '#f87171' };
    }
    if (comprometido > 60) {
      return { label: `Alerta (${pct}% da renda gasta)`, textColor: '#fbbf24', bgColor: 'rgba(120, 53, 15, 0.4)', borderColor: 'rgba(251, 191, 36, 0.4)', dotColor: '#fbbf24' };
    }
    return { label: `Tranquilo (${pct}% da renda gasta)`, textColor: '#34d399', bgColor: 'rgba(6, 78, 59, 0.4)', borderColor: 'rgba(52, 211, 153, 0.4)', dotColor: '#34d399' };
  });

  private readonly resumoGlobal = computed(() => this.service.calcularResumo(this.todosLancamentos()));
  readonly totalGlobalEntradas = computed(() => this.resumoGlobal().entradas);
  readonly totalGlobalSaidas = computed(() => this.resumoGlobal().despesas);
  readonly balancoGlobal = computed(() => this.totalGlobalEntradas() - this.totalGlobalSaidas());

  readonly lancamentosFiltrados = computed<Lancamento[]>(() => {
    const tipo = this.filtroTipo();
    const termo = this.normalizar(this.busca());

    return this.lancamentos().filter(l => {
      if (tipo !== 'todos' && l.tipo !== tipo) return false;
      if (!termo) return true;
      return this.normalizar(`${l.descricao} ${l.categoria ?? ''}`).includes(termo);
    });
  });

  readonly lancamentosAgrupados = computed<GrupoDia[]>(() => {
    const ordenados = [...this.lancamentosFiltrados()].sort(
      (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );
    const grupos = new Map<string, GrupoDia>();

    for (const item of ordenados) {
      const data = new Date(item.data);
      const chave = this.chaveDia(data);
      let grupo = grupos.get(chave);
      if (!grupo) {
        grupo = { chave, rotulo: this.rotuloDia(data), itens: [] };
        grupos.set(chave, grupo);
      }
      grupo.itens.push(item);
    }

    return [...grupos.values()];
  });

  readonly analisePorTipoSelecionado = computed<AnaliseTipoResultado>(() => {
    const tipoAlvo = this.tipoAnaliseSelecionado();
    const filtrados = this.lancamentos().filter(l => l.tipo === tipoAlvo);
    const mapa = new Map<string, { valor: number; quantidade: number }>();

    for (const item of filtrados) {
      const cat = (item.categoria || 'Geral').trim();
      const val = Number(item.valorRealizado) || 0;
      const atual = mapa.get(cat) ?? { valor: 0, quantidade: 0 };
      mapa.set(cat, { valor: atual.valor + val, quantidade: atual.quantidade + 1 });
    }

    let totalGeral = 0;
    for (const data of mapa.values()) {
      totalGeral += data.valor;
    }

    const ordenados = [...mapa.entries()].sort((a, b) => b[1].valor - a[1].valor);
    const itensCalculados: ItemDonut[] = [];
    let acumuladoOffset = 0;

    for (const [cat, data] of ordenados) {
      const percentual = totalGeral > 0 ? (data.valor / totalGeral) * 100 : 0;
      const comprimentoTraco = totalGeral > 0 ? (data.valor / totalGeral) * this.circunferenciaDonut : 0;

      itensCalculados.push({
        categoria: cat,
        valor: data.valor,
        quantidade: data.quantidade,
        percentual,
        cor: this.corDaCategoria(cat),
        iconeSvg: '',
        dashArray: `${comprimentoTraco} ${this.circunferenciaDonut}`,
        dashOffset: -acumuladoOffset
      });

      acumuladoOffset += comprimentoTraco;
    }

    return {
      itens: itensCalculados,
      total: totalGeral,
      quantidadeTotal: filtrados.length
    };
  });

  readonly analisePorTypeItens = computed(() => this.analisePorTipoSelecionado().itens);

  readonly historicoRecente = computed<HistoricoItem[]>(() => {
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

  readonly evolucaoSaldoMensal = computed<EvolucaoSaldo>(() => {
    const registros = this.lancamentos();
    const mes = this.mesAtual();
    const largura = 680;
    const altura = 95;
    const ehMesCorrente = mes === this.obterMesCorrente();
    const rotuloAtual = ehMesCorrente ? 'Hoje' : 'Fim do mês';

    if (!/^\d{4}-\d{2}$/.test(mes) || registros.length === 0) {
      const base = `M0,${altura / 2} L${largura},${altura / 2}`;
      return {
        linha: base,
        area: `${base} L${largura},${altura} L0,${altura} Z`,
        menor: 0,
        maior: 0,
        saldoAtual: 0,
        rotuloAtual,
        hojeX: null
      };
    }

    const [ano, numeroMes] = mes.split('-').map(Number);
    const dias = new Date(ano, numeroMes, 0).getDate();
    const acumulados: number[] = new Array(dias).fill(0);

    for (const r of registros) {
      if (r.statusPagamento !== 'pago') continue;
      const dia = new Date(r.data).getDate() - 1;
      if (dia >= 0 && dia < dias) {
        const valor = Number(r.valorRealizado) || 0;
        acumulados[dia] += r.tipo === 'entrada' ? valor : -valor;
      }
    }

    let corrente = 0;
    const saldos = acumulados.map(v => (corrente += v));
    const min = Math.min(...saldos, 0);
    const max = Math.max(...saldos, 0);
    const amplitude = (max - min) || 1;
    const passoX = largura / ((dias - 1) || 1);
    const pontos = saldos.map((v, i) => ({ x: i * passoX, y: altura - ((v - min) / amplitude) * altura }));
    const linha = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    const indiceAtual = ehMesCorrente ? Math.min(new Date().getDate() - 1, dias - 1) : dias - 1;

    return {
      linha,
      area: `${linha} L${largura},${altura} L0,${altura} Z`,
      menor: Math.min(...saldos),
      maior: Math.max(...saldos),
      saldoAtual: saldos[indiceAtual] ?? 0,
      rotuloAtual,
      hojeX: ehMesCorrente ? indiceAtual * passoX : null
    };
  });

  async ngOnInit(): Promise<void> {
    this.atualizarAvisoBackup();
    await Promise.all([this.carregar(), this.carregarTodosLancamentos()]);
  }

  formatarMoeda(valor: number | null | undefined): string {
    const n = Number(valor);
    if (!Number.isFinite(n)) return '0,00';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Valor para exibição: respeita o modo "ocultar valores". */
  moeda(valor: number | null | undefined): string {
    return this.valoresOcultos() ? '•••••' : this.formatarMoeda(valor);
  }

  formatarNomeMes(anoMes: string): string {
    if (!/^\d{4}-\d{2}$/.test(anoMes)) return anoMes;
    const [ano, mes] = anoMes.split('-').map(Number);
    const nome = new Date(ano, mes - 1, 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    return nome.charAt(0).toUpperCase() + nome.slice(1).replace(' de ', ' ');
  }

  corTipo(tipo: string): string {
    return this.coresPorTipo[tipo] ?? '#94a3b8';
  }

  rotuloCurto(tipo: string): string {
    return this.rotulosUnitarios[tipo] ?? tipo;
  }

  sinalTipo(tipo: string): string {
    return tipo === 'entrada' ? '+' : '-';
  }

  alternarValoresOcultos(): void {
    const novoValor = !this.valoresOcultos();
    this.valoresOcultos.set(novoValor);
    try {
      localStorage.setItem('fluxnexis:valores-ocultos', novoValor ? '1' : '0');
    } catch {
      // armazenamento indisponível: a preferência vale só para esta sessão
    }
  }

  onValorChange(v: string): void {
    this.novoValorTexto = v;
    const limpo = v.replace(/\./g, '').replace(',', '.').trim();
    const n = parseFloat(limpo);
    this.novo.valorRealizado = Number.isFinite(n) ? n : 0;
  }

  alternarMenu(): void { this.menuAberto.update(v => !v); }
  fecharMenu(): void { this.menuAberto.set(false); }

  alternarCategorias(): void { this.categoriaAberta.update(v => !v); }
  fecharCategorias(): void { this.categoriaAberta.set(false); }

  selecionarCategoria(categoria: string): void {
    this.novo.categoria = categoria;
    this.categoriaAberta.set(false);
  }

  limparFiltros(): void {
    this.filtroTipo.set('todos');
    this.busca.set('');
  }

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
    this.registrarSnapshot();
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
      this.registrarSnapshot();
      this.cdr.markForCheck();
    }
  }

  irParaInicio(): void { this.viewAtual.set('inicio'); this.fecharMenu(); }
  irParaLancamentos(): void { this.viewAtual.set('lancamentos'); this.fecharMenu(); }
  irParaAnalytics(): void { this.viewAtual.set('analytics'); this.fecharMenu(); }

  async carregar(): Promise<void> {
    const mes = this.mesAtual();
    if (!/^\d{4}-\d{2}$/.test(mes)) {
      this.lancamentos.set([]);
      return;
    }
    const lista = await firstValueFrom(this.service.listarPorMes(mes));
    // Se o mês mudou durante a espera, descarta a resposta antiga.
    if (mes !== this.mesAtual()) return;
    this.lancamentos.set(lista);
    this.cdr.markForCheck();
  }

  async carregarTodosLancamentos(): Promise<void> {
    const lista = await firstValueFrom(this.service.listar());
    this.todosLancamentos.set(lista);
    this.registrarSnapshot();
    this.cdr.markForCheck();
  }

  async selecionarMes(m: string): Promise<void> {
    this.mesAtual.set(m);
    await this.carregar();
  }

  async mudarMes(delta: number): Promise<void> {
    const atual = /^\d{4}-\d{2}$/.test(this.mesAtual()) ? this.mesAtual() : this.obterMesCorrente();
    const [ano, mes] = atual.split('-').map(Number);
    const data = new Date(ano, mes - 1 + delta, 1);
    const novoMes = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    await this.selecionarMes(novoMes);
  }

  abrirNovoLancamento(): void {
    this.novo = this.criarLancamentoVazio();
    this.novoValorTexto = '';
    this.editandoId = null;
    this.categoriaAberta.set(false);
    this.formularioAberto.set(true);
  }

  fecharFormulario(): void {
    this.categoriaAberta.set(false);
    this.formularioAberto.set(false);
    if (this.editandoId) {
      this.novo = this.criarLancamentoVazio();
      this.novoValorTexto = '';
      this.editandoId = null;
    }
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

    this.operacaoEmAndamento.set(true);
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
      this.categoriaAberta.set(false);
      this.formularioAberto.set(false);
      await Promise.all([this.carregar(), this.carregarTodosLancamentos()]);
    } finally {
      this.operacaoEmAndamento.set(false);
      this.cdr.markForCheck();
    }
  }

  preencherEdicao(item: Lancamento): void {
    this.editandoId = item.id ?? null;
    this.novo = { ...item, tipo: item.tipo as TipoLancamentoFinanceiro };
    this.novoValorTexto = this.formatarMoeda(item.valorRealizado);
    this.categoriaAberta.set(false);
    this.formularioAberto.set(true);
    if (this.viewAtual() !== 'lancamentos') {
      this.viewAtual.set('lancamentos');
      this.fecharMenu();
    }
  }

  async excluir(id: number): Promise<void> {
    if (confirm('Deseja realmente excluir este lançamento?')) {
      await firstValueFrom(this.service.deletar(id));
      await Promise.all([this.carregar(), this.carregarTodosLancamentos()]);
    }
  }

  gerarPDF(): void {
    const mes = this.mesAtual();
    this.pdfExportService.exportar(this.lancamentos(), this.formatarNomeMes(mes), mes);
    this.fecharMenu();
  }

  exportarExcel(): void {
    this.excelExportService.exportar(this.lancamentos(), this.mesAtual());
    this.fecharMenu();
  }

  /** Gera o arquivo de backup e abre o compartilhar do Android (Drive, WhatsApp, Arquivos...). */
  async exportarBackup(): Promise<void> {
    this.fecharMenu();
    this.operacaoEmAndamento.set(true);
    try {
      await this.backupService.compartilhar(this.todosLancamentos(), this.notas());
      this.atualizarAvisoBackup();
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message.toLowerCase() : '';
      if (!mensagem.includes('cancel')) {
        this.notificacaoService.avisar('Não foi possível gerar o backup.');
      }
    } finally {
      this.operacaoEmAndamento.set(false);
      this.cdr.markForCheck();
    }
  }

  /** Lê o arquivo escolhido e abre a confirmação (mesclar ou substituir). */
  async importarBackup(e: Event): Promise<void> {
    this.fecharMenu();
    try {
      const backup = await this.backupService.lerArquivo(e);
      if (backup) {
        this.restauracaoPendente.set({ backup, origem: 'arquivo' });
      }
    } catch (erro) {
      this.notificacaoService.avisar(
        erro instanceof Error && erro.message ? erro.message : 'Falha ao ler o arquivo de backup.'
      );
    }
    this.cdr.markForCheck();
  }

  async confirmarRestauracao(modo: ModoRestauracao): Promise<void> {
    const pendente = this.restauracaoPendente();
    if (!pendente) return;

    this.operacaoEmAndamento.set(true);
    try {
      const resultado = await this.backupService.restaurar(pendente.backup, modo);
      this.restauracaoPendente.set(null);
      this.notificacaoService.avisar(
        `Restaurado: ${resultado.lancamentos} lançamentos e ${resultado.notas} notas.`
      );
      await Promise.all([this.carregar(), this.carregarTodosLancamentos()]);
    } catch {
      this.notificacaoService.avisar('Falha ao restaurar backup. Nada foi apagado.');
    } finally {
      this.operacaoEmAndamento.set(false);
      this.cdr.markForCheck();
    }
  }

  cancelarRestauracao(): void {
    this.restauracaoPendente.set(null);
  }

  async abrirBackupsAutomaticos(): Promise<void> {
    this.fecharMenu();
    this.listaBackups.set(await this.autoBackup.listar());
    this.backupsAutomaticosAberto.set(true);
  }

  fecharBackupsAutomaticos(): void {
    this.backupsAutomaticosAberto.set(false);
  }

  async restaurarSnapshot(nome: string): Promise<void> {
    try {
      const backup = await this.backupService.lerSnapshot(nome);
      this.backupsAutomaticosAberto.set(false);
      this.restauracaoPendente.set({ backup, origem: 'backup automático' });
    } catch {
      this.notificacaoService.avisar('Não foi possível ler esse backup.');
    }
  }

  /** Agenda o snapshot diário automático (vários pedidos seguidos viram um só). */
  private registrarSnapshot(): void {
    this.autoBackup.agendar(() =>
      this.backupService.montarBackup(this.todosLancamentos(), this.notas())
    );
  }

  private atualizarAvisoBackup(): void {
    const ultimo = this.backupService.ultimoBackupExterno();
    this.diasSemBackupExterno.set(
      ultimo ? Math.floor((Date.now() - ultimo.getTime()) / 86_400_000) : null
    );
  }

  private lerPreferenciaOculto(): boolean {
    try {
      return localStorage.getItem('fluxnexis:valores-ocultos') === '1';
    } catch {
      return false;
    }
  }

  /** Mês local (YYYY-MM). toISOString() usa UTC e virava o mês cedo demais à noite no Brasil. */
  private obterMesCorrente(): string {
    const agora = new Date();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    return `${agora.getFullYear()}-${mes}`;
  }

  private chaveMes(dataIso: string): string {
    const data = new Date(dataIso);
    return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
  }

  private chaveDia(data: Date): string {
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${data.getFullYear()}-${mes}-${dia}`;
  }

  private rotuloDia(data: Date): string {
    const hoje = new Date();
    const ontem = new Date();
    ontem.setDate(hoje.getDate() - 1);

    const chave = this.chaveDia(data);
    if (chave === this.chaveDia(hoje)) return 'Hoje';
    if (chave === this.chaveDia(ontem)) return 'Ontem';

    const texto = data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  private normalizar(texto: string): string {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /** Cor determinística por nome: mantém o computed puro (sem mutar Map dentro dele). */
  private corDaCategoria(categoria: string): string {
    let hash = 0;
    for (let i = 0; i < categoria.length; i++) {
      hash = (hash * 31 + categoria.charCodeAt(i)) | 0;
    }
    return this.paletaCoresCategoria[Math.abs(hash) % this.paletaCoresCategoria.length];
  }

  private criarLancamentoVazio(): Lancamento & { tipo: TipoLancamentoFinanceiro } {
    return {
      descricao: '',
      valorRealizado: 0,
      valorPrevisto: 0,
      divisao: '' as unknown as DivisaoLancamento,
      categoria: '',
      tipo: 'saida' as TipoLancamentoFinanceiro,
      statusPagamento: 'pago' as const,
      data: new Date().toISOString()
    };
  }
}