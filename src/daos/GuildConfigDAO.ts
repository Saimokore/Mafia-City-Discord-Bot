import { Prisma } from '@prisma/client';
import { prisma } from "../../prisma/prisma.js";

export const GuildConfigDAO = {

    async getConfig(guildId: string) {
        try {
            return await prisma.guildConfig.upsert({
                where: { guildId },
                update: {},
                create: { guildId }
            });
        } catch (error) {
            console.log("[GuildConfigDAO] Erro ao buscar guild config:", error);
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
            console.log("[GuildConfigDAO] Erro ao atualizar guild config:", error);
        }
    },
}