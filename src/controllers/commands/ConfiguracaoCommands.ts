import type { Message } from "discord.js";
import { GuildConfigDAO } from "../../daos/GuildConfigDAO.js";

export class SetDiurnoCommand {
    public static async execute(message: Message): Promise<void> {
        const serverId = message.guild!.id;
        if (!message.member?.permissions.has("Administrator")) {
            await message.reply("❌ Apenas administradores podem definir os canais do jogo.");
            return;
        }

        try {
            await GuildConfigDAO.updateGuildConfig(serverId, { canalDiurnoId: message.channel.id });
            await message.reply(`✅ Feito! O canal <#${message.channel.id}> foi registrado no banco de dados como a praça da Cidade! ☀️`);
        } catch (error) {
            console.error("Erro ao salvar configuração:", error);
            await message.reply("❌ Erro interno ao tentar salvar no banco de dados.");
        }
    }
}

export class SetAnuncioCommand {
    public static async execute(message: Message): Promise<void> {
        const serverId = message.guild!.id;
        if (!message.member?.permissions.has("Administrator")) {
            await message.reply("❌ Apenas administradores podem definir os canais do jogo.");
            return;
        }

        try {
            await GuildConfigDAO.updateGuildConfig(serverId, { canalAnuncioId: message.channel.id });
            await message.reply(`✅ Feito! O canal <#${message.channel.id}> foi registrado no banco de dados como o canal de anúncios! 📢`);
        } catch (error) {
            console.error("Erro ao salvar configuração:", error);
            await message.reply("❌ Erro interno ao tentar salvar no banco de dados.");
        }
    }
}
