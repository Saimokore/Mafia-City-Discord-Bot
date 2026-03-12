import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { log } from 'node:console';
import { use } from 'react';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });

export const VisitaDAO = {

    async createVisita(guildId: string, visitanteId: string, visitadoId: string, etapa: number, distritoVisitado: number, distritoVisitante: number) {
        try {
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
        } catch (error) {
            console.log("Erro ao criar visita:", error);
        }
    },

    async getVisitas(guildId: string, etapa: number) {
        try {
            return await prisma.visita.findMany({
                where: {
                    guildId,
                    etapa
                }
            });
        } catch (error) {
            console.log(`Erro ao buscar visitas na etapa ${etapa}:`, error);
        }
    },

    async getVisitasByPlayer(guildId: string, userId: string, etapa: number) {
        try {
            return await prisma.visita.findMany({
                where: {
                    guildId,
                    visitanteId: userId,
                    etapa
                }
            });
        } catch (error) {
            console.log(`Erro ao buscar visitas de ${userId}:`, error);
        }
    },
} 