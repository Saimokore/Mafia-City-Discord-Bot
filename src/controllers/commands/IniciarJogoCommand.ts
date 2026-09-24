import { ChatInputCommandInteraction } from "discord.js";
import { PlayerService } from "../../services/PlayerService.js";
import { SkillService } from "../../services/SkillService.js";
import { DiscordChannelService } from "../../infrastructure/discord/DiscordChannelService.js";
import { PlayerDAO } from "../../daos/PlayerDAO.js";
import { PlayerEmbeds } from "../../views/embeds/PlayerEmbeds.js";

export class IniciarJogoCommand {
    public static async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild!;
            const channelService = new DiscordChannelService(guild);
            const skillService = new SkillService();
            const playerService = new PlayerService(skillService, channelService, guild.id);

            // Busca os jogadores da partida
            const players = await PlayerDAO.getAllPlayers(guild.id);

            // Chama a Service (Regra de Negócio)
            const resultado = await playerService.distribuirCargos(players);

            // Usa a View para responder ao moderador/admin
            const embedResposta = PlayerEmbeds.relatorioDistribuicao(
                resultado.sucessos,
                resultado.falhas.length
            );

            await interaction.editReply({ embeds: [embedResposta] });

        } catch (error) {
            await interaction.editReply({
                content: `❌ Falha ao iniciar distribuição: ${(error as Error).message}`
            });
        }
    }
}