import { ChannelType, Client, PermissionFlagsBits, TextChannel, User } from "discord.js";
import { db } from "./database.js";
import * as Cargo from "./Player/Cargo.js";
import { use } from "react";
import { Carta, Player } from "./Player/Player.js";
import { PlayerManager } from "./PlayerManager.js";
import { Partida } from "./Player/Partida.js";

export class Game {
    private guildId: string;
    private playerManager: PlayerManager;
    private client: Client;
    private cargoList: string[];

    private jogadoresBloqueados: Set<string> = new Set();

    constructor(guildId: string, client: Client) {
        this.guildId = guildId;
        this.client = client;
        this.playerManager = new PlayerManager(this.guildId, this);
        
        this.cargoList = ["Evangelista", "Atirador de Elite", "Xerife", "Bigode"];
    }

    // ==========================================
    // MENSAGERIA (Interação com o Discord)
    // ==========================================

    public async iniciarJogo(): Promise<void> {
        await db.updatePartida(this.guildId, { status: "ATIVA" });
        await this.sendAnuncio("A partida começou! O lobby está fechado. Que a cidade esteja com vocês! 🌆");

        const cargosDistribuidos = [...this.cargoList].sort(() => Math.random() - 0.5);

        const players = await db.getPlayers(this.guildId);
        for (const p of players) {
            await this.criarChatPlayer(`chat-${p.username}`, p.userId);
            
            const cargo = cargosDistribuidos.pop();

            await db.updatePlayer(p.userId, this.guildId, { cargo: `${cargo}` });
            
            await this.sendMensagemPlayer(p.userId, "Bem-vindo à cidade! Sua jornada começa agora. Prepare-se para enfrentar os desafios que virão! 🏙️");
            
            const player = await this.playerManager.loadPlayer(p.userId, p.partidaId)
            this.sendMensagemPlayer(p.userId, player?.getStatus() || "Erro ao obter status do jogador.");
        }

        this.avancarEtapa();
    }

    public async terminarJogo(): Promise<void> {
        await db.updatePartida(this.guildId, { status: "FINALIZADA" });
        await this.sendAnuncio("A partida terminou! Obrigado por jogar! 🎉");
    }

    public async deletarJogo() {
        // deleto os chats privados
        const players = await db.getPlayers(this.guildId);
        for (const player of players) {
            const userChat = await db.getPlayerById(player.userId, this.guildId).then(p => p?.userChat);
            if (userChat) {
                try {
                    const channel = await this.client.channels.fetch(userChat) as TextChannel;
                    await channel.delete("Partida finalizada, limpando canais privados.");
                } catch (error) {
                    console.warn(`Não consegui deletar o canal do jogador ${player.userId}:`, error);
                }
            }
        }

        //deleto a partida em si
        await db.removePartida(this.guildId);
    }

    public async criarChatPlayer(nome: string, userId: string): Promise<void> {
        const guild = await this.client.guilds.fetch(this.guildId);

        const permissoes = [
            {
                id: guild.id, // @everyone
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: userId,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
            }
        ];

        const canal = await guild.channels.create({
            name: nome,
            type: ChannelType.GuildText,
            permissionOverwrites: permissoes,
            reason: 'Novo chat privado para o jogo'
        });

        const canalId = canal.id;
        await db.updatePlayer(userId, this.guildId, { userChat: canalId });

        console.log(`Canal ${canal.name} criado com sucesso!`);
    }

    public async sendAnuncio(mensagem: string): Promise<void> {
        const config = await db.getConfig(this.guildId);
        if (!config || !config.canalAnuncioId) return;

        try {
            const canal = await this.client.channels.fetch(config.canalAnuncioId) as TextChannel;
            if (canal) {
                await canal.send(`📢 **ANÚNCIO DA CIDADE:**\n${mensagem}`);
            }
        } catch (error) {
            console.error("Erro ao enviar anúncio. O canal ainda existe?", error);
        }
    }

    public async sendMensagemPlayer(userId: string, mensagem: string): Promise<void> {
        try {
            const userChat = await db.getPlayerById(userId, this.guildId).then(player => player?.userChat);
            if (userChat) {
                const channel = await this.client.channels.fetch(userChat) as TextChannel;
                await channel.send(mensagem);
            } else {
                console.warn(`O jogador ${userId} não tem um canal de chat registrado.`);
            }
        } catch (error) {
            console.log(`Não consegui mandar mensagem para o user ${userId}`);
        }
    }

    public async avancarEtapa(): Promise<void> {
        let etapaAtual = await db.getPartida(this.guildId).then(partida => partida?.etapaAtual || 1);
        etapaAtual++;
        await db.updatePartida(this.guildId, { etapaAtual });

        if (etapaAtual % 2 === 0) {
            await this.iniciarDia(etapaAtual);
        } else {
            await this.iniciarNoite(etapaAtual);
        }
    }

    public bloquearJogador(userId: string): void {
        this.jogadoresBloqueados.add(userId);
    }

    public isBloqueado(userId: string): boolean {
        return this.jogadoresBloqueados.has(userId);
    }

    public async executarActions() {
        const partida = await db.getPartida(this.guildId);
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${this.guildId}`);
            return;
        }

        const ofertas = await db.getOfertas(this.guildId, partida.etapaAtual);
        for (const oferta of ofertas) {
            if (oferta.etapa == partida.etapaAtual) {
                console.log("Oferta da etapa atual, só sera processada próxima rodada");
                continue;
            }
            const habilidade = this.playerManager.getHabilidadeInstance(oferta.habilidade);
            if (!habilidade) {
                console.error(`Habilidade ${oferta.habilidade} não encontrada para oferta do jogador ${oferta.emissorId}.`);
                continue;
            }
            await habilidade.resolverOferta(this, oferta.emissorId, oferta.alvoId, oferta.status === "ACEITA" ? true : false);
            await db.deleteOferta(oferta.id);
        }

        const actions = await db.getActionsByEtapa(this.guildId, partida.etapaAtual);
        if (actions.length === 0) {
            console.log(`Nenhuma ação registrada para a etapa ${partida.etapaAtual}.`);
            return;
        }

        this.jogadoresBloqueados.clear();

        actions.sort((a, b) => {
            const habA = this.playerManager.getHabilidadeInstance(a.habilidade.nome)?.getPrioridade() || 0;
            const habB = this.playerManager.getHabilidadeInstance(b.habilidade.nome)?.getPrioridade() || 0;
            return habB - habA;
        });

        for (const action of actions) {
            const habilidadeDB = action.habilidade;
            const alvos = action.alvo.map(a => a.alvoId);
            const player = action.userId;

            if (habilidadeDB.status === "IMPEDIDA") {
                console.log(`Habilidade ${habilidadeDB.nome} do jogador ${player} está impedida e não pode ser usada.`);
                continue;
            }

            const habilidade = this.playerManager.getHabilidadeInstance(habilidadeDB.nome);
            if (!habilidade) {
                console.error(`Habilidade ${habilidadeDB.nome} não encontrada para ação do jogador ${action.userId}.`);
                continue;
            }

            if (alvos.length > 0) {
                // tem que ter algo que permita não usar habilidade que não sao item ou gratis e tal
                habilidade.usarHabilidade(this, player, alvos);
            } else {
                habilidade.usarHabilidade(this, player);
            }

        }
    }

    public async getPartida(): Promise<Partida | null> {
        const partida = await db.getPartida(this.guildId);
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${this.guildId}`);
            return null;
        }
        const partidaObj = new Partida(partida.id, this.guildId, partida.status, partida.etapaAtual);
        return partidaObj;
    }

    public async executarInstantAction() {
        // deixar isso pra depois
    }

    public getPlayerManager(): PlayerManager {
        return this.playerManager;
    }

    public getGuildId(): string {
        return this.guildId;
    }

    // ==========================================
    // REGRAS DE NEGÓCIO (O Jogo em Si)
    // ==========================================

    public async iniciarNoite(etapa: number): Promise<void> {
        await this.sendAnuncio(`Noite [${Math.floor(etapa / 2)}]. O sol se põe... A cidade vai dormir. Nenhuma mensagem a mais será ouvida aqui.`);
        
        // await trancarCanal();
    }

    public async iniciarDia(etapa: number): Promise<void> {
        await this.sendAnuncio(`Dia amanhece [${Math.floor(etapa / 2)}]`);
        
        // await destrancarCanal();
    }

}