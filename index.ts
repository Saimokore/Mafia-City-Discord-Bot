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
import type { Player } from './Player/Player.js';
import type { HabilidadeDinamica } from './Player/Habilidades/HabilidadeDinamica.js';
import { Action } from './Player/Action.js';

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
        const existingPlayer = await PlayerDAO.getPlayerByUserId(message.author.id, serverId);
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

        message.reply(player.getInfo());
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

    if (message.content.startsWith(prefix +'newplayer')) {
        const fakeId = message.content.replace(prefix +'newplayer ', "");
        console.log("id: " + fakeId);

        const existingPlayer = await PlayerDAO.getPlayerByUserId(fakeId, serverId);
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

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift()?.toLowerCase();

    // 🛡️ 1. DAR PROTEÇÃO (!setprot <id> <valor>)
    if (command === 'setprot') {
        const alvoId = args[0];
        if (!args[1]) return message.reply({content: "falta coisa no comando"});
        const valor = parseInt(args[1]);

        if (!alvoId || isNaN(valor)) {
            return message.reply("Uso correto: `!setprot <id_do_jogador> <valor_da_protecao>`");
        }

        try {
            await PlayerDAO.updatePlayerByUserId(alvoId, serverId, { protecao: valor });
            message.reply(`🛡️ Proteção de **${alvoId}** alterada para **${valor}**.`);
        } catch (e) {
            message.reply("❌ Jogador não encontrado no banco de dados.");
        }
    }

    // 💀 2. MATAR JOGADOR FORÇADAMENTE (!kill <id>)
    if (command === 'kill') {
        const alvoId = args[0];
        if (!alvoId) return message.reply("Uso correto: `!kill <id_do_jogador>`");

        try {
            await PlayerDAO.updatePlayerByUserId(alvoId, serverId, { estaVivo: false });
            message.reply(`💀 Jogador **${alvoId}** foi abatido pelos deuses do Debug.`);
        } catch (e) {
            message.reply("❌ Erro ao matar jogador.");
        }
    }

    // 👼 3. REVIVER JOGADOR (!revive <id>)
    if (command === 'revive') {
        const alvoId = args[0];
        if (!alvoId) return message.reply("Uso correto: `!revive <id_do_jogador>`");

        try {
            await PlayerDAO.updatePlayerByUserId(alvoId, serverId, { estaVivo: true });
            message.reply(`👼 Jogador **${alvoId}** ressuscitou!`);
        } catch (e) {
            message.reply("❌ Erro ao reviver jogador.");
        }
    }

    // 🎭 4. FORÇAR UM CARGO ESPECÍFICO (!setcargo <id> <Nome do Cargo>)
    if (command === 'setcargo') {
        const alvoId = args[0];
        // Junta o resto dos argumentos caso o cargo tenha espaço (ex: "Atirador de Elite")
        const nomeCargo = args.slice(1).join(" "); 

        if (!alvoId || !nomeCargo) return message.reply("Uso correto: `!setcargo <id_do_jogador> <Nome_do_Cargo>`");

        try {
            await PlayerDAO.updatePlayerByUserId(alvoId, serverId, { cargo: nomeCargo });
            message.reply(`🎭 Cargo de **${alvoId}** alterado para **${nomeCargo}**. (Nota: As habilidades precisam ser recarregadas)`);
        } catch (e) {
            message.reply("❌ Erro ao alterar cargo.");
        }
    }

    // ⏩ 6. AVANÇAR ETAPA DO JOGO MANUALMENTE (!forceetapa)
    if (command === 'forceetapa') {
        try {
            await game.avancarEtapa();
            const etapaAtual = await game.getEtapaAtual();
            message.reply(`⏩ O tempo foi acelerado! O jogo agora está na etapa **${etapaAtual}**.`);
        } catch (e) {
            message.reply("❌ Erro ao forçar o avanço da etapa. O Game instanciado existe?");
            console.error(e);
        }
    }

    // =================================================================
    // 🧪 MOCK DE TESTE AUTOMATIZADO DA ENGINE ECA
    // =================================================================
    if (message.content === prefix + 'testengine') {
        message.reply("🧪 **Iniciando Teste Automatizado da Engine ECA...** Verifique o terminal!");
        console.log("\n==================================================");
        console.log("🚀 INICIANDO BATERIA DE TESTES AUTOMATIZADOS");
        console.log("==================================================");

        try {
            // 1. LIGA O MODO DE TRANSIÇÃO (Para não tentar salvar no banco)
            game.setTransicaoEtapa(true);
            game.setTeste(true);

            // 2. CRIANDO OS JOGADORES FANTASMAS (MOCK DO PRISMA)
            const mockSniper: any = {
                id: "uuid-sniper", userId: "discord-sniper", username: "Sniper (Cidade)", estaVivo: true, protecao: 0,
                cargo: "Atirador_de_elite", status: "[]", marcas: "[]", dadosExtra: "[]",
                habilidades: [{ id: "hab-snipe", nome: "Snipe", uso: 2, status: "DISPONIVEL" }]
            };

            const mockMafioso: any = {
                id: "uuid-mafioso", userId: "discord-mafioso", username: "Chefe (Máfia)", estaVivo: true, protecao: 1,
                cargo: "Mafia_lider", status: "[]", marcas: "[]", dadosExtra: "[]",
                habilidades: [{ id: "hab-massacre", nome: "Massacre", uso: 1, status: "DISPONIVEL" }]
            };

            const mockEvangelista: any = {
                id: "uuid-evangelista", userId: "discord-evangelista", username: "Padre (Cidade)", estaVivo: true, protecao: 0,
                cargo: "Evangelista", status: "[]", marcas: "[]", dadosExtra: "[]",
                habilidades: [{ id: "hab-evangelho", nome: "Evangelho", uso: 10, status: "DISPONIVEL" }]
            };

            // 3. INJETANDO NO CACHE
            const sniper = await game.getPlayerManager().loadPlayer(mockSniper);
            const mafioso = await game.getPlayerManager().loadPlayer(mockMafioso);
            const evangelista = await game.getPlayerManager().loadPlayer(mockEvangelista);
            
            // Hackeando a RAM do PlayerManager
            (game.getPlayerManager() as any).playersCache = [sniper, mafioso, evangelista];

            console.log("\n🟢 --- TESTE 1: SNIPE ---");
            const habSnipe = sniper!.getHabilidade("Snipe")!;
            
            // Criando uma Ação Falsa simulando o Modal (Acertando a Classe em cheio)
            const fakeActionSnipe = new Action({
                id: "act-1", userId: "uuid-sniper", habilidadeId: "hab-snipe", tipo: "Ofensiva", sucesso: "PENDENTE", etapa: 1,
                alvos: [{ alvoId: "uuid-mafioso" }],
                parametrosAcao: JSON.stringify({
                    palpite_classe_alinhamento: "Mafia", 
                    palpite_classe_nome: "Lider" // Note que no banco você botou "Mafia_Lider"
                })
            } as any);

            await habSnipe.ativar(game, fakeActionSnipe, "AO_AVANCAR_ETAPA");

            console.log(`💀 Mafioso morreu? ${!mafioso!.estaVivo() ? "✅ SIM" : "❌ NÃO"}`);
            console.log(`🔫 Balas devolvidas? (Usos do Snipe): ${habSnipe.getUso() === 2 ? "✅ SIM (2)" : `❌ NÃO (${habSnipe.getUso()})`}`);
            
            
            console.log("\n🟢 --- TESTE 2: EVANGELHO (A MÁQUINA DE ESTADOS) ---");
            // Ressuscitando o mafioso para o próximo teste
            mafioso!.setEstaVivo(true);
            const habEvangelho = evangelista!.getHabilidade("Evangelho")!;

            // PASSO A: Mafioso aceita a oferta. (A engine deve bloquear e pedir input)
            console.log("👉 2A. O Mafioso (que não é da Cidade) aceita o Evangelho...");
            const fakeActionAceitar = new Action({
                id: "act-2", userId: "uuid-evangelista", habilidadeId: "hab-evangelho", tipo: "Comunicacao", sucesso: "PENDENTE", etapa: 1,
                alvos: [{ alvoId: "uuid-mafioso" }], parametrosAcao: "{}"
            } as any);

            await habEvangelho.ativar(game, fakeActionAceitar, "AO_OFERTA_ACEITA");
            // Testaremos se o CriarInput e EnviarAlerta não crasharam no console.

            // PASSO B: Mafioso resolve o input (Escolhe sacrificar o Massacre)
            console.log("👉 2B. O Mafioso escolhe sacrificar a habilidade 'Massacre'...");
            const fakeActionInput = new Action({
                id: "act-3", userId: "uuid-evangelista", habilidadeId: "hab-evangelho", tipo: "Comunicacao", sucesso: "PENDENTE", etapa: 1,
                alvos: [{ alvoId: "uuid-mafioso" }],
                // Aqui nós simulamos as "variaveisColetadas" geradas pelo HabilidadeDinamica.resolverInput()
                parametrosAcao: JSON.stringify({
                    customId: "habilidade_sacrificada",
                    habilidade_sacrificada: "Massacre"
                })
            } as any);

            await habEvangelho.ativar(game, fakeActionInput, "AO_RESOLVER_INPUT");
            
            const habMassacre = mafioso!.getHabilidade("Massacre")!;
            console.log(`🚫 Massacre foi impedido? ${habMassacre.getStatus() === "IMPEDIDA" ? "✅ SIM" : "❌ NÃO"}`);
            console.log(`📝 Dado Extra salvo no Mafioso? ${mafioso!.getDadosExtra().length > 0 ? "✅ SIM" : "❌ NÃO"}`);


            // PASSO C: A Morte do Evangelista
            console.log("👉 2C. O Evangelista morre. O gatilho global deve disparar...");
            
            // O gatilho AO_MORRER não tem action e usa o TODOS_JOGADORES, então passamos a action nula e o emissorOpcional
            await habEvangelho.ativar(game, null, "AO_MORRER", evangelista!);

            console.log(`✨ Massacre foi restaurado? ${habMassacre.getStatus() === "DISPONIVEL" ? "✅ SIM" : "❌ NÃO"}`);
            console.log(`🧹 Dado Extra limpo do Mafioso? ${mafioso!.getDadosExtra().length === 0 ? "✅ SIM" : "❌ NÃO"}`);


            // 4. LIMPANDO O CACHE
            game.setTransicaoEtapa(false);
            game.setTeste(false);
            game.getPlayerManager().limparCache();

            console.log("\n✅ BATERIA DE TESTES CONCLUÍDA!");

        } catch (error) {
            console.error("❌ Ocorreu um erro catastrófico durante os testes:", error);
            game.setTransicaoEtapa(false);
            game.setTeste(false);
        }
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
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const player = await game.getPlayerManager().loadPlayer(interaction.user.id);
        const partida = await game.getPartida();
        if (!partida) {
            console.log("Partida não encontrada, interação falhou");
            return;
        }
        
        if (!player || !player.estaVivo()) {
            return interaction.editReply({ content: "Você não pode agir agora." });
        }

        if (player.getUserChat() != interaction.channelId) {
            return interaction.editReply({ content: `Use o comando no seu chat privado <#${player.getUserChat()}>` })
        } 

        // Pega as habilidades da classe dele
        const habilidades = player.getHabilidades();
        if (!habilidades || habilidades.length === 0) {
            return interaction.editReply({ content: "Você não possui habilidades para usar." });
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

        await interaction.editReply({ components: [row] });
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
        
        return interaction.reply(await game.getPlayerManager().buildOferta(oferta.id, oferta.emissorId, oferta.nomeOferta));
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
            const playerAlvo = await PlayerDAO.getPlayerByUserId(interaction.user.id, serverId);
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
        
        return interaction.reply(await game.getPlayerManager().buildOferta(oferta.id, oferta.emissorId, oferta.nomeOferta));
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

        await habilidadeInstance.resolverModal(interaction, game);
    }

    if ((interaction.isStringSelectMenu() || interaction.isModalSubmit()) && interaction.customId.startsWith('skill_input_')) {
        await interaction.deferUpdate();

        const partes = interaction.customId.split('_');

        const nomeHabilidade = partes[2];
        const emissorId = partes[3];

        const alvoPlayer = await game.getPlayerManager().loadPlayer(interaction.user.id);
        const emissorPlayer = await game.getPlayerManager().loadPlayer(emissorId!);

        if (!alvoPlayer || !emissorPlayer) {
            await interaction.followUp({ content: "❌ Erro: Jogador não encontrado.", flags: MessageFlags.Ephemeral });
            return;
        }

        const habilidade = emissorPlayer.getHabilidade(nomeHabilidade!);
        if (habilidade) {
            await (habilidade as HabilidadeDinamica).resolverInput(game, interaction as any, alvoPlayer, emissorPlayer);
            
            await interaction.editReply({ content: "✅ Resposta registrada!", components: [] });
        }
    }
});

client.login(token);
