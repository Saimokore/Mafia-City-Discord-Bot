import { type ChatInputCommandInteraction, type Client, type Interaction } from "discord.js";
import { AcaoCommand } from "./commands/AcaoCommand.js";
import {
    ForcarEtapaCommand,
    MatarJogadorCommand,
    ReviverJogadorCommand,
    SetCargoCommand,
    SetProtecaoCommand
} from "./commands/AdminCommands.js";
import { SetAnuncioCommand, SetDiurnoCommand } from "./commands/ConfiguracaoCommands.js";
import { IniciarJogoCommand } from "./commands/IniciarJogoCommand.js";
import {
    ConsultarJogadorCommand,
    CriarAlertaCommand,
    NovoJogadorCommand,
    PingCommand
} from "./commands/JogadorCommands.js";
import { OfertaCommand } from "./commands/OfertaCommand.js";
import {
    AvancarEtapaCommand,
    CriarPartidaCommand,
    DeletarPartidaCommand,
    EncerrarPartidaCommand,
    EntrarPartidaCommand,
    ReiniciarPartidaCommand,
    SairPartidaCommand
} from "./commands/PartidaCommands.js";
import { HabilidadeInteractionHandler } from "./handlers/HabilidadeInteractionHandler.js";
import { OfertaInteractionHandler } from "./handlers/OfertaInteractionHandler.js";
import { Game } from "../services/GameService.js";
import type { IInteractionHandler } from "./handlers/IInteractionHandler.js";
import type { ICommand } from "./commands/ICommand.js";

export class InteractionCommandHandler {
    private static commands = new Map<string, ICommand<ChatInputCommandInteraction, [game: Game]>>();
    private static interactionHandlers: IInteractionHandler[] = [];

    public static register(): void {
        const commandList: ICommand<ChatInputCommandInteraction, [game: Game]>[] = [
            new AcaoCommand(),
            new IniciarJogoCommand(),
            new OfertaCommand(),
            new ForcarEtapaCommand(),
            new MatarJogadorCommand(),
            new ReviverJogadorCommand(),
            new SetCargoCommand(),
            new SetProtecaoCommand(),
            new SetAnuncioCommand(),
            new SetDiurnoCommand(),
            new ConsultarJogadorCommand(),
            new CriarAlertaCommand(),
            new NovoJogadorCommand(),
            new PingCommand(),
            new AvancarEtapaCommand(),
            new CriarPartidaCommand(),
            new DeletarPartidaCommand(),
            new EncerrarPartidaCommand(),
            new EntrarPartidaCommand(),
            new ReiniciarPartidaCommand(),
            new SairPartidaCommand()
        ];

        for (const cmd of commandList) {
            this.commands.set(cmd.name, cmd);
        }

        this.interactionHandlers = [
            new OfertaInteractionHandler(),
            new HabilidadeInteractionHandler()
        ];
    }

    public static async execute(interaction: Interaction, client: Client): Promise<void> {
        const serverId = interaction.guildId;
        if (!serverId) {
            console.log("Id do servidor não encontrado!");
            return;
        }

        const game = new Game(serverId, client);
        if (interaction.isChatInputCommand()) {
            const command = this.commands.get(interaction.commandName);
            if (command) {
                await command.execute(interaction, game);
            }
            return;
        }

        for (const handler of this.interactionHandlers) {
            if (handler.canHandle(interaction)) {
                await handler.execute(interaction, game);
                break;
            }
        }
    }
}
