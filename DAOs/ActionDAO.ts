import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { log } from 'node:console';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });

export const ActionDAO = {
    async createAction(userId: string, guildId: string, tipo: string, etapa: number, habilidadeId: string, alvoIds: string[], parametrosAcao?: string) {
        try {
            return await prisma.action.create({
                data: {
                    userId,
                    guildId,
                    tipo,
                    etapa,
                    alvos: {
                        create: alvoIds.map(alvoId => ({
                            alvoId,
                            guildId
                        }))
                    },
                    habilidadeId,
                    parametrosAcao: parametrosAcao || null
                }
            });
        } catch (e) {
            console.log("Erro ao criar action:", e);
        }
    },

    async updateAction(id: string, dados: Prisma.ActionUpdateInput) {
        try{
            return await prisma.action.update({
                where: { id },
                data: dados
            });
        } catch (e) {
            console.log("Erro ao atualizar action:", e);
        }
    },

    async getActionsByEtapa(guildId: string, etapa: number) {
        return await prisma.action.findMany({
            where: {
                guildId,
                etapa: etapa
            },
            include: { 
                habilidade: true, 
                alvos: { 
                    include: { player: {
                        include: {
                            cartas: true,
                            alertas: true,
                            habilidades: true,
                            itens: true
                    }   }
                } 
            }
        });
    },
}