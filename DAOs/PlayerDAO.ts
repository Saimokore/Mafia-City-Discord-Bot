import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { log } from 'node:console';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });

export const PlayerDAO = {
    
    async createPlayer(guildId: string, userId: string, username: string, dadosExtra?: string) {
        try {
            return await prisma.player.create({
                data: {
                    guildId,
                    userId,
                    username,
                    dadosExtra: dadosExtra || "{}"
                }
            });
        } catch (error) {
            console.log("Erro ao criar jogador:", error);
        }
    },

    async updatePlayer(id: string, dados: Prisma.PlayerUpdateInput) {
        try {
            return await prisma.player.update({
                where: { id },
                data: dados
            });
        } catch (e) {
            console.log("Erro ao atualizar jogador:", e);
        }
    },

    async updatePlayerByUserId(userId: string, guildId: string, dados: Prisma.PlayerUpdateInput) {
        try {
            return await prisma.player.update({
                where: { guildId_userId: { userId, guildId } },
                data: dados
            });
        } catch (e) {
            console.log("Erro ao atualizar jogador:", e);
        }
    },

    async getPlayerByUserId(userId: string, guildId: string) {
        try {
            return await prisma.player.findUnique({
                where: {
                    guildId_userId: {
                        userId,
                        guildId
                    }
                },
                include: { cartas: true, habilidades: true, itens: true, ofertas: true, alertas: true, actions: true }
            });
        } catch (error) {
            console.log("Erro ao procurar jogador:", error);
        }
    },

    async getPlayerById(id: string) {
        try {
            return await prisma.player.findUnique({
                where: { id },
                include: { cartas: true, habilidades: true, itens: true, ofertas: true, alertas: true, actions: true }
            });
        } catch (error) {
            console.log("Erro ao procurar jogador:", error);
        }
    },

    async findPlayerWithUserIdOrId(user: string, guildId: string) {
        try {
            return await prisma.player.findFirst({
                where: {
                    OR: [
                        { id: user },
                        { AND: [{ userId: user }, { guildId }] }
                    ]
                },
                include: { cartas: true, alertas: true, habilidades: true, itens: true }
            });
        } catch (error) {
            console.log("Erro ao procurar jogador:", error);
        }
    },

    async getPlayers(guildId: string) {
        try {
            return await prisma.player.findMany({
                where: {
                    guildId
                },
                include: { cartas: true, habilidades: true, itens: true, ofertas: true, alertas: true, actions: true }
            });
        } catch (error) {
            console.log("Erro ao procurar jogadores:", error);
        }
    },

    async deletePlayer(id: string) {
        try {
            return await prisma.player.delete({
                where: { id }
            });
        } catch (e) {
            console.log("Erro ao remover jogador:", e);
        }
    },    
}