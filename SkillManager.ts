import { Game } from "./Game.js";
import { AtiradorDeElite, Cargo, Evangelista } from "./Player/Cargo.js";
import * as Hab from "./Player/Habilidade.js";
import * as Class from "./Player/Classe.js";
import { PartidaDAO } from "./DAOs/PartidaDAO.js";
import { ActionDAO } from "./DAOs/ActionDAO.js";
import { OfertaDAO } from "./DAOs/OfertaDAO.js";
import { AlertaDAO } from "./DAOs/AlertaDAO.js";
import { Evangelho } from "./Player/Habilidades/Evangelho.js";
import { PalavraDeDeus } from "./Player/Habilidades/PalavraDeDeus.js";
import { Snipe } from "./Player/Habilidades/Snipe.js";
import { ExecucaoPublica } from "./Player/Habilidades/ExecucaoPublica.js";
import { HabilidadeDAO } from "./DAOs/HabilidadeDAO.js";

export class SkillManager {
    private guildId: string;
    private game: Game;
    
    constructor(guildId: string, game: Game) {
        this.game = game;
        this.guildId = guildId;
    }

    public async executarActions() {
        const partida = await PartidaDAO.getPartida(this.guildId);
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${this.guildId}`);
            return;
        }
        
        await this.checkOfertas();
        
        const actions = await ActionDAO.getActionsByEtapa(this.guildId, partida.etapaAtual);
        if (actions.length === 0) {
            console.log(`Nenhuma ação registrada para a etapa ${partida.etapaAtual}.`);
            return;
        }
        
        actions.sort((a, b) => {
            const habA = this.getHabilidadeInstance(a.habilidade.nome)?.getPrioridade() || 0;
            const habB = this.getHabilidadeInstance(b.habilidade.nome)?.getPrioridade() || 0;
            return habB - habA;
        });
        
        for (const action of actions) {
            const habilidadeDB = action.habilidade;
            const player = action.userId;
            
            if (habilidadeDB.status === "IMPEDIDA") {
                console.log(`Habilidade ${habilidadeDB.nome} do jogador ${player} está impedida e não pode ser usada.`);
                continue;
            }
            
            const habilidade = this.getHabilidadeInstance(habilidadeDB.nome);
            if (!habilidade) {
                console.error(`Habilidade ${habilidadeDB.nome} não encontrada para ação do jogador ${action.userId}.`);
                continue;
            }
            
            const sucesso = await habilidade.usarHabilidade(this.game, action)
            await ActionDAO.updateAction(action.id, { sucesso: sucesso ? "SUCEDIDA" : "FALHA"});
        }
    }
    
    public async checkOfertas(): Promise<void> {
        const partida = await PartidaDAO.getPartida(this.guildId);
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${this.guildId}`);
            return;
        }
        const ofertas = await OfertaDAO.getOfertas(this.guildId);
        if (!ofertas || ofertas.length === 0) {
            console.error("Ofertas não encontradas");
            return;
        }
        for (const oferta of ofertas) {
            if (oferta.etapa == partida.etapaAtual - 1) {
                const habilidade = this.getHabilidadeInstance(oferta.habilidade);
                if (!habilidade) continue;
                
                await habilidade.resolverOferta(this.game, oferta.id);
            }
        }
    }

    public async getHabilidadeId(habilidade: Hab.Habilidade, emissorId: string) {
        const habId = await HabilidadeDAO.getHabilidade(habilidade.getNome(), emissorId, this.guildId);
        return habId!.id;
    }

    public async criarAlerta(userId: string, alerta: string) {
        await AlertaDAO.createAlerta(this.guildId, userId, await this.game.getEtapaAtual(), alerta)
    }

    public async criarAction(userId: string, habilidadeId: string, tipo: string, alvos?: string[], parametros?: string): Promise<void> {
        const partida = await PartidaDAO.getPartida(this.guildId);
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${this.guildId}`);
            return;
        }
        await ActionDAO.createAction(userId, this.guildId, tipo, partida.etapaAtual, habilidadeId, alvos, parametros);
    }

    public async criarOferta(emissorId: string, alvoId: string, habilidadeNome: string, nomeOferta: string, item?: string, parametros?: string): Promise<void> {
        console.log(`Criando oferta: Emissor ${emissorId}, Alvo ${alvoId}, Habilidade ${habilidadeNome}, Oferta ${nomeOferta}, Item ${item}, Parametros ${parametros}`);
        const partida = await PartidaDAO.getPartida(this.guildId);
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${this.guildId}`);
            return;
        }
        await OfertaDAO.createOferta(this.guildId, emissorId, alvoId, habilidadeNome, partida.etapaAtual, nomeOferta, item, parametros);
    }

    public getCargoInstance(nomeDoCargo: string, habilidades?: Hab.Habilidade[]): Cargo | null {
        if (!nomeDoCargo) return null;
        switch (nomeDoCargo) {
            case "Evangelista": return new Evangelista(habilidades);
            case "Atirador de Elite": return new AtiradorDeElite(habilidades);
            case "Xerife": return new Cargo("Xerife", new Class.CidadeJusticeiro(), "Comum", [new Hab.Reputacao(), new Hab.Prender(), new Hab.Pacificacao()], 2);
            case "Bigode": return new Cargo("Bigode", new Class.MafiaLider(), "Único", [new Hab.PunhoDeFerro(), new Hab.Matar(), new Hab.Massacre()], 2, 1);
            default: return null;
        }
    }

    public getHabilidadeInstance(nomeDaHabilidade: string, usos?: number, status?: string): Hab.Habilidade | null {
        if (!nomeDaHabilidade) return null;
        switch (nomeDaHabilidade) {
            case "Evangelho": return new Evangelho(usos, status);
            case "Palavra de Deus": return new PalavraDeDeus(usos, status);

            case "Snipe": return new Snipe(usos, status);
            case "Execucao Publica": return new ExecucaoPublica(usos, status);

            case "Reputacao": return new Hab.Reputacao();
            case "Prender": return new Hab.Prender();
            case "Pacificacao": return new Hab.Pacificacao();
            
            case "Punho de Ferro": return new Hab.PunhoDeFerro();
            case "Matar": return new Hab.Matar();
            case "Massacre": return new Hab.Massacre();
            
            default: return null;
        }
    }
}