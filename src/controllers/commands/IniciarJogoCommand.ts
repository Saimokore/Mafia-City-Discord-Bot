import { MessageFlags, type ChatInputCommandInteraction } from "discord.js";
import type { Game } from "../../services/GameService.js";
import type { ICommand } from "./ICommand.js";

export class IniciarJogoCommand implements ICommand<ChatInputCommandInteraction, [game: Game]> {
    public readonly name = "startgame";

    public async execute(interaction: ChatInputCommandInteraction, game: Game): Promise<void> {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const guild = interaction.guild;
            if (!guild) {
                await interaction.editReply({ content: "❌ Este comando só pode ser usado em um servidor." });
                return;
            }

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