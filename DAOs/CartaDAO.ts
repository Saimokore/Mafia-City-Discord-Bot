import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { log } from 'node:console';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });

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
            console.log("Erro ao criar carta:", error);
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
            console.log("Erro ao buscar carta:", error);
        }
    },
}