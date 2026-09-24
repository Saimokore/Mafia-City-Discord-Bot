import { ButtonStyle, ActionRowBuilder, ButtonBuilder, EmbedBuilder } from "discord.js";
import { Game } from "./GameManager.js";
import { Player } from "../Player/Player.js";
import { PlayerDAO } from "../daos/PlayerDAO.js";
import type { Prisma } from "@prisma/client";
import type { DadoExtra } from "../domain/types/Tipos.js";
import type { HabilidadeDinamica } from "../domain/skills/HabilidadeDinamica.js";

export type PrismaPlayer = Prisma.PlayerGetPayload<{
    include: {
        cartas: true,
        alertas: true,
        habilidades: true,
        itens: true
    }
}>;

export class PlayerService {
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

    public async updatePlayer(player: Player, updates: any) {
        
        if (updates.estaVivo !== undefined) player.setEstaVivo(updates.estaVivo);
        if (updates.protecao !== undefined) player.setProtecao(updates.protecao);
        if (updates.status !== undefined) player.setStatus(updates.status);
        if (updates.dadosExtra !== undefined) player.setDadosExtra(updates.dadosExtra);

        if (!this.game.isTransicaoEtapa()) {
            await PlayerDAO.updatePlayer(player.getId(), updates);
            return;
        }

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

    public async enviarStatusPlayers(): Promise<void> {
        const players = await this.getAllPlayers();
        for (const player of players) {
            await this.game.getChannelService().enviarMensagemPrivada(player, player.getInfo());
        }
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

    public async getHabilidadePlayer(playerId: string, nomeHabilidadeOuId: string): Promise<HabilidadeDinamica | undefined> {
        const player = await this.loadPlayer(playerId);
        return player?.getHabilidade(nomeHabilidadeOuId);
    }
}