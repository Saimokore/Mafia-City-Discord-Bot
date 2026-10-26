import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import * as dotenv from 'dotenv';

dotenv.config();

const token = process.env.BOT_TOKEN!;
const clientId = process.env.CLIENT_ID!;
const guildId = process.env.GUILD_ID!;

const comandos = [
    new SlashCommandBuilder()
        .setName('action')
        .setDescription('Abre o menu para você usar sua habilidade da rodada.'),
    new SlashCommandBuilder()
        .setName('offer')
        .setDescription('Permite aceitar ou recusar uma oferta [accept/refuse]'),
    new SlashCommandBuilder()
        .setName('startgame')
        .setDescription('Inicia a partida criada neste servidor.'),
    new SlashCommandBuilder()
        .setName('setprot')
        .setDescription('Altera a proteção de um jogador.')
        .addStringOption(option => option.setName('player_id').setDescription('ID do jogador').setRequired(true))
        .addIntegerOption(option => option.setName('value').setDescription('Valor da proteção').setRequired(true)),
    new SlashCommandBuilder()
        .setName('kill')
        .setDescription('Mata um jogador.')
        .addStringOption(option => option.setName('player_id').setDescription('ID do jogador').setRequired(true)),
    new SlashCommandBuilder()
        .setName('revive')
        .setDescription('Revive um jogador.')
        .addStringOption(option => option.setName('player_id').setDescription('ID do jogador').setRequired(true)),
    new SlashCommandBuilder()
        .setName('setcargo')
        .setDescription('Altera o cargo de um jogador.')
        .addStringOption(option => option.setName('player_id').setDescription('ID do jogador').setRequired(true))
        .addStringOption(option => option.setName('cargo').setDescription('Nome do cargo').setRequired(true)),
    new SlashCommandBuilder()
        .setName('forceetapa')
        .setDescription('Força o avanço da etapa atual.'),
    new SlashCommandBuilder()
        .setName('setdiurno')
        .setDescription('Define o canal atual como canal diurno.'),
    new SlashCommandBuilder()
        .setName('setanuncio')
        .setDescription('Define o canal atual como canal de anúncios.'),
    new SlashCommandBuilder()
        .setName('me')
        .setDescription('Consulta os dados de um jogador da partida.')
        .addStringOption(option => option.setName('player_id').setDescription('ID do jogador (padrão: você)')),
    new SlashCommandBuilder()
        .setName('newplayer')
        .setDescription('Adiciona um jogador de teste à partida.')
        .addStringOption(option => option.setName('player_id').setDescription('ID do jogador').setRequired(true)),
    new SlashCommandBuilder()
        .setName('criaralerta')
        .setDescription('Cria um alerta de oferta para você.'),
    new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Verifica se o bot está respondendo.'),
    new SlashCommandBuilder()
        .setName('creategame')
        .setDescription('Cria uma partida neste servidor.'),
    new SlashCommandBuilder()
        .setName('join')
        .setDescription('Entra na partida deste servidor.'),
    new SlashCommandBuilder()
        .setName('leave')
        .setDescription('Sai da partida deste servidor.'),
    new SlashCommandBuilder()
        .setName('avancaretapa')
        .setDescription('Avança a etapa da partida.'),
    new SlashCommandBuilder()
        .setName('endgame')
        .setDescription('Encerra a partida deste servidor.'),
    new SlashCommandBuilder()
        .setName('deletegame')
        .setDescription('Exclui uma partida finalizada.'),
    new SlashCommandBuilder()
        .setName('restartgame')
        .setDescription('Reinicia a partida deste servidor.')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

async function deploy() {
    try {
        console.log(`Iniciando o deploy de ${comandos.length} comandos (/) ...`);

        // Usamos rotas de Guild (Servidor) porque atualiza instantaneamente.
        // Rotas globais demoram até 1 hora para aparecer no Discord.
        const data = await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: comandos },
        ) as any[];

        console.log(`Deploy concluído! ${data.length} comandos (/) registrados com sucesso.`);
    } catch (error) {
        console.error("Erro ao registrar comandos:", error);
    }
}

deploy();