import { Prisma } from '@prisma/client';
import { prisma } from "../../prisma/prisma.js";

export const PartidaDAO = {
    async createPartida(guildId: string) {
        try {
            return await prisma.partida.create({
                data: {
                    guildId
                }
            });
        } catch (error) {
            console.log("Erro ao criar partida:", error);
        }
    },

    async updatePartida(guildId: string, dados: Prisma.PartidaUpdateInput) {
        try {
            return await prisma.partida.upsert({
                where: { guildId },
                update: dados,
                create: { guildId }
            });
        } catch (error) {
            console.log("Erro ao atualizar partida:", error);
        }
    },

    async getPartida(guildId: string) {
        try {
            return await prisma.partida.findUnique({
                where: {
                    guildId
                },
                include: { players: true }
            });
        } catch (error) {
            console.log("Erro ao buscar partida:", error);
        }
    },

    async deletePartida(guildId: string) {
        try {
            await prisma.partida.delete({
                where: { guildId }
            });
        } catch (e) {
            console.log(`Erro ao terminar partida ${guildId}:`, e);
        }
    },
}