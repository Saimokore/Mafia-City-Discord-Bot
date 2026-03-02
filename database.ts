import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { log } from 'node:console';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });

export const db = {
    async getConfig(guildId: string) {
        return await prisma.guildConfig.upsert({
            where: { guildId },
            update: {},
            create: { guildId }
        });
    },

    async updateGuildConfig(guildId: string, dados: Prisma.GuildConfigUpdateInput) {
        return await prisma.guildConfig.update({
            where: { guildId },
            data: dados
        });
    },

    async updatePartida(guildId: string, dados: Prisma.PartidaUpdateInput) {
        return await prisma.partida.update({
            where: { id: guildId },
            data: dados
        });
    },

    async setPlayerChat(userId: string, canalId: string) {
        return await prisma.player.update({
            where: { userId: userId },
            data: { userChat: canalId }
        });
    },

    async getPartidaById(guildId: string) {
        return await prisma.partida.findUnique({
            where: { id: guildId }
        });
    },

    async setEtapa(guildId: string, etapa: number) {
        return await prisma.partida.update({
            where: { id: guildId },
            data: { etapaAtual: etapa }
        });
    },

    async updatePlayer(userId: string, guildId: string, dados: Prisma.PlayerUpdateInput) {
        return await prisma.player.update({
            where: { userId, partidaId: guildId },
            data: dados
        });
    },

    async addPlayer(guildId: string, userId: string, username: string) {
        return await prisma.player.create({
            data: {
                partidaId: guildId,
                userId: userId,
                username: username
            }
        });
    },

    async getPlayerById(userId: string, guildId: string) {
        return await prisma.player.findUnique({
            where: {
                userId: userId,
                partidaId: guildId
            },
            include: { cartas: true }
        });
    },

    async getPlayers(guildId: string) {
        return await prisma.player.findMany({
            where: {
                partidaId: guildId
            }
        });
    },

    async removePlayer(userId: string) {
        try {
            return await prisma.player.delete({
                where: {
                    userId: userId
                }
            });
        } catch (e) {
            console.log("Erro ao remover jogador:", e);
        }
    },

    async createPartida(guildId: string) {
        return await prisma.partida.create({
            data: {
                id: guildId,
                status: "LOBBY",
                etapaAtual: 0
            }
        });
    },

    async removePartida(guildId: string) {
        try {
            await prisma.partida.delete({
                where: { id: guildId }
            });
        }
            catch (e) {
                console.log("Erro ao terminar partida:", e);
            }
    },

    async getPartida(guildId: string) {
        return await prisma.partida.findUnique({
            where: {
                id: guildId
            },
            include: { players: true }
        });
    },

    async getCartasById(guildId: string, userId: string) {
        return await prisma.carta.findMany({
            where: {
                partidaId: guildId,
                userId: userId
            }
        });
    }
};