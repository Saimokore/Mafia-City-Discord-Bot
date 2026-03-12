import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { log } from 'node:console';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });

export const OfertaDAO = {
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

    async deleteOferta(id: string) {
        try {
            return await prisma.oferta.delete({
                where: { id }
            });
        } catch (error) {
            console.error(`Erro ao deletar oferta com id ${id}: ${error}`);
        }
    },
}