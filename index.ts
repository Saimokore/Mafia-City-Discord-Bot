import { Client, Collection, GatewayIntentBits, Message, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags, ButtonBuilder, EmbedBuilder } from 'discord.js';
import { Game } from './Managers/GameManager.js';
import * as dotenv from 'dotenv';
import { channel } from 'node:diagnostics_channel';
import { GuildConfigDAO } from './DAOs/GuildConfigDAO.js';
import { PartidaDAO } from './DAOs/PartidaDAO.js';
import { PlayerDAO } from './DAOs/PlayerDAO.js';
import { OfertaDAO } from './DAOs/OfertaDAO.js';
import { HabilidadeDAO } from './DAOs/HabilidadeDAO.js';
import { AlertaDAO } from './DAOs/AlertaDAO.js';

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
    const prefix = await GuildConfigDAO.getConfig(serverId).then(config => config?.prefix || '!');
    const game = new Game(message.guild.id, client);

    if (message.content === prefix +'setdiurno') {
        if (!message.member?.permissions.has('Administrator')) {
            message.reply("❌ Apenas administradores podem definir os canais do jogo.");
            return;
        }

        try {
            await GuildConfigDAO.updateGuildConfig(serverId, { canalDiurnoId: message.channel.id });

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
            await GuildConfigDAO.updateGuildConfig(serverId, { canalAnuncioId: message.channel.id });

            message.reply(`✅ Feito! O canal <#${message.channel.id}> foi registrado no banco de dados como o canal de anúncios! 📢`);
        } catch (error) {
            console.error("Erro ao salvar configuração:", error);
            message.reply("❌ Erro interno ao tentar salvar no banco de dados.");
        }
    }

    if (message.content === prefix +'creategame') {
        const partidaExistente = await PartidaDAO.getPartida(serverId);
        if (partidaExistente && partidaExistente.status !== "FINALIZADA") {
            message.reply("Já existe uma partida criada neste servidor. Use `!endGame` para finalizar a partida atual antes de criar uma nova.");
            return;
        } else if (partidaExistente && partidaExistente.status === "FINALIZADA") {
            message.reply("Existe uma partida finalizada neste servidor. Use `!deleteGame` para deletar a partida finalizada antes de criar uma nova.");
            return;
        }

        const config = await GuildConfigDAO.getConfig(serverId);
        if (!config || !config.canalDiurnoId) {
            message.reply("❌ Antes de criar uma partida, defina o canal diurno usando `!setdiurno` no canal desejado.");
            return;
        } else if (!config.canalAnuncioId) {
            message.reply("❌ Antes de criar uma partida, defina o canal de anúncios usando `!setanuncio` no canal desejado.");
            return;
        }

        await PartidaDAO.createPartida(serverId);
        message.reply("Uma nova partida foi criada! O lobby está aberto. Digitem `!join` para entrar!");
    }

    if (message.content === prefix +'join') {
        const existingPlayer = await PlayerDAO.getPlayerById(message.author.id, serverId);
        if (existingPlayer) {
            message.reply("Você já está no jogo!");
            return;
        }

        await PlayerDAO.createPlayer(serverId, message.author.id, message.author.username);

        message.reply("Você entrou no jogo!");
    }

    if (message.content === prefix +'startgame') {
        const partida = await PartidaDAO.getPartida(serverId);
        if (!partida || partida.status === "FINALIZADA") {
            message.reply("Nenhuma partida criada neste servidor.");
            return;
        }
        game.iniciarJogo();
    }

    if (message.content === prefix +'leave') {
        const removedPlayer = await PlayerDAO.deletePlayer(message.author.id);
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
        } else if (await PartidaDAO.getPartida(serverId).then(partida => partida?.status) === "FINALIZADA") {
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
        const status = await PartidaDAO.getPartida(serverId).then(partida => partida?.status);
        if (status !== "FINALIZADA") {
            message.reply("Você só pode deletar uma partida que foi finalizada. Finalize a partida primeiro usando `!endGame`.");
            return;
        }
        game.deletarJogo();
        message.reply("Jogo deletado neste servidor!");
    }

    if (message.content.startsWith(prefix +'me')) {
        let id = message.content.replace(prefix +'me ', "");
        if (!id || id === "!me") id = message.author.id;
        console.log(id);
        const player = await game.getPlayerManager().loadPlayer(id);

        if (!player) return message.reply("Você não está nesta partida!");

        message.reply(player.getStatus());
    }

    if (message.content === prefix +'ping') {
        message.reply('🏓 Pong!');
    }

    if (message.content === prefix +'restartgame') {
        await game.terminarJogo();
        await game.deletarJogo();

        await PartidaDAO.createPartida(serverId);
        message.reply("Jogo reiniciado neste servidor! O lobby está aberto. Digitem `!join` para entrar!");
    }

    if (message.content === prefix +'oferta') {
        const player = await game.getPlayerManager().loadPlayer(message.author.id);
        if (!player) {
            message.reply("Você não está nesta partida!");
            return;
        }
        const habilidade = player.getCargo()?.getHabilidades()[0];
        if (!habilidade) {
            message.reply("Habilidade não encontrada para seu cargo.");
            return;
        }

        habilidade.ofertar(game, message.author.id, [message.author.id], "Evalhosla");
    }

    if (message.content.startsWith(prefix +'newplayer')) {
        const fakeId = message.content.replace(prefix +'newplayer ', "");
        console.log("id: " + fakeId);

        const existingPlayer = await PlayerDAO.getPlayerById(fakeId, serverId);
        if (existingPlayer) {
            message.reply("Você já está no jogo!");
            return;
        }

        await PlayerDAO.createPlayer(serverId, fakeId, "testbro");

        message.reply("Você entrou no jogo!");
    }

    if (message.content.startsWith(prefix +'criaralerta')) {
        const partida = await game.getPartida();
        if (!partida) {
            message.reply("Nenhuma partida ativa neste servidor.");
            return;
        }
        await AlertaDAO.createAlerta(serverId, message.author.id, partida.getEtapaAtual(), "Você recebeu uma oferta! Digite /offer para aceitar ou recusar.")
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
        const player = await game.getPlayerManager().loadPlayer(interaction.user.id);
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
        const habilidades = player.getCargo()?.getHabilidades();
        if (!habilidades || habilidades.length === 0) {
            return interaction.reply({ content: "Você não possui habilidades para usar." });
        }
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
        
        const player = await game.getPlayerManager().loadPlayer(interaction.user.id);
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
        
        const ofertas = await OfertaDAO.getOfertasForPlayerId(partida.getGuildId(), player.getId());
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
        const userId = interaction.user.id;
        if (!nomeHabilidade) {
            await interaction.update({ content: "Habilidade inválida selecionada.", components: [] });
            return;
        }
        
        const habilidadeInstance = await game.getPlayerManager().getHabilidadePlayer(userId, nomeHabilidade);
        if (!habilidadeInstance) return;

        if (habilidadeInstance) {
            const modal = await habilidadeInstance.buildModal(interaction, game, userId);
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

        if (accept && nomeOferta === "Arrependimento") {
            const playerAlvo = await PlayerDAO.getPlayerById(interaction.user.id, serverId);
            if (!playerAlvo || !playerAlvo.cargo) {
                console.error("Player alvo não encontrado no banco de dados para oferta de Arrependimento.");
                return interaction.reply({ content: "Erro interno ao processar a oferta. Player não encontrado.", flags: MessageFlags.Ephemeral });
            }
            const cargoInstancia = game.getSkillManager().getCargoInstance(playerAlvo.cargo);

            if (cargoInstancia && cargoInstancia.getAlinhamento() !== "Cidade") {
                
                const habilidadesAtivas = playerAlvo.habilidades.filter(h => h.status !== "IMPEDIDA");

                if (habilidadesAtivas.length === 0) {
                    return interaction.reply({ content: "Você não tem habilidades ativas para perder!", flags: MessageFlags.Ephemeral });
                }

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`offer_choose_loss_${offerId}`)
                    .setPlaceholder('Escolha uma habilidade para bloquear...')
                    .addOptions(
                        habilidadesAtivas.map(hab => ({
                            label: hab.nome,
                            value: hab.id.toString()
                        }))
                    );

                const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

                return interaction.reply({ 
                    content: "Como você não é da Cidade, aceitar o Arrependimento exige um sacrifício. **Escolha uma habilidade para perder acesso até o Evangelista morrer:**", 
                    components: [row], 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }

        await OfertaDAO.updateOferta(offerId!, accept)

        const embed = new EmbedBuilder()
            .setTitle(`A Oferta ${nomeOferta} foi ${accept ? "aceita" : "recusada"}!`)
            .setColor(accept ? '#36a121' : '#b92626')

        await interaction.update({embeds: [embed], components: []})
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('offer_choose_loss_')) {
        const offerId = interaction.customId.split('_')[3];
        const habilidadeIdEscolhida = interaction.values[0];

        const parametrosJson = JSON.stringify({ habilidadePerdidaId: habilidadeIdEscolhida });
        await OfertaDAO.updateOferta(offerId!, true, parametrosJson);

        const embed = new EmbedBuilder()
            .setTitle(`Oferta de Arrependimento Aceita!`)
            .setDescription(`Você perdeu acesso à habilidade escolhida.`)
            .setColor('#36a121');

        await interaction.update({ embeds: [embed], components: [], content: "" });
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('offer_select')) {
        const ofertaId = interaction.values[0];
        const oferta = await OfertaDAO.getOfertaById(ofertaId!);
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

        const habilidade = await HabilidadeDAO.getHabilidade(nomeHabilidade, interaction.user.id, serverId);
        if (!habilidade) {
            console.error("Habilidade não encontrada select");
            interaction.reply("Erro, habilidade não encontrada");
            return;
        }

        const habilidadeInstance = await game.getPlayerManager().getHabilidadePlayer(interaction.user.id, nomeHabilidade);
        if (!habilidadeInstance) {
            console.error("Habilidade não encontrada para o modal submetido:", nomeHabilidade);
            await interaction.reply({ content: "Habilidade não encontrada. Tente novamente.", flags: MessageFlags.Ephemeral });
            return;
        }

        await habilidadeInstance.resolverModal(interaction, game, interaction.user.id);
    }
});

client.login(token);
