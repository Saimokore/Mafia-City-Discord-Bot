import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import * as dotenv from 'dotenv';

dotenv.config();

const token = process.env.BOT_TOKEN!;
const clientId = process.env.CLIENT_ID!;
const guildId = process.env.GUILD_ID!;

const comandos = [
    new SlashCommandBuilder()
        .setName('action')
        .setDescription('Abre o menu para você usar sua habilidade da rodada.')
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