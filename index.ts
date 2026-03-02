import { Client, Collection, GatewayIntentBits, Message } from 'discord.js';
import tokenData from './config.json' with { type: 'json' };
import { Game } from './Game.js';
import { db } from './database.js';
import { Player, Carta } from './Player/Player.js';
import * as Cargo from './Player/Cargo.js';
import * as Hab from './Player/Habilidade.js';
import { platform } from 'node:os';
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

    if (message.content === prefix +'setanuncio') {
        if (!message.member?.permissions.has('Administrator')) {
            message.reply("❌ Apenas administradores podem definir os canais do jogo.");
            return;
        }

        try {
            await db.updateGuildConfig(serverId, { canalAnuncioId: message.channel.id });

            message.reply(`✅ Feito! O canal <#${message.channel.id}> foi registrado no banco de dados como o canal de anúncios! 📢`);
        } catch (error) {
            console.error("Erro ao salvar configuração:", error);
            message.reply("❌ Erro interno ao tentar salvar no banco de dados.");
        }
    }

    if (message.content === prefix +'creategame') {
        const partidaExistente = await db.getPartida(serverId);
        if (partidaExistente && partidaExistente.status !== "FINALIZADA") {
            message.reply("Já existe uma partida criada neste servidor. Use `!endGame` para finalizar a partida atual antes de criar uma nova.");
            return;
        } else if (partidaExistente && partidaExistente.status === "FINALIZADA") {
            message.reply("Existe uma partida finalizada neste servidor. Use `!deleteGame` para deletar a partida finalizada antes de criar uma nova.");
            return;
        }

        const config = await db.getConfig(serverId);
        if (!config.canalDiurnoId) {
            message.reply("❌ Antes de criar uma partida, defina o canal diurno usando `!setdiurno` no canal desejado.");
            return;
        } else if (!config.canalAnuncioId) {
            message.reply("❌ Antes de criar uma partida, defina o canal de anúncios usando `!setanuncio` no canal desejado.");
            return;
        }

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

    if (message.content === prefix +'startgame') {
        const partida = await db.getPartida(serverId);
        if (!partida || partida.status === "FINALIZADA") {
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

    if (message.content === prefix +'avancaretapa') {
        if (game) {
            game.avancarEtapa();
        } else {
            message.reply("Nenhuma partida ativa neste servidor.");
        }
    }

    if (message.content === prefix +'endgame') {
        if (!game) {
            message.reply("Nenhuma partida ativa neste servidor.");
            return;
        } else if (await db.getPartida(serverId).then(partida => partida?.status) === "FINALIZADA") {
            message.reply("A partida já foi finalizada. Use `!deletegame` para deletar a partida finalizada.");
            return;
        }
        game.terminarJogo();
        message.reply("Jogo terminado neste servidor!");
    }

    if (message.content === prefix +'deletegame') {
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
        
        const player = await game.getPlayerManager().loadPlayer(message.author.id, message.guild.id);

        if (!player) return message.reply("Você não está nesta partida!");

        message.reply(player.getStatus());
    }

    if (message.content === prefix +'ping') {
        message.reply('🏓 Pong!');
    }

    if (message.content === prefix +'restartgame') {
        game.terminarJogo();
        game.deletarJogo();

        await db.createPartida(serverId);
        message.reply("Jogo reiniciado neste servidor! O lobby está aberto. Digitem `!join` para entrar!");
    }

    if (message.content === prefix +'skill 1') {
        const player = await game.getPlayerManager().loadPlayer(message.author.id, message.guild.id);
        if (!player) {
            message.reply("Você não está nesta partida!");
            return;
        }
        const habilidade = player.getCargo().getHabilidades()[0];
        if (!habilidade) {
            message.reply("Habilidade não encontrada para seu cargo.");
            return;
        }

        game.getPlayerManager().useHabilidade(message.author.id, [habilidade]);
    }
});

client.login(token);