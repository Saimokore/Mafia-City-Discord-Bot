import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { log } from 'node:console';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });

export const PartidaDAO = {
    async createPartida(guildId: string) {
        return await prisma.partida.create({
            data: {
                guildId
            }
        });
    },

    async updatePartida(guildId: string, dados: Prisma.PartidaUpdateInput) {
        return await prisma.partida.upsert({
            where: { guildId },
            update: dados,
            create: { guildId }
        });
    },

    async getPartida(guildId: string) {
        return await prisma.partida.findUnique({
            where: {
                guildId
            },
            include: { players: true }
        });
    },

    async getPartidaById(guildId: string) {
        return await prisma.partida.findUnique({
            where: { guildId }
        });
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