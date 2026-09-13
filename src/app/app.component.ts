// src/app/app.component.ts
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { db } from './services/db.service';
import { Filesystem, Directory } from '@capacitor/filesystem';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'app';

  async ngOnInit(): Promise<void> {
    await this.verificarRestauracaoAutomatica();
  }

  private async verificarRestauracaoAutomatica(): Promise<void> {
    try {
      const totalLancamentos = await db.lancamentos.count();

      if (totalLancamentos === 0) {
        const arquivo = await Filesystem.readFile({
          path: 'FluxNeis_Backup_Automatico.json',
          directory: Directory.Data
        });

        if (arquivo.data) {
          const conteudo = typeof arquivo.data === 'string' ? arquivo.data : JSON.stringify(arquivo.data);
          const dados = JSON.parse(conteudo);
          
          if (dados.lancamentos && Array.isArray(dados.lancamentos) && dados.lancamentos.length > 0) {
            const lancamentosLimpos = dados.lancamentos.map(({ id, ...rest }: any) => rest);
            await db.lancamentos.bulkAdd(lancamentosLimpos);
            console.log('Histórico restaurado com sucesso do backup automático.');
          }
        }
      }
    } catch (e) {
      console.log('Nenhum backup automático anterior encontrado ou falha na leitura.', e);
    }
  }
}