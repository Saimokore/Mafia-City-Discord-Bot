import { Client, Collection, GatewayIntentBits, Message, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags, ButtonBuilder, EmbedBuilder } from 'discord.js';
import { Game } from './Game.js';
import { db } from './database.js';
import * as dotenv from 'dotenv';
import { channel } from 'node:diagnostics_channel';

dotenv.config();

const token = process.env.BOT_TOKEN!;

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
        await game.terminarJogo();
        await game.deletarJogo();

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

        game.getPlayerManager().useHabilidade(message.author.id, habilidade);
    }

    if (message.content === prefix +'oferta') {
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

        habilidade.ofertar(game, message.author.id, [message.author.id], "Evalhosla");
    }

    if (message.content.startsWith(prefix +'newplayer')) {
        const fakeId = message.content.replace(prefix +'newplayer', "");
        console.log("id: " + fakeId);

        const existingPlayer = await db.getPlayerById(fakeId, serverId);
        if (existingPlayer) {
            message.reply("Você já está no jogo!");
            return;
        }

        await db.addPlayer(serverId, fakeId, "testbro");

        message.reply("Você entrou no jogo!");
    }
});

client.on('interactionCreate', async interaction => {

    const serverId = interaction.guildId;
    if (!serverId) {
        console.log("Id do servidor não encontrado!");
        return;
    }
    const game = new Game(serverId, client);

    if (interaction.isChatInputCommand() && interaction.commandName === 'action') {
        const player = await game.getPlayerManager().loadPlayer(interaction.user.id, serverId);
        const partida = await game.getPartida();
        if (!partida) {
            console.log("Partida não encontrada, interação falhou");
            return;
        }
        
        if (!player || !player.estaVivo()) {
            return interaction.reply({ content: "Você não pode agir agora." });
        }

        if (player.getUserChat() != interaction.channelId) {
            return interaction.reply({ content: `Use o comando no seu chat privado <#${player.getUserChat()}>`, flags: MessageFlags.Ephemeral })
        } 

        // Pega as habilidades da classe dele
        const habilidades = player.getCargo().getHabilidades();
        const habilidadesFiltradas = habilidades.filter(hab => hab.getTipo() === "Passiva" || 
            hab.getEtapa() != "Atemporal" || hab.getEtapa() != partida.getTempoEtapa());

        const opcoes = habilidadesFiltradas.map(hab => ({
            label: hab.getNome(),
            description: `Tipo: ${hab.getTipo()}`,
            value: hab.getNome()
        }));

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_habilidade_inicial')
            .setPlaceholder('Escolha uma habilidade para usar hoje')
            .addOptions(opcoes);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

        await interaction.reply({ components: [row] });
        return;
    }

    if (interaction.isChatInputCommand() && interaction.commandName === 'offer') {
        
        const player = await game.getPlayerManager().loadPlayer(interaction.user.id, serverId);
        const partida = await game.getPartida();
        if (!partida) {
            console.log("Partida não encontrada, interação falhou");
            return;
        }
        
        if (!player || !player.estaVivo()) {
            return interaction.reply({ content: "Você não pode agir agora." });
        }
        
        if (player.getUserChat() != interaction.channelId) {
            return interaction.reply({ content: `Use o comando no seu chat privado <#${player.getUserChat()}>`, flags: MessageFlags.Ephemeral })
        }
        
        const ofertas = await db.getOfertasForPlayerId(partida.getGuildId(), player.getId());
        if (!ofertas || ofertas.length === 0) {
            console.error("Oferta não encontrada");
            return interaction.reply({ content: "Você não possui nenhuma oferta!"});
        }

        if (ofertas.length > 1) {
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('offer_select')
                .setPlaceholder('Escolha uma oferta')
                .addOptions(
                    ofertas.map(of => ({
                        label: of.nomeOferta,
                        value: of.id
                    }))
                );

            const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

            return interaction.reply({ components: [row]});
        }

        const oferta = ofertas[0];
        if (!oferta) {
            console.error("seila mano nao acho a oferta");
            return;
        }
        
        return interaction.reply(await game.getPlayerManager().buildOferta(oferta.id, oferta.emissorId, oferta.nomeOferta, oferta.habilidade));
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'select_habilidade_inicial') {
        const nomeHabilidade = interaction.values[0];
        if (!nomeHabilidade) {
            await interaction.update({ content: "Habilidade inválida selecionada.", components: [] });
            return;
        }
        
        const habilidadeInstance = game.getPlayerManager().getHabilidadeInstance(nomeHabilidade);

        if (habilidadeInstance) {
            const modal = await habilidadeInstance.buildModal(interaction, game, interaction.user.id);
            if (!modal) {
                console.error("Erro ao construir o modal para a habilidade:", nomeHabilidade);
                return;
            }
            await interaction.showModal(modal);
        }
    }

    if (interaction.isButton() && interaction.customId.startsWith('offer_button')) {
        // `offer_button_accept_${nomeOferta}_${ofertaId}`)
        const partes = interaction.customId.split('_');
        const accept = partes[2] === "accept" ? true : false;
        const nomeOferta = partes[3]
        const offerId = partes[4];

        await db.updateOferta(offerId!, accept)

        const embed = new EmbedBuilder()
            .setTitle(`A Oferta ${nomeOferta} foi ${accept ? "aceita" : "recusada"}!`)
            .setColor(accept ? '#36a121' : '#b92626')

        await interaction.update({embeds: [embed], components: []})
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('offer_select')) {
        const ofertaId = interaction.values[0];
        const oferta = await db.getOfertaById(ofertaId!);
         if (!oferta) {
            console.error("seila mano nao acho a oferta");
            return;
        }
        
        return interaction.reply(await game.getPlayerManager().buildOferta(oferta.id, oferta.emissorId, oferta.nomeOferta, oferta.habilidade));
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith('skill_modal_')) {
        const partes = interaction.customId.split('_'); // ["skill", "modal", "NomeHabilidade", "userId"]
        const nomeHabilidade = partes[2];
        if (!nomeHabilidade) {
            console.error("Nome da habilidade não encontrado no customId do modal:", interaction.customId);
            await interaction.reply({ content: "Habilidade inválida. Tente novamente.", flags: MessageFlags.Ephemeral });
            return;
        }

        const habilidadeInstance = game.getPlayerManager().getHabilidadeInstance(nomeHabilidade);
        if (!habilidadeInstance) {
            console.error("Habilidade não encontrada para o modal submetido:", nomeHabilidade);
            await interaction.reply({ content: "Habilidade não encontrada. Tente novamente.", flags: MessageFlags.Ephemeral });
            return;
        }

        await habilidadeInstance.resolverModal(interaction, game, interaction.user.id);
    }
});

client.login(token);
