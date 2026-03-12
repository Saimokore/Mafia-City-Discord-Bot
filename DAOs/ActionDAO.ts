import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { log } from 'node:console';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });

export const ActionDAO = {
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

    async getActionsByEtapa(guildId: string, etapa: number) {
        return await prisma.action.findMany({
            where: {
                guildId,
                etapa: etapa
            },
            include: { habilidade: true, alvo: true }
        });
    },
}