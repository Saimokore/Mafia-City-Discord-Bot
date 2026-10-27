import { MessageFlags, type ChatInputCommandInteraction, type Message } from "discord.js";
import { GuildConfigDAO } from "../../daos/GuildConfigDAO.js";
import type { Game } from "../../services/GameService.js";
import type { ICommand } from "./ICommand.js";

export class SetDiurnoCommand implements ICommand<ChatInputCommandInteraction, [game: Game]> {
    public readonly name = "setdiurno";

    public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.memberPermissions?.has("Administrator")) {
            await interaction.reply({ content: "❌ Apenas administradores podem definir os canais do jogo.", flags: MessageFlags.Ephemeral });
            return;
        }
        const channel = interaction.guild?.channels.cache.get(interaction.channelId);

        if (channel?.name.startsWith("chat-")) {
            await interaction.reply({ content: "❌ Canais de privados de jogadores não podem ser definidos como canais de anúncios.", flags: MessageFlags.Ephemeral });
            return;
        }

        try {
            await GuildConfigDAO.updateGuildConfig(interaction.guildId!, { canalDiurnoId: interaction.channelId });
            await interaction.reply(`✅ Feito! O canal <#${interaction.channelId}> foi registrado no banco de dados como a praça da Cidade! ☀️`);
        } catch (error) {
            console.error("Erro ao salvar configuração:", error);
            await interaction.reply({ content: "❌ Erro interno ao tentar salvar no banco de dados.", flags: MessageFlags.Ephemeral });
        }
    }
}

export class SetAnuncioCommand implements ICommand<ChatInputCommandInteraction, [game: Game]> {
    public readonly name = "setanuncio";

    public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        if (!interaction.memberPermissions?.has("Administrator")) {
            await interaction.reply({ content: "❌ Apenas administradores podem definir os canais do jogo.", flags: MessageFlags.Ephemeral });
            return;
        }

        const channel = interaction.guild?.channels.cache.get(interaction.channelId);

        if (channel?.name.startsWith("chat-")) {
            await interaction.reply({ content: "❌ Canais de privados de jogadores não podem ser definidos como canais de anúncios.", flags: MessageFlags.Ephemeral });
            return;
        }

        try {
            await GuildConfigDAO.updateGuildConfig(interaction.guildId!, { canalAnuncioId: interaction.channelId });
            await interaction.reply(`✅ Feito! O canal <#${interaction.channelId}> foi registrado no banco de dados como o canal de anúncios! 📢`);
        } catch (error) {
            console.error("Erro ao salvar configuração:", error);
            await interaction.reply({ content: "❌ Erro interno ao tentar salvar no banco de dados.", flags: MessageFlags.Ephemeral });
        }
    }
}
