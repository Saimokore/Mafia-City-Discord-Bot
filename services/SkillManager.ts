import { Game } from "./GameManager.js";
import { Cargo } from "../Player/Cargo.js";
import { PartidaDAO } from "../src/daos/PartidaDAO.js";
import { ActionDAO } from "../src/daos/ActionDAO.js";
import { OfertaDAO } from "../src/daos/OfertaDAO.js";
import { AlertaDAO } from "../src/daos/AlertaDAO.js";
import { HabilidadeDAO } from "../src/daos/HabilidadeDAO.js";
import { Player } from "../Player/Player.js";
import { Action } from "../Player/Action.js";
import { RegrasHabilidades } from "../Player/Habilidades/habilidades.js";
import { HabilidadeDinamica } from "../domain/skills/HabilidadeDinamica.js";
import { CargosDoJogo } from "../Player/Habilidades/cargos.js";

export class SkillManager {
    private guildId: string;
    private game: Game;

    private batchHabilidades: Map<string, any>;
    
    constructor(guildId: string, game: Game) {
        this.game = game;
        this.guildId = guildId;
        this.batchHabilidades = new Map();
    }

    public async executarGatilhos() {
        const partida = await PartidaDAO.getPartida(this.guildId);
        if (!partida) return;
        
        await this.checkOfertas();
        
        const rawGatilhos = await ActionDAO.getGatilhosPendentes(partida.id, partida.etapaAtual);
        if (!rawGatilhos || rawGatilhos.length === 0) {
            console.log(`Nenhum gatilho registrado para a etapa ${partida.etapaAtual}.`);
            return;
        }
        
        for (const rawGatilho of rawGatilhos) {
            
            const gatilhoObj = new Action(rawGatilho);

            const player = await this.game.getPlayerManager().loadPlayer(gatilhoObj.getDonoId());
            
            let habilidade: HabilidadeDinamica | undefined;
            if (gatilhoObj.getHabilidadeId()) {
                habilidade = player?.getHabilidades()?.find(h => h.getId() === gatilhoObj.getHabilidadeId());
            }

            if (!player) continue;

            if (habilidade) {
                if (habilidade.getTipo() === "Instantanea") continue;
                
                if (habilidade.getStatus() === "IMPEDIDA") {
                    console.log(`Habilidade ${habilidade.getNome()} bloqueada. Cancelando gatilho.`);
                    await ActionDAO.marcarComoProcessado(gatilhoObj.getId());
                    continue;
                }
                
                await habilidade.ativar(this.game, gatilhoObj, gatilhoObj.getTipo());
            } else {
                // é gatilho de sistema
            }

            await ActionDAO.marcarComoProcessado(gatilhoObj.getId());
        }
    }

    public async updateHabilidade(habilidade: HabilidadeDinamica, updates: any) {
        
        if (updates.uso !== undefined) habilidade.setUso(updates.uso);
        if (updates.status !== undefined) habilidade.setStatus(updates.status);


        if (!this.game.isTransicaoEtapa()) {
            await HabilidadeDAO.updateHabilidade(habilidade.getId()!, updates);
            return;
        }

        const id = habilidade.getId()!;
        const atual = this.batchHabilidades.get(id) || {};
        this.batchHabilidades.set(id, { ...atual, ...updates });
    }

    public async commitBatch() {
        if (this.batchHabilidades.size === 0) return;
        
        console.log(`[DB] Salvando ${this.batchHabilidades.size} habilidades simultaneamente...`);
        
        const promises = Array.from(this.batchHabilidades.entries()).map(([id, updates]) => {
            return HabilidadeDAO.updateHabilidade(id, updates);
        });

        await Promise.all(promises);
        this.batchHabilidades.clear();
    }
    
    public async checkOfertas(): Promise<void> {
        const ofertas = await OfertaDAO.getOfertas(this.guildId);
        if (!ofertas || ofertas.length === 0) {
            console.error("Ofertas não encontradas");
            return;
        }
        for (const oferta of ofertas) {
            if (oferta.etapa == await this.game.getEtapaAtual() - 1) {
                const habilidade = await this.game.getPlayerManager().getHabilidadePlayer(oferta.emissorId, oferta.habilidadeId);
                if (!habilidade) continue;
                
                await habilidade.resolverOferta(this.game, oferta.id, oferta.status === "ACEITA" ? "ACEITA" : "RECUSADA");
            }
        }
    }

    public async criarAlerta(user: Player, alerta: string) {
        if (this.game.getIsTeste()) return;

        await AlertaDAO.createAlerta(this.guildId, user.getUserId(), await this.game.getEtapaAtual(), alerta)
    }

    public async criarGatilho(donoId: string, tipoGatilho: string, habilidadeId?: string, payload?: any, prioridade: number = 0) {
        const partida = await PartidaDAO.getPartida(this.guildId);
        if (!partida) return null;

        console.log(`Criando Gatilho: Dono ${donoId}, Hab ${habilidadeId}, Tipo ${tipoGatilho}`);
        
        return await ActionDAO.criarGatilho(
            partida.id,
            donoId,
            await this.game.getEtapaAtual(),
            tipoGatilho,
            prioridade,
            payload || {},
            habilidadeId
        );
    }

    public async criarOferta(emissorId: string, alvo: Player, habilidade: HabilidadeDinamica, nomeOferta: string, item?: string, parametros?: string): Promise<void> {
        const alvoId = alvo.getId();

        console.log(`Criando oferta: Emissor ${emissorId}, Alvo ${alvoId}, Habilidade ${habilidade.getNome()}, Oferta ${nomeOferta}, Item ${item}, Parametros ${parametros}`);
        await OfertaDAO.createOferta(this.guildId, emissorId, alvoId, habilidade.getId()!, await this.game.getEtapaAtual(), nomeOferta, item, parametros);
    }

    public getCargoInstance(nomeDoCargo: string, habilidadesCarregadas?: HabilidadeDinamica[]): Cargo | null {
        const defCargo = CargosDoJogo[nomeDoCargo.toUpperCase()];
        if (!defCargo) return null;

        let habilidadesDoCargo: HabilidadeDinamica[] = [];

        if (habilidadesCarregadas && habilidadesCarregadas.length > 0) {
            console.log(`Usando habilidades carregadas para o cargo ${nomeDoCargo}...`);
            habilidadesDoCargo = habilidadesCarregadas;
        } else {
            console.log(`Carregando habilidades para o cargo ${nomeDoCargo}...`);
            for (const nomeHab of defCargo.habilidadesIniciais) {
                const regraJSON = RegrasHabilidades[nomeHab.toUpperCase()]; // Pega a regraSnipe, etc
                if (regraJSON) {
                    habilidadesDoCargo.push(new HabilidadeDinamica(regraJSON));
                }
            }
        }

        return new Cargo(defCargo, habilidadesDoCargo);
    }

    public getHabilidadeInstance(nomeDaHabilidade: string, id?: string, usos?: number, status?: string,): HabilidadeDinamica | null {
        const regraJSON = RegrasHabilidades[nomeDaHabilidade.toUpperCase()];
        if (!regraJSON) return null;

        const hab = new HabilidadeDinamica(regraJSON, usos, status);
        if (id) hab.setId(id);
        console.log(`Instanciando habilidade ${nomeDaHabilidade} com ID ${hab.getId()}, usos ${usos}, status ${status}`);
        
        return hab;
    }
}