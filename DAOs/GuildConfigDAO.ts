import { PrismaClient, Prisma } from '@prisma/client';
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { log } from 'node:console';

const adapter = new PrismaBetterSqlite3({
  url: "file:./dev.db",
});

export const prisma = new PrismaClient({ adapter });

export const GuildConfigDAO = {

    async getConfig(guildId: string) {
        return await prisma.guildConfig.upsert({
            where: { guildId },
            update: {},
            create: { guildId }
        });
    },
    
    async updateGuildConfig(guildId: string, dados: Prisma.GuildConfigUpdateInput) {
        return await prisma.guildConfig.upsert({
            where: { guildId },
            update: dados,
            create: { guildId }
        });
    },
}