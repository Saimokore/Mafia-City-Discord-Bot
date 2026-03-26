import { Game } from "./GameManager.js";
import { AtiradorDeElite, Cargo, Evangelista } from "../Player/Cargo.js";
import * as Hab from "../Player/Habilidade.js";
import * as Class from "../Player/Classe.js";
import { PartidaDAO } from "../DAOs/PartidaDAO.js";
import { ActionDAO } from "../DAOs/ActionDAO.js";
import { OfertaDAO } from "../DAOs/OfertaDAO.js";
import { AlertaDAO } from "../DAOs/AlertaDAO.js";
import { Evangelho } from "../Player/Habilidades/Evangelho.js";
import { PalavraDeDeus } from "../Player/Habilidades/PalavraDeDeus.js";
import { Snipe } from "../Player/Habilidades/Snipe.js";
import { ExecucaoPublica } from "../Player/Habilidades/ExecucaoPublica.js";
import { HabilidadeDAO } from "../DAOs/HabilidadeDAO.js";
import { Player } from "../Player/Player.js";
import { Action, type PrismaAction } from "../Player/Action.js";

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
            const habA = await this.loadHabilidade(a.habilidadeId) .getPrioridade() getHabilidadeInstance(a.habilidade.nome)?.getPrioridade() || 0;
            const habB = this.getHabilidadeInstance(b.habilidade.nome)?.getPrioridade() || 0;
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
            
            const sucesso = await habilidade.usarHabilidade(this.game, new Action(this.game, action))
            await ActionDAO.updateAction(action.id, { sucesso: sucesso ? "SUCEDIDA" : "FALHA"});
        }
    }

    public async updateHabilidade(habilidade: Hab.Habilidade, updates: any) {
        
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
                const habilidade = await this.game.getPlayerManager().getHabilidadePlayer(oferta.emissorId, oferta.habilidade);
                if (!habilidade) continue;
                
                await habilidade.resolverOferta(this.game, oferta.id);
            }
        }
    }

    public async loadHabilidade(id: string): Promise<Hab.Habilidade | null> {
        const h = await HabilidadeDAO.getHabilidadeById(id);
        if (!h) return null;
        return this.getHabilidadeInstance(h.nome, h.id, h.uso, h.status);
    }

    public async criarAlerta(user: Player, alerta: string) {
        await AlertaDAO.createAlerta(this.guildId, user.getId(), await this.game.getEtapaAtual(), alerta)
    }

    public async criarAction(userId: string, habilidadeId: string, tipo: string, alvos?: Player[], parametros?: string): Promise<Action> {
        const alvosIds = alvos?.map(a => a.getId());
        const action = await ActionDAO.createAction(userId, this.guildId, tipo, await this.game.getEtapaAtual(), habilidadeId, alvosIds || [], parametros);
        return new Action(this.game, action!);
    }

    public async criarOferta(emissorId: string, alvo: Player, habilidade: Hab.Habilidade, nomeOferta: string, item?: string, parametros?: string): Promise<void> {
        const alvoId = alvo.getId();

        console.log(`Criando oferta: Emissor ${emissorId}, Alvo ${alvoId}, Habilidade ${habilidade.getNome()}, Oferta ${nomeOferta}, Item ${item}, Parametros ${parametros}`);
        await OfertaDAO.createOferta(this.guildId, emissorId, alvoId, habilidade.getNome(), await this.game.getEtapaAtual(), nomeOferta, item, parametros);
    }

    public getCargoInstance(nomeDoCargo: string, habilidades?: Hab.Habilidade[]): Cargo | null {
        if (!nomeDoCargo) return null;
        switch (nomeDoCargo) {
            case "Evangelista": return new Evangelista(habilidades);
            case "Atirador_de_elite": return new AtiradorDeElite(habilidades);
            // case "Xerife": return new Cargo("Xerife", new Class.CidadeJusticeiro(), "Comum", [new Hab.Reputacao(), new Hab.Prender(), new Hab.Pacificacao()], 2);
            // case "Bigode": return new Cargo("Bigode", new Class.MafiaLider(), "Único", [new Hab.PunhoDeFerro(), new Hab.Matar(), new Hab.Massacre()], 2, 1);
            default: return null;
        }
    }

    public getHabilidadeInstance(nomeDaHabilidade: string, id?: string, usos?: number, status?: string): Hab.Habilidade | null {
        if (!nomeDaHabilidade) return null;
    
        let hab: Hab.Habilidade | null = null;

        switch (nomeDaHabilidade) {
            case "Evangelho": hab = new Evangelho(usos, status); break;
            case "Palavra de Deus": hab = new PalavraDeDeus(usos, status); break;
            case "Snipe": hab = new Snipe(usos, status); break;
            case "Execucao Publica": hab = new ExecucaoPublica(usos, status); break;
            default: hab = null; break;
        }

        // Se a habilidade foi criada e um ID foi passado (vindo do banco), nós anexamos ele!
        if (hab && id) {
            hab.setId(id);
        }

        return hab;
    }
}