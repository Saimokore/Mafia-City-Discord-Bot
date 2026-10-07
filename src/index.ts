import { Client, GatewayIntentBits } from "discord.js";
import * as dotenv from "dotenv";
import { InteractionCommandHandler } from "./controllers/InteractionCommandHandler.js";
import { MessageCommandHandler } from "./controllers/MessageCommandHandler.js";

dotenv.config();

const token = process.env.BOT_TOKEN!;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once("clientReady", c => {
    console.log(`✅ Logado com sucesso como ${c.user.tag}!`);
});

client.on("messageCreate", async message => {
    await MessageCommandHandler.execute(message, client);
});

client.on("interactionCreate", async interaction => {
    await InteractionCommandHandler.execute(interaction, client);
});

client.login(token);
