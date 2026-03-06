import { REST, Routes, SlashCommandBuilder } from 'discord.js';
// Você vai precisar do seu Token e do ID do Bot. Se estiverem num .env, importe aqui!
// import 'dotenv/config'; 

const token = "SEU_TOKEN_AQUI"; // Coloque o token do seu bot
const clientId = "ID_DO_SEU_BOT"; // Pegue no Discord Developer Portal
const guildId = "ID_DO_SEU_SERVIDOR"; // ID do servidor de testes

// 1. Construímos a "casca" do comando
const comandos = [
    new SlashCommandBuilder()
        .setName('action')
        .setDescription('Abre o menu para você usar sua habilidade da rodada.')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(token);

// 2. Enviamos para a API do Discord
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