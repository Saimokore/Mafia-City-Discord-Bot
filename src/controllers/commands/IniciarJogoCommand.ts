import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import { Game } from "../../services/GameService.js";

export class IniciarJogoCommand {
    public static async execute(interaction: ChatInputCommandInteraction): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const guild = interaction.guild;
            if (!guild) {
                await interaction.editReply({ content: "❌ Este comando só pode ser usado em um servidor." });
                return;
            }

            const game = new Game(guild.id, interaction.client);
            const partida = await game.getPartida();
            if (!partida || partida.getStatus() === "FINALIZADA") {
                await interaction.editReply({ content: "❌ Nenhuma partida foi criada neste servidor." });
                return;
            }

            await game.iniciarJogo();
            await interaction.editReply({ content: "✅ Partida iniciada." });

        } catch (error) {
            await interaction.editReply({
                content: `❌ Falha ao iniciar a partida: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
}