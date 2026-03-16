import { ButtonStyle, Client, TextChannel, ActionRowBuilder, ButtonBuilder, EmbedBuilder } from "discord.js";
import { Game } from "./Game.js";
import { Player } from "./Player/Player.js";
import { Cargo } from "./Player/Cargo.js";
import * as Hab from "./Player/Habilidade.js";
import * as Class from "./Player/Classe.js";
import { PartidaDAO } from "./DAOs/PartidaDAO.js";
import { ActionDAO } from "./DAOs/ActionDAO.js";
import { OfertaDAO } from "./DAOs/OfertaDAO.js";
import { PlayerDAO } from "./DAOs/PlayerDAO.js";
import { AlertaDAO } from "./DAOs/AlertaDAO.js";
import { Evangelho } from "./Player/Habilidades/Evangelho.js";
import { PalavraDeDeus } from "./Player/Habilidades/PalavraDeDeus.js";
import { Snipe } from "./Player/Habilidades/Snipe.js";
import { ExecucaoPublica } from "./Player/Habilidades/ExecucaoPublica.js";

export class PlayerManager {
    private guildId: string;
    private game: Game;
    
    constructor(guildId: string, game: Game) {
        this.game = game;
        this.guildId = guildId;
    }

    public async useHabilidade(userId: string, habilidade: Hab.Habilidade): Promise<void> {

        const partida = await PartidaDAO.getPartida(this.guildId);
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${this.guildId}`);
            return;
        }
        await this.criarAction(userId, habilidade);

        console.log(`Jogador ${userId} usou a habilidade: ${habilidade.getNome() || "Desconhecida"}`);
    }

    public async criarAlerta(userId: string, alerta: string) {
        await AlertaDAO.createAlerta(this.guildId, userId, await this.game.getEtapaAtual(), alerta)
    }

    public async criarAction(userId: string, habilidade: Hab.Habilidade | string, alvos?: string[], parametros?: string): Promise<void> {
        const partida = await PartidaDAO.getPartida(this.guildId);
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${this.guildId}`);
            return;
        }
        const habNome = habilidade instanceof Hab.Habilidade ? habilidade.getNome() : habilidade;
        await ActionDAO.createAction(userId, this.guildId, partida.etapaAtual, habNome, alvos, parametros);
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

    public async buildOferta(ofertaId: string, emissorId: string, nomeOferta: string, habilidadeNome: string) {
        const player = await this.loadPlayer(emissorId);
        const embed = new EmbedBuilder()
            .setTitle(`Uma Oferta foi feita para você!`)
            .setDescription(`**${player!.getCargo()!.getNome()}** está te oferecendo **${nomeOferta}**.`)
            .setColor('#2b2d31')
            .setFooter({ text: 'Escolha com sabedoria. Esta decisão é talvez permanente para esta etapa.' });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`offer_button_accept_${nomeOferta}_${ofertaId}`)
                .setLabel('Aceitar')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`offer_button_deny_${nomeOferta}_${ofertaId}`)
                .setLabel('Recusar')
                .setStyle(ButtonStyle.Danger)
        );

        return {
            embeds: [embed],
            components: [row]
        };
    }

    public async getPlayerProtection(userId: string): Promise<number> {
        const player = await PlayerDAO.getPlayerById(userId, this.guildId);
        if (!player || !player.cargo) return 0;

        const cargo = this.getCargoInstance(player.cargo);
        return cargo?.getProtecaoInata() || 0;
    }

    // ==========================================
    // FACTORY
    // ==========================================

    public async loadPlayer(userId: string): Promise<Player | null> {
        const player = await PlayerDAO.getPlayerById(userId, this.guildId);

        if (!player) return null;

        return new Player(this.game, player);
    }

    public getCargoInstance(nomeDoCargo: string): Cargo | null {
        if (!nomeDoCargo) return null;
        switch (nomeDoCargo) {
            case "Evangelista": return new Cargo("Evangelista", new Class.CidadeJusticeiro(), "Comum", [new Evangelho(), new PalavraDeDeus()], 1);
            case "Atirador de Elite": return new Cargo("Atirador de Elite", new Class.CidadeJusticeiro(), "Comum", [new Snipe(), new ExecucaoPublica()], 2);
            case "Xerife": return new Cargo("Xerife", new Class.CidadeJusticeiro(), "Comum", [new Hab.Reputacao(), new Hab.Prender(), new Hab.Pacificacao()], 2);
            case "Bigode": return new Cargo("Bigode", new Class.MafiaLider(), "Único", [new Hab.PunhoDeFerro(), new Hab.Matar(), new Hab.Massacre()], 2, 1);
            default: return null;
        }
    }

    public getHabilidadeInstance(nomeDaHabilidade: string | null): Hab.Habilidade | null {
        if (!nomeDaHabilidade) return null;
        switch (nomeDaHabilidade) {
            case "Evangelho": return new Evangelho();
            case "Palavra de Deus": return new PalavraDeDeus();

            case "Snipe": return new Snipe();
            case "Execucao Publica": return new ExecucaoPublica();

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