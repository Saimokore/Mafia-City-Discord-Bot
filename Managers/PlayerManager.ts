import { ButtonStyle, ActionRowBuilder, ButtonBuilder, EmbedBuilder } from "discord.js";
import { Game } from "./GameManager.js";
import { Player } from "../Player/Player.js";
import { PlayerDAO } from "../DAOs/PlayerDAO.js";
import type { Prisma } from "@prisma/client";
import { platform } from "node:os";
import type { DadoExtra } from "../Player/Tipos.js";
import type { Habilidade } from "../Player/Habilidade.js";

export type PrismaPlayer = Prisma.PlayerGetPayload<{
    include: {
        cartas: true,
        alertas: true,
        habilidades: true,
        itens: true
    }
}>;

export class PlayerManager {
    private guildId: string;
    private game: Game;
    
    constructor(guildId: string, game: Game) {
        this.game = game;
        this.guildId = guildId;
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

    public async sendPlayersStatus(): Promise<void> {
        const players = await PlayerDAO.getPlayers(this.guildId);
        if (!players || players.length === 0) {
            console.error("Players não encontrados");
            return;
        } 
        for (const p of players) {
            const player = await this.loadPlayer(p.userId);
            if (!player) {
                console.error("Player não encontrado: " + p.id);
                continue;
            }
            this.game.sendMensagemPlayer(p.userId, player.getStatus());
        }
    }

    public async storeDadosExtra(player: Player, dados: DadoExtra) {
        //dados deve estar em {}
        const dadosExtra = player.getDadosExtra();
        dadosExtra.push(dados);
        await PlayerDAO.updatePlayer(player.getId(), this.game.getGuildId(), { dadosExtra: JSON.stringify(dadosExtra) });
    }

    public async getAllPlayers(): Promise<Player[] | null> {
        const players = await PlayerDAO.getPlayers(this.guildId);
        if (!players) return null;
        return await players.map(p => new Player(this.game, p))
    }

    public async getHabilidadePlayer(playerId: string, nomeHabilidade: string): Promise<Habilidade | undefined> {
        const player = await this.loadPlayer(playerId);
        return player?.getHabilidade(nomeHabilidade);
    }

    public async loadPlayer(user: string | PrismaPlayer): Promise<Player | null> {
        if (typeof user === "string") {
            const player = await PlayerDAO.getPlayerById(user, this.guildId);
            if (!player) return null;
            return new Player(this.game, player);
        } else {
            return new Player(this.game, user);
        }
    }
    
}