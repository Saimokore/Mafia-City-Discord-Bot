import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { log } from 'node:console';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });

export const HabilidadeDAO = {
    async createHabilidade(nome: string, userId: string, guildId: string, uso: number, tipo: string, etapa: string) {
        return await prisma.habilidade.create({
            data: {
                nome,
                userId,
                guildId,
                uso,
                tipo,
                etapa
            }
        })
    },

    async updateHabilidade(id: string, dados: Prisma.PlayerUpdateInput) {
        try{
            return await prisma.player.update({
                where: { id },
                data: dados
            });
        } catch (e) {
            console.log("Erro ao atualizar habilidade:", e);
        }
    },

    async getHabilidade(nome: string, userId: string, guildId: string) {
        try {
            return await prisma.habilidade.findFirst({
                where: {
                    nome,
                    userId,
                    guildId
                }
            });
        } catch (error) {
            console.error(`Erro ao buscar habilidadeId para ${nome} do player ${userId} na guild ${guildId}: ${error}`);
        }
    },
}