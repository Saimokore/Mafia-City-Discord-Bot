import { prisma } from "../prisma/prisma.js";

export const CartaDAO = {
    async createCarta(guildId: string, userId:string, destinatario: string, mensagem: string) {
        try {
            return await prisma.carta.create({
                data: {
                    guildId,
                    userId,
                    destinatario,
                    mensagem
                }
            })
        } catch (error) {
            console.log("[CartaDAO] Erro ao criar carta:", error);
        }
    },

    async getCartasById(guildId: string, userId: string) {
        try {
            return await prisma.carta.findMany({
                where: {
                    guildId,
                    userId
                }
            });
        } catch (error) {
            console.log("[CartaDAO] Erro ao buscar carta:", error);
        }
    },
}