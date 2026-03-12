import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { log } from 'node:console';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });

export const VisitaDAO = {

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
    },
} 