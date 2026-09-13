import { Injectable } from '@angular/core';

/**
 * Encapsula alert()/confirm() nativos atrás de uma interface injetável.
 *
 * Trade-off assumido de propósito: isto NÃO resolve UX (ainda bloqueia
 * a thread principal, ainda tem cara dos anos 2000). Resolve
 * testabilidade — dá pra mockar em spec sem sobrescrever window global.
 * Trocar a implementação por um modal custom no futuro é mudança
 * isolada nesta classe, zero componente consumidor precisa mudar.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificacaoService {

  avisar(mensagem: string): void {

    window.alert(mensagem);

  }

  confirmar(mensagem: string): boolean {

    return window.confirm(mensagem);

  }

}