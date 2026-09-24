import { prisma } from "../../prisma/prisma.js";

export const AlertaDAO = {
    async createAlerta(guildId: string, userId: string, etapa: number, alerta: string) {
        try {
            const playerExists = await prisma.player.findUnique({
                where: {
                    guildId_userId: { 
                        guildId: guildId,
                        userId: userId
                    }
                }
            });

            if (!playerExists) {
                console.error(`[AlertaDAO] Falha ao criar alerta: Jogador com userId ${userId} não existe na guild ${guildId}.`);
                return null; 
            }

            return await prisma.alerta.create({
                data: {
                    guildId,
                    userId,
                    etapa,
                    alerta
                }
            });
        } catch (e) {
            console.log("[AlertaDAO] Erro ao criar alerta:", e);
        }
    },
}