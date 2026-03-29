import { Game } from "./GameManager.js";
import { Cargo } from "../Player/Cargo.js";
import { PartidaDAO } from "../DAOs/PartidaDAO.js";
import { ActionDAO } from "../DAOs/ActionDAO.js";
import { OfertaDAO } from "../DAOs/OfertaDAO.js";
import { AlertaDAO } from "../DAOs/AlertaDAO.js";
import { HabilidadeDAO } from "../DAOs/HabilidadeDAO.js";
import { Player } from "../Player/Player.js";
import { Action } from "../Player/Action.js";
import { RegrasHabilidades } from "../Player/Habilidades/habilidades.js";
import { HabilidadeDinamica } from "../Player/Habilidades/HabilidadeDinamica.js";
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

    public async executarActions() {
        const partida = await PartidaDAO.getPartida(this.guildId);
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${this.guildId}`);
            return;
        }
        
        await this.checkOfertas();
        
        const actions = await ActionDAO.getActionsByEtapa(this.guildId, partida.etapaAtual);
        if (!actions || actions.length === 0) {
            console.log(`Nenhuma ação registrada para a etapa ${partida.etapaAtual}.`);
            return;
        }
        
        actions.sort((a, b) => {
            const habA = this.getHabilidadeInstance(a.habilidade.nome, a.habilidade.id)?.getPrioridade() || 0;
            const habB = this.getHabilidadeInstance(b.habilidade.nome, b.habilidade.id)?.getPrioridade() || 0;
            return habB - habA;
        });
        
        for (const action of actions) {
            const player = await this.game.getPlayerManager().loadPlayer(action.userId);
            const habilidade = player?.getHabilidades()?.find(h => h.getId() === action.habilidadeId);
            if (!player || !habilidade) {
                console.error(`Player/Habilidade não encontrado ${action.userId}`);
                continue;
            }

            if (habilidade.getTipo() === "Instantanea") {
                continue;
            }
            
            if (habilidade.getStatus() === "IMPEDIDA") {
                console.log(`Habilidade ${habilidade.getNome()} do jogador ${player.getUserId()} foi impedida e não pode ser usada.`);
                continue;
            }
            
            const sucesso = await habilidade.ativarHabilidade(this.game, new Action(action))
            await ActionDAO.updateAction(action.id, { sucesso: sucesso ? "SUCEDIDA" : "FALHA"});
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
        await AlertaDAO.createAlerta(this.guildId, user.getId(), await this.game.getEtapaAtual(), alerta)
    }

    public async criarAction(userId: string, habilidadeId: string, tipo: string, alvos?: Player[], parametros?: string): Promise<Action> {
        const alvosIds = alvos?.map(a => a.getUserId());
        console.log(`Criando action: User ${userId}, Habilidade ${habilidadeId}, Tipo ${tipo}, Alvos ${alvosIds}, Parametros ${parametros}`);
        const action = await ActionDAO.createAction(userId, this.guildId, tipo, await this.game.getEtapaAtual(), habilidadeId, alvosIds || [], parametros);
        return new Action(action!);
    }

    public async criarOferta(emissorId: string, alvo: Player, habilidade: HabilidadeDinamica, nomeOferta: string, item?: string, parametros?: string): Promise<void> {
        const alvoId = alvo.getId();

        console.log(`Criando oferta: Emissor ${emissorId}, Alvo ${alvoId}, Habilidade ${habilidade.getNome()}, Oferta ${nomeOferta}, Item ${item}, Parametros ${parametros}`);
        await OfertaDAO.createOferta(this.guildId, emissorId, alvoId, habilidade.getNome(), await this.game.getEtapaAtual(), nomeOferta, item, parametros);
    }

    public getCargoInstance(nomeDoCargo: string, habilidadesCarregadas?: HabilidadeDinamica[]): Cargo | null {
        const defCargo = CargosDoJogo[nomeDoCargo];
        if (!defCargo) return null;

        let habilidadesDoCargo: HabilidadeDinamica[] = [];

        if (habilidadesCarregadas && habilidadesCarregadas.length > 0) {
            habilidadesDoCargo = habilidadesCarregadas;
        } 

        // se for no inicio do jogo, instanciamos as habilidades iniciais
        else {
            for (const nomeHab of defCargo.habilidadesIniciais) {
                const regraJSON = RegrasHabilidades[nomeHab]; // Pega a regraSnipe, etc
                if (regraJSON) {
                    habilidadesDoCargo.push(new HabilidadeDinamica(regraJSON));
                }
            }
        }

        return new Cargo(defCargo, habilidadesDoCargo);
    }

    public getHabilidadeInstance(nomeDaHabilidade: string, id?: string, usos?: number, status?: string): HabilidadeDinamica | null {
        const regraJSON = RegrasHabilidades[nomeDaHabilidade];
        if (!regraJSON) return null;

        const hab = new HabilidadeDinamica(regraJSON, usos, status);
        if (id) hab.setId(id);
        console.log(`Instanciando habilidade ${nomeDaHabilidade} com ID ${hab.getId()}, usos ${usos}, status ${status}`);
        
        return hab;
    }
}