import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { log } from 'node:console';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });

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
                console.error(`Falha ao criar alerta: Jogador com userId ${userId} não existe na guild ${guildId}.`);
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
            console.log("Erro ao criar alerta:", e);
        }
    },
}