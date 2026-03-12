import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { log } from 'node:console';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });

export const GuildConfigDAO = {

    async getConfig(guildId: string) {
        try {
            return await prisma.guildConfig.upsert({
                where: { guildId },
                update: {},
                create: { guildId }
            });
        } catch (error) {
            console.log("Erro ao buscar guild config:", error);
        }
    },
    
    async updateGuildConfig(guildId: string, dados: Prisma.GuildConfigUpdateInput) {
        try {
            return await prisma.guildConfig.upsert({
                where: { guildId },
                update: dados,
                create: { guildId }
            });
        } catch (error) {
            console.log("Erro ao atualizar guild config:", error);
        }
    },
}