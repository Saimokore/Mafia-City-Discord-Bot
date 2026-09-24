import { Guild, Client, PermissionFlagsBits, ChannelType, TextChannel } from "discord.js";
import type { Player } from "../../domain/entities/Player.js";
import { GuildConfigDAO } from "../../daos/GuildConfigDAO.js";

export class DiscordChannelService {
    constructor(private guild: Guild, private client: Client) {}

    public async criarChatPrivado(player: Player, categoriaId?: string): Promise<TextChannel> {
        try {
            const nome = `chat-${player.getUsername().toLowerCase().replace(/\s+/g, "-")}`;

            const permissoes = [
                {
                    id: this.guild.roles.everyone.id, // @everyone
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: player.getUserId(),
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                }
            ];

            return await this.guild.channels.create({
                name: nome,
                type: ChannelType.GuildText,
                permissionOverwrites: permissoes
            });
            
        } catch (error) {
            throw new Error(`Falha de permissão ao criar canal para ${player.getUsername()}: ${(error as Error).message}`);
        }
    }

    public async enviarMensagemPrivada(player: Player, mensagem: string | object): Promise<void> {
        try {
            const userChat = player.getUserChat();
            if (!userChat) return;

            const channel = await this.client.channels.fetch(userChat) as TextChannel | null;
            if (channel) {
                if (typeof mensagem === "string") {
                    await channel.send(mensagem);
                } else {
                    await channel.send(mensagem as any);
                }
            }
        } catch (error) {
            console.warn(`[Discord] Falha ao enviar mensagem para ${player.getUsername()}:`, error);
        }
    }

    public async deletarCanal(channelId: string): Promise<void> {
        try {
            const channel = await this.client.channels.fetch(channelId) as TextChannel | null;
            if (channel) {
                await channel.delete("Limpeza de canais do jogo.");
            }
        } catch (error) {
            console.warn(`[Discord] Não foi possível deletar canal ${channelId}:`, error);
        }
    }

    public async enviarAnuncio(mensagem: string): Promise<void> {
        const config = await GuildConfigDAO.getConfig(this.guild.id);
        if (!config || !config.canalAnuncioId) return;

        try {
            const canal = await this.client.channels.fetch(config.canalAnuncioId) as TextChannel | null;
            if (canal) {
                await canal.send(`📢 **ANÚNCIO DA CIDADE:**\n${mensagem}`);
            }
        } catch (error) {
            console.error("[Discord] Falha ao enviar anúncio global:", error);
        }
    }
}