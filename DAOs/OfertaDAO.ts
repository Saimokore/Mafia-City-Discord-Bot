import { prisma } from "../prisma/prisma.js";

export const OfertaDAO = {
    async createOferta(guildId: string, emissorId: string, alvoId: string, habilidadeId: string, etapa: number, nomeOferta: string, item?: string, parametros?: string) {
        try {
            return await prisma.oferta.create({
                data: {
                    guildId,
                    emissorId,
                    alvoId,
                    habilidadeId,
                    etapa,
                    nomeOferta,
                    item: item || null,
                    parametros: parametros || null
                }
            });
        } catch (error) {
            console.log("Erro ao criar oferta:", error);
        }
    },

    async updateOferta(id: string, status: boolean, parametros?: string) {
        try {
            return await prisma.oferta.update({
                where: { id },
                data: {
                    status: status ? "ACEITA" : "RECUSADA",
                    parametros: parametros || null
                }
            });
        } catch (error) {
            console.log("Erro ao atualizar oferta:", error);
        }
    },

    async getOfertas(guildId: string) {
        try {
            return await prisma.oferta.findMany({
                where: {
                    guildId
                }
            });
        } catch (error) {
            console.log("Erro ao buscar ofertas:", error);
        }
    },

    async getOfertasByPlayerId(guildId: string, userId: string) {
        try {
            return await prisma.oferta.findMany({
                where: {
                    guildId,
                    emissorId: userId
                }
            });
        } catch (error) {
            console.log(`Erro ao buscar ofertas enviadas pelo ${userId}:`, error);
        }
    },

    async getOfertasForPlayerId(guildId: string, userId: string) {
        try {
            return await prisma.oferta.findMany({
                where: {
                    guildId,
                    alvoId: userId
                }
            });
        } catch (error) {
            console.log(`Erro ao buscar ofertas recebidas pelo ${userId}:`, error);
        }
    },

    async getOfertaById(id: string) {
        try {
            return await prisma.oferta.findUnique({
                where: { id }
            });
        } catch (error) {
            console.log(`Erro ao buscar oferta ${id}:`, error);
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
}