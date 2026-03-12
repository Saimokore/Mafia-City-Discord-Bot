import { ButtonStyle, Client, TextChannel, ActionRowBuilder, ButtonBuilder, EmbedBuilder } from "discord.js";
import { Game } from "./Game.js";
import { Player } from "./Player/Player.js";
import * as Cargo from "./Player/Cargo.js";
import * as Hab from "./Player/Habilidade.js";
import { PartidaDAO } from "./DAOs/PartidaDAO.js";
import { ActionDAO } from "./DAOs/ActionDAO.js";
import { OfertaDAO } from "./DAOs/OfertaDAO.js";
import { PlayerDAO } from "./DAOs/PlayerDAO.js";
import { AlertaDAO } from "./DAOs/AlertaDAO.js";

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

    public async criarAction(userId: string, habilidade: Hab.Habilidade, alvos?: string[]): Promise<void> {
        const partida = await PartidaDAO.getPartida(this.guildId);
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${this.guildId}`);
            return;
        }
        await ActionDAO.createAction(userId, this.guildId, partida.etapaAtual, habilidade.getNome(), alvos);
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
        const player = await this.loadPlayer(emissorId, this.game.getGuildId());
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

    // ==========================================
    // FACTORY
    // ==========================================

    public async loadPlayer(userId: string, guildId: string): Promise<Player | null> {
        const player = await PlayerDAO.getPlayerById(userId, guildId);

        if (!player) return null;

        return new Player(this.game, player);
    }

    public getCargoInstance(nomeDoCargo: string): Cargo.Cargo | null {
        if (!nomeDoCargo) return null;
        switch (nomeDoCargo) {
            case "Evangelista": return new Cargo.Evangelista();
            case "Atirador de Elite": return new Cargo.AtiradorDeElite();
            case "Xerife": return new Cargo.Xerife();
            case "Bigode": return new Cargo.Bigode();
            default: return null;
        }
    }

    public getHabilidadeInstance(nomeDaHabilidade: string | null): Hab.Habilidade | null {
        if (!nomeDaHabilidade) return null;
        switch (nomeDaHabilidade) {
            case "Evangelho": return new Hab.Evangelho();
            case "Palavra de Deus": return new Hab.PalavraDeDeus();

            case "Snipe": return new Hab.Snipe();
            case "Execucao Publica": return new Hab.ExecucaoPublica();

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