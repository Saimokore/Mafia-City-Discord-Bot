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
        return await prisma.guildConfig.upsert({
            where: { guildId },
            update: dados,
            create: { guildId }
        });
    },

    async updatePartida(guildId: string, dados: Prisma.PartidaUpdateInput) {
        return await prisma.partida.upsert({
            where: { id: guildId },
            update: dados,
            create: { id: guildId }
        });
    },

    async registrarAction(userId: string, partidaId: string, etapa: number, habilidadeId: string, alvoIds?: string[]) {
        return await prisma.action.upsert({
            where: {
                partidaId_userId_habilidadeId: { 
                    partidaId: partidaId,
                    userId: userId,
                    habilidadeId: habilidadeId
                }
            },
            update: {
                alvo: {
                    deleteMany: {},
                    create: alvoIds ? alvoIds.map(alvoId => ({ alvoId })) : []
                },
                habilidadeId
            },
            create: {
                userId: userId,
                partidaId: partidaId,
                etapa: etapa,
                alvo: {
                    create: alvoIds ? alvoIds.map(alvoId => ({ alvoId })) : []
                },
                habilidadeId
            }
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

    async getPlayerId(userId: string, guildId: string) {
        const player = await prisma.player.findFirst({
            where: {
                userId: userId,
                partidaId: guildId
            }
        });
        return player ? player.id : null;
    },

    async updatePlayer(id: string, dados: Prisma.PlayerUpdateInput) {
        try{
            return await prisma.player.update({
                where: { id },
                data: dados
            });
        } catch (e) {
            console.log("Erro ao atualizar jogador:", e);
        }
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
        return await prisma.player.findFirst({
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

    async removePlayer(id: string) {
        try {
            return await prisma.player.delete({
                where: { id }
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
        } catch (e) {
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
    },

    async criarOferta(partidaId: string, emissorId: string, alvoId: string, habilidade: string, etapa: number) {
        return await prisma.oferta.create({
            data: {
                partidaId,
                emissorId,
                alvoId,
                habilidade,
                etapa
            }
        });
    },

    async updateOferta(id: string, status: string) {
        return await prisma.oferta.update({
            where: {
                id
            },
            data: {
                status
            }
        });
    },

    async getActionsByEtapa(guildId: string, etapa: number) {
        return await prisma.action.findMany({
            where: {
                partidaId: guildId,
                etapa: etapa
            },
            include: { habilidade: true, alvo: true }
        });
    },

    async getHabilidadeId(nome: string, userId: string, guildId: string) {
        return await prisma.habilidade.findFirst({
            where: {
                nome,
                userId,
                partidaId: guildId
            }
        });
    },

    async getOfertas(guildId: string, etapa: number) {
        return await prisma.oferta.findMany({
            where: {
                partidaId: guildId,
                etapa: etapa
            }
        });
    }
} 