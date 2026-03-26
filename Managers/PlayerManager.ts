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

    // Guarda os IDs dos jogadores e o que mudou neles (ex: { "id-123": { estaVivo: false } })
    private batchUpdates: Map<string, any>;
    private playersCache: Player[];

    constructor(guildId: string, game: Game) {
        this.game = game;
        this.guildId = guildId;
        this.playersCache = [];
        this.batchUpdates = new Map();
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

    public async updatePlayer(player: Player, updates: any) {
        
        if (updates.estaVivo !== undefined) player.setEstaVivo(updates.estaVivo);
        if (updates.protecao !== undefined) player.setProtecao(updates.protecao);
        if (updates.status !== undefined) player.setStatus(updates.status);
        if (updates.dadosExtra !== undefined) player.setDadosExtra(updates.dadosExtra);

        // 2. Se for de dia (Instantânea), salva no banco na hora!
        if (!this.game.isTransicaoEtapa()) {
            await PlayerDAO.updatePlayer(player.getId(), updates);
            return;
        }

        // 3. Se for de noite (Transição), guarda a alteração no "carrinho"
        const id = player.getId();
        const atual = this.batchUpdates.get(id) || {};
        this.batchUpdates.set(id, { ...atual, ...updates });
    }

    public async commitBatch() {
        if (this.batchUpdates.size === 0) return;
        
        console.log(`[DB] Salvando ${this.batchUpdates.size} jogadores simultaneamente...`);
        
        const promises = Array.from(this.batchUpdates.entries()).map(([id, updates]) => {
            return PlayerDAO.updatePlayer(id, updates);
        });

        await Promise.all(promises);
        this.batchUpdates.clear();
    }

    public async carregarCache(): Promise<void> {
        const players = await PlayerDAO.getPlayers(this.guildId);
        
        if (players) {
            this.playersCache = players.map(p => new Player(this.game, p));
        }
    }

    public limparCache(): void {
        this.playersCache = [];
    }

    public async getAllPlayers(): Promise<Player[] | null> {
        if (this.playersCache.length > 0) return this.playersCache;

        const players = await PlayerDAO.getPlayers(this.guildId);
        if (!players) return null;
        return players.map(p => new Player(this.game, p));
    }

    public async loadPlayer(user: string | PrismaPlayer): Promise<Player | null> {
        if (typeof user === "string") {
            // Aqui ele pega do cache, isso é no avanço de etapa
            const cachedPlayer = this.playersCache.find(p => p.getId() === user || p.getUserId() === user);
            if (cachedPlayer) return cachedPlayer;

            // Aqui é pra quando ele for pegar nas jogadas durante o dia, sem cache direto do banco de dados
            const player = await PlayerDAO.findPlayerWithUserIdOrId(user, this.guildId);
            if (!player) return null;
            return new Player(this.game, player);
        } else {
            return new Player(this.game, user);
        }
    }

    public async sendPlayersStatus(): Promise<void> {
        const players = await this.getAllPlayers();
        players?.forEach(p => this.game.sendMensagemPlayer(p, p.getStatus()));
    }

    public async bloquearPlayer(alvo: Player) {
        await this.game.getSkillManager().criarAlerta(alvo, `Você foi bloqueado essa noite!`)
        return await PlayerDAO.updatePlayer(alvo.getId(), { status: "BLOQUEADO" });
    }

    public async storeDadosExtra(player: Player, dados: DadoExtra) {
        //dados deve estar em {}
        const dadosExtra = player.getDadosExtra();
        dadosExtra.push(dados);
        await PlayerDAO.updatePlayer(player.getId(), { dadosExtra: JSON.stringify(dadosExtra) });
    }

    public async getHabilidadePlayer(playerId: string, nomeHabilidade: string): Promise<Habilidade | undefined> {
        const player = await this.loadPlayer(playerId);
        return player?.getHabilidade(nomeHabilidade);
    }
}