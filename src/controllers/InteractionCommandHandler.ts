import type { Client, Interaction } from "discord.js";
import { AcaoCommand } from "./commands/AcaoCommand.js";
import { IniciarJogoCommand } from "./commands/IniciarJogoCommand.js";
import { OfertaCommand } from "./commands/OfertaCommand.js";
import { HabilidadeInteractionHandler } from "./handlers/HabilidadeInteractionHandler.js";
import { OfertaInteractionHandler } from "./handlers/OfertaInteractionHandler.js";
import { Game } from "../services/GameService.js";

export class InteractionCommandHandler {
    public static async execute(interaction: Interaction, client: Client): Promise<void> {
        const serverId = interaction.guildId;
        if (!serverId) {
            console.log("Id do servidor não encontrado!");
            return;
        }

        const game = new Game(serverId, client);
        if (interaction.isChatInputCommand()) {
            if (interaction.commandName === "action") {
                await AcaoCommand.execute(interaction, game);
            } else if (interaction.commandName === "startgame") {
                await IniciarJogoCommand.execute(interaction);
            } else if (interaction.commandName === "offer") {
                await OfertaCommand.execute(interaction, game);
            }
            return;
        }

        await OfertaInteractionHandler.execute(interaction, game);
        await HabilidadeInteractionHandler.execute(interaction, game);
    }
}
