import type { Message } from "discord.js";
import { PlayerDAO } from "../../daos/PlayerDAO.js";
import type { Game } from "../../services/GameService.js";

export class SetProtecaoCommand {
    public static async execute(message: Message, args: string[]): Promise<void> {
        const serverId = message.guild!.id;
        const alvoId = args[0];
        if (!args[1]) {
            await message.reply({ content: "falta coisa no comando" });
            return;
        }
        const valor = parseInt(args[1]);

        if (!alvoId || isNaN(valor)) {
            await message.reply("Uso correto: `!setprot <id_do_jogador> <valor_da_protecao>`");
            return;
        }

        try {
            await PlayerDAO.updatePlayerByUserId(alvoId, serverId, { protecao: valor });
            await message.reply(`🛡️ Proteção de **${alvoId}** alterada para **${valor}**.`);
        } catch {
            await message.reply("❌ Jogador não encontrado no banco de dados.");
        }
    }
}

export class MatarJogadorCommand {
    public static async execute(message: Message, args: string[]): Promise<void> {
        const alvoId = args[0];
        if (!alvoId) {
            await message.reply("Uso correto: `!kill <id_do_jogador>`");
            return;
        }

        try {
            await PlayerDAO.updatePlayerByUserId(alvoId, message.guild!.id, { estaVivo: false });
            await message.reply(`💀 Jogador **${alvoId}** foi abatido pelos deuses do Debug.`);
        } catch {
            await message.reply("❌ Erro ao matar jogador.");
        }
    }
}

export class ReviverJogadorCommand {
    public static async execute(message: Message, args: string[]): Promise<void> {
        const alvoId = args[0];
        if (!alvoId) {
            await message.reply("Uso correto: `!revive <id_do_jogador>`");
            return;
        }

        try {
            await PlayerDAO.updatePlayerByUserId(alvoId, message.guild!.id, { estaVivo: true });
            await message.reply(`👼 Jogador **${alvoId}** ressuscitou!`);
        } catch {
            await message.reply("❌ Erro ao reviver jogador.");
        }
    }
}

export class SetCargoCommand {
    public static async execute(message: Message, args: string[]): Promise<void> {
        const alvoId = args[0];
        const nomeCargo = args.slice(1).join(" ");
        if (!alvoId || !nomeCargo) {
            await message.reply("Uso correto: `!setcargo <id_do_jogador> <Nome_do_Cargo>`");
            return;
        }

        try {
            await PlayerDAO.updatePlayerByUserId(alvoId, message.guild!.id, { cargo: nomeCargo });
            await message.reply(`🎭 Cargo de **${alvoId}** alterado para **${nomeCargo}**. (Nota: As habilidades precisam ser recarregadas)`);
        } catch {
            await message.reply("❌ Erro ao alterar cargo.");
        }
    }
}

export class ForcarEtapaCommand {
    public static async execute(message: Message, game: Game): Promise<void> {
        try {
            await game.avancarEtapa();
            const etapaAtual = await game.getEtapaAtual();
            await message.reply(`⏩ O tempo foi acelerado! O jogo agora está na etapa **${etapaAtual}**.`);
        } catch (error) {
            await message.reply("❌ Erro ao forçar o avanço da etapa. O Game instanciado existe?");
            console.error(error);
        }
    }
}
