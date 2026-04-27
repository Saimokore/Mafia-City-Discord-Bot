import { prisma } from "../prisma/prisma.js";

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