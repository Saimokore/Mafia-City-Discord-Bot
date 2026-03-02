import { Client, Collection, GatewayIntentBits, Message } from 'discord.js';
import tokenData from './config.json' with { type: 'json' };
import { Game } from './Game.js';
import { db } from './database.js';
import type { Player } from './Player/Player.js';
const { token } = tokenData;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('clientReady', (c) => {
    console.log(`✅ Logado com sucesso como ${c.user.tag}!`);
});

client.on('messageCreate', async (message: Message) => {
    if (!message.guild || message.author.bot) return;

    const serverId = message.guild.id;
    const prefix = await db.getConfig(serverId).then(config => config.prefix || '!');
    const game = new Game(message.guild.id, client);

    if (message.content === prefix +'setdiurno') {
        if (!message.member?.permissions.has('Administrator')) {
            message.reply("❌ Apenas administradores podem definir os canais do jogo.");
            return;
        }

        try {
            await db.updateGuildConfig(serverId, { canalDiurnoId: message.channel.id });

            message.reply(`✅ Feito! O canal <#${message.channel.id}> foi registrado no banco de dados como a praça da Cidade! ☀️`);
        } catch (error) {
            console.error("Erro ao salvar configuração:", error);
            message.reply("❌ Erro interno ao tentar salvar no banco de dados.");
        }
    }

    if (message.content === prefix +'createGame') {
        const partidaExistente = await db.getPartida(serverId);
        if (partidaExistente) {
            message.reply("Já existe uma partida criada neste servidor. Use `!endGame` para finalizar a partida atual antes de criar uma nova.");
            return;
        }
        const 

        await db.createPartida(serverId);
        message.reply("Uma nova partida foi criada! O lobby está aberto. Digitem `!join` para entrar!");
    }

    if (message.content === prefix +'join') {
        const existingPlayer = await db.getPlayerById(message.author.id, serverId);
        if (existingPlayer) {
            message.reply("Você já está no jogo!");
            return;
        }

        await db.addPlayer(serverId, message.author.id, message.author.username);

        message.reply("Você entrou no jogo!");
    }

    if (message.content === prefix +'startGame') {
        const status = await db.updatePartida(serverId, { status: "ATIVA" });
        if (!status) {
            message.reply("Nenhuma partida criada neste servidor.");
            return;
        }
        game.iniciarJogo();
    }

    if (message.content === prefix +'leave') {
        const removedPlayer = await db.removePlayer(message.author.id);
        if (!removedPlayer) {
            message.reply("Você não está no jogo!");
            return;
        }
        message.reply("Você saiu do jogo!");
    }

    if (message.content === prefix +'avancarEtapa') {
        if (game) {
            game.avancarEtapa();
        } else {
            message.reply("Nenhuma partida ativa neste servidor.");
        }
    }

    if (message.content === prefix +'endGame') {
        if (!game) {
            message.reply("Nenhuma partida ativa neste servidor.");
            return;
        }
        game.terminarJogo();
        message.reply("Jogo terminado neste servidor!");
    }

    if (message.content === prefix +'deleteGame') {
        if (!game) {
            message.reply("Nenhuma partida ativa neste servidor.");
            return;
        }
        const status = await db.getPartida(serverId).then(partida => partida?.status);
        if (status !== "FINALIZADA") {
            message.reply("Você só pode deletar uma partida que foi finalizada. Finalize a partida primeiro usando `!endGame`.");
            return;
        }
        game.deletarJogo();
        message.reply("Jogo deletado neste servidor!");
    }

    if (message.content === prefix +'me') {
        const player = await db.getPlayerById(message.author.id, serverId);
        const cargo = player?.cargo || "Nenhum cargo atribuído";
        

    }

    if (message.content === prefix +'ping') {
        message.reply('🏓 Pong!');
    }
});

client.login(token);