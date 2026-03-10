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
            where: { guildId },
            update: dados,
            create: { guildId }
        });
    },

    async createAction(userId: string, guildId: string, etapa: number, habilidadeId: string, alvoIds?: string[], parametrosAcao?: string) {
        return await prisma.action.create({
            data: {
                userId,
                guildId,
                etapa: etapa,
                alvo: {
                    create: alvoIds ? alvoIds.map(alvoId => ({ alvoId })) : []
                },
                habilidadeId,
                parametrosAcao: parametrosAcao || null
            }
        });
    },

    async getPartidaById(guildId: string) {
        return await prisma.partida.findUnique({
            where: { guildId }
        });
    },

    async getPlayerId(userId: string, guildId: string) {
        const player = await prisma.player.findFirst({
            where: {
                userId,
                guildId
            }
        });
        return player ? player.id : null;
    },

    async updatePlayer(userId: string, guildId: string, dados: Prisma.PlayerUpdateInput) {
        try{
            return await prisma.player.update({
                where: { guildId_userId: { userId, guildId } },
                data: dados
            });
        } catch (e) {
            console.log("Erro ao atualizar jogador:", e);
        }
    },

    async addPlayer(guildId: string, userId: string, username: string, dadosExtra?: string) {
        return await prisma.player.create({
            data: {
                guildId,
                userId,
                username,
                dadosExtra: dadosExtra || "{}"
            }
        });
    },

    async getPlayerById(userId: string, guildId: string) {
        return await prisma.player.findUnique({
            where: {
                guildId_userId: {
                    userId,
                    guildId
                }
            },
            include: { cartas: true, habilidades: true, itens: true, ofertas: true, alertas: true, actions: true }
        });
    },

    async getPlayers(guildId: string) {
        return await prisma.player.findMany({
            where: {
                guildId
            },
            include: { cartas: true, habilidades: true, itens: true, ofertas: true, alertas: true, actions: true }
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
                guildId
            }
        });
    },

    async removePartida(guildId: string) {
        try {
            await prisma.partida.delete({
                where: { guildId }
            });
        } catch (e) {
            console.log(`Erro ao terminar partida ${guildId}:`, e);
        }
    },

    async getPartida(guildId: string) {
        return await prisma.partida.findUnique({
            where: {
                guildId
            },
            include: { players: true }
        });
    },

    async getCartasById(guildId: string, userId: string) {
        return await prisma.carta.findMany({
            where: {
                guildId,
                userId
            }
        });
    },

    async createOferta(guildId: string, emissorId: string, alvoId: string, habilidade: string, etapa: number, nomeOferta: string, item?: string, parametros?: string) {
        return await prisma.oferta.create({
            data: {
                guildId,
                emissorId,
                alvoId,
                habilidade,
                etapa,
                nomeOferta,
                item: item || null,
                parametros: parametros || null
            }
        });
    },

    async updateOferta(id: string, status: boolean, parametros?: string) {
        return await prisma.oferta.update({
            where: {
                id
            },
            data: {
                status: status ? "ACEITA" : "RECUSADA",
                parametros: parametros || null
            }
        });
    },

    async getActionsByEtapa(guildId: string, etapa: number) {
        return await prisma.action.findMany({
            where: {
                guildId,
                etapa: etapa
            },
            include: { habilidade: true, alvo: true }
        });
    },

    async getHabilidade(nome: string, userId: string, guildId: string) {
        try {
            return await prisma.habilidade.findFirst({
                where: {
                    nome,
                    userId,
                    guildId
                }
            });
        } catch (error) {
            console.error(`Erro ao buscar habilidadeId para ${nome} do player ${userId} na guild ${guildId}: ${error}`);
        }
    },

    async createHabilidade(nome: string, userId: string, guildId: string, uso: number, tipo: string, etapa: string) {
        return await prisma.habilidade.create({
            data: {
                nome,
                userId,
                guildId,
                uso,
                tipo,
                etapa
            }
        })
    },

    async getOfertas(guildId: string) {
        return await prisma.oferta.findMany({
            where: {
                guildId
            }
        });
    },

    async getOfertasByPlayerId(guildId: string, userId: string) {
        return await prisma.oferta.findMany({
            where: {
                guildId,
                emissorId: userId
            }
        });
    },

    async getOfertasForPlayerId(guildId: string, userId: string) {
        return await prisma.oferta.findMany({
            where: {
                guildId,
                alvoId: userId
            }
        });
    },


    async getOfertaById(id: string) {
        return await prisma.oferta.findUnique({
            where: {
                id
            }
        });
    },

    async updateHabilidade(id: string, dados: Prisma.PlayerUpdateInput) {
        try{
            return await prisma.player.update({
                where: { id },
                data: dados
            });
        } catch (e) {
            console.log("Erro ao atualizar habilidade:", e);
        }
    },

    async deleteOferta(id: string) {
        try {
            return await prisma.oferta.delete({
                where: { id }
            });
        } catch (error) {
            console.error(`Erro ao deletar oferta com id ${id}: ${error}`);
        }
    },

    async createAlerta(guildId: string, userId: string, etapa: number, alerta: string) {
        return await prisma.alerta.create({
            data: {
                guildId,
                userId,
                etapa,
                alerta
            }
        });
    },

    async createVisita(guildId: string, visitanteId: string, visitadoId: string, etapa: number, distritoVisitado: number, distritoVisitante: number) {
        return await prisma.visita.create({
            data: {
                guildId,
                visitanteId,
                visitadoId,
                etapa,
                distritoVisitado,
                distritoVisitante
            }
        });
    },

    async getVisitas(guildId: string, etapa: number) {
        return await prisma.visita.findMany({
            where: {
                guildId,
                etapa
            }
        });
    },

    async getVisitasByPlayer(guildId: string, userId: string, etapa: number) {
        return await prisma.visita.findMany({
            where: {
                guildId,
                visitanteId: userId,
                etapa
            }
        });
    }

} 