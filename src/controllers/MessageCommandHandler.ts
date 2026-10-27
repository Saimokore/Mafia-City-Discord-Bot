import type { Client, Message } from "discord.js";
import {
    ForcarEtapaCommand,
    MatarJogadorCommand,
    ReviverJogadorCommand,
    SetCargoCommand,
    SetProtecaoCommand
} from "./commands/AdminCommands.js";
import {
    SetAnuncioCommand,
    SetDiurnoCommand
} from "./commands/ConfiguracaoCommands.js";
import {
    CriarAlertaCommand,
    ConsultarJogadorCommand,
    NovoJogadorCommand,
    PingCommand
} from "./commands/JogadorCommands.js";
import {
    AvancarEtapaCommand,
    CriarPartidaCommand,
    DeletarPartidaCommand,
    EncerrarPartidaCommand,
    EntrarPartidaCommand,
    ReiniciarPartidaCommand,
    SairPartidaCommand
} from "./commands/PartidaCommands.js";
import { GuildConfigDAO } from "../daos/GuildConfigDAO.js";
import { Game } from "../services/GameService.js";

export class MessageCommandHandler {
    
    public static async execute(message: Message, client: Client): Promise<void> {
        if (!message.guild || message.author.bot) return;

        const serverId = message.guild.id;
        const config = await GuildConfigDAO.getConfig(serverId);
        const prefix = config?.prefix || "!";
        const game = new Game(serverId, client);
        
        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift();
        const debugCommand = command?.toLowerCase();
        
        if (message.content === `${prefix}teste`) {
            // await SetDiurnoCommand.execute(message);
            return;
        }
    }
}
