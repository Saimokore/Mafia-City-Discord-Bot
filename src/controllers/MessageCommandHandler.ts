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

        if (message.content === `${prefix}setdiurno`) {
            await SetDiurnoCommand.execute(message);
            return;
        }
        if (message.content === `${prefix}setanuncio`) {
            await SetAnuncioCommand.execute(message);
            return;
        }
        if (message.content.startsWith(`${prefix}me`)) {
            let id = message.content.replace(`${prefix}me `, "");
            if (!id || id === "!me") id = message.author.id;
            await ConsultarJogadorCommand.execute(message, game, id);
            return;
        }
        if (message.content.startsWith(`${prefix}newplayer`)) {
            const fakeId = message.content.replace(`${prefix}newplayer `, "");
            await NovoJogadorCommand.execute(message, fakeId);
            return;
        }
        if (message.content.startsWith(`${prefix}criaralerta`)) {
            await CriarAlertaCommand.execute(message, game);
            return;
        }

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const command = args.shift();
        const debugCommand = command?.toLowerCase();

        switch (command) {
            case "creategame":
                if (message.content === `${prefix}creategame`) await CriarPartidaCommand.execute(message);
                return;
            case "join":
                if (message.content === `${prefix}join`) await EntrarPartidaCommand.execute(message);
                return;
            case "leave":
                if (message.content === `${prefix}leave`) await SairPartidaCommand.execute(message);
                return;
            case "avancaretapa":
                if (message.content === `${prefix}avancaretapa`) await AvancarEtapaCommand.execute(message, game);
                return;
            case "endgame":
                if (message.content === `${prefix}endgame`) await EncerrarPartidaCommand.execute(message, game);
                return;
            case "deletegame":
                if (message.content === `${prefix}deletegame`) await DeletarPartidaCommand.execute(message, game);
                return;
            case "ping":
                if (message.content === `${prefix}ping`) await PingCommand.execute(message);
                return;
            case "restartgame":
                if (message.content === `${prefix}restartgame`) await ReiniciarPartidaCommand.execute(message, game);
                return;
        }

        switch (debugCommand) {
            case "setprot":
                await SetProtecaoCommand.execute(message, args);
                return;
            case "kill":
                await MatarJogadorCommand.execute(message, args);
                return;
            case "revive":
                await ReviverJogadorCommand.execute(message, args);
                return;
            case "setcargo":
                await SetCargoCommand.execute(message, args);
                return;
            case "forceetapa":
                await ForcarEtapaCommand.execute(message, game);
                return;
            case "testengine":
                return;
        }
    }
}
