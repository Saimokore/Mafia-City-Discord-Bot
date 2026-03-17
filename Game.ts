import { ChannelType, Client, PermissionFlagsBits, TextChannel, User } from "discord.js";
import { PlayerManager } from "./PlayerManager.js";
import { Partida } from "./Player/Partida.js";
import { PartidaDAO } from "./DAOs/PartidaDAO.js";
import { PlayerDAO } from "./DAOs/PlayerDAO.js";
import { HabilidadeDAO } from "./DAOs/HabilidadeDAO.js";
import { GuildConfigDAO } from "./DAOs/GuildConfigDAO.js";
import { ActionDAO } from "./DAOs/ActionDAO.js";
import { OfertaDAO } from "./DAOs/OfertaDAO.js";
import { SkillManager } from "./SkillManager.js";

export class Game {
    private guildId: string;
    private client: Client;
    private cargoList: string[];
    private etapaAtual: number;

    private playerManager: PlayerManager;
    private skillManager: SkillManager;

    constructor(guildId: string, client: Client) {
        this.guildId = guildId;
        this.client = client;
        this.etapaAtual = 1;

        this.playerManager = new PlayerManager(this.guildId, this);
        this.skillManager = new SkillManager(this.guildId, this);
        
        this.cargoList = ["Evangelista", "Atirador de Elite", "Xerife", "Bigode"];
    }

    // ==========================================
    // MENSAGERIA (Interação com o Discord)
    // ==========================================

    public async iniciarJogo(): Promise<void> {
        await PartidaDAO.updatePartida(this.guildId, { status: "ATIVA" });
        await this.sendAnuncio("A partida começou! O lobby está fechado. Que a cidade esteja com vocês! 🌆");

        const cargosDistribuidos = [...this.cargoList].sort(() => Math.random() - 0.5);

        const players = await PlayerDAO.getPlayers(this.guildId);
        if (!players || players.length === 0) {
            console.error("Players não encontrados");
            return;
        } 
        for (const p of players) {
            await this.criarChatPlayer(`chat-${p.username}`, p.userId);
            
            // const cargo = cargosDistribuidos.pop();
            const cargo = "Evangelista";
            if (!cargo) {
                console.error("Cargo não encontrado (IniciarJogo)")
                return;
            }
            const cargoObj = await this.skillManager.getCargoInstance(cargo);
            const habilidades = cargoObj!.getHabilidades();

            await PlayerDAO.updatePlayer(p.userId, this.guildId, { cargo: `${cargo}` });
            
            for (const hab of habilidades) {
                await HabilidadeDAO.createHabilidade(hab.getNome(), p.userId, this.guildId, hab.getUso(), hab.getTipo(), hab.getEtapa());
            }
            
            await this.sendMensagemPlayer(p.userId, "Bem-vindo à cidade! Sua jornada começa agora. Prepare-se para enfrentar os desafios que virão! 🏙️");
            
            const player = await this.playerManager.loadPlayer(p.userId)
        }

        this.avancarEtapa();
    }

    public async terminarJogo(): Promise<void> {
        await PartidaDAO.updatePartida(this.guildId, { status: "FINALIZADA" });
        await this.sendAnuncio("A partida terminou! Obrigado por jogar! 🎉");
    }

    public async deletarJogo() {
        // deleto os chats privados
        const players = await PlayerDAO.getPlayers(this.guildId);
        if (!players || players.length === 0) {
            console.error("Players não encontrados");
            return;
        } 
        for (const player of players) {
            const userChat = await PlayerDAO.getPlayerById(player.userId, this.guildId).then(p => p?.userChat);
            if (userChat) {
                try {
                    const channel = await this.client.channels.fetch(userChat) as TextChannel;
                    await channel.delete("Partida finalizada, limpando canais privados.");
                } catch (error) {
                    console.warn(`Não consegui deletar o canal do jogador ${player.userId}:`, error);
                    await PlayerDAO.updatePlayer(player.userId, player.guildId, { userChat: null })
                }
            }
            await PlayerDAO.deletePlayer(player.id);
        }

        //deleto a partida em si
        await PartidaDAO.deletePartida(this.guildId);
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
            // permissionOverwrites: permissoes,
            reason: 'Novo chat privado para o jogo'
        });

        const canalId = canal.id;
        await PlayerDAO.updatePlayer(userId, this.guildId, { userChat: canalId });

        console.log(`Canal ${canal.name} criado com sucesso!`);
    }

    public async sendAnuncio(mensagem: string): Promise<void> {
        const config = await GuildConfigDAO.getConfig(this.guildId);
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

    public async avancarEtapa(): Promise<void> {
        await this.skillManager.executarActions();
        await this.playerManager.sendPlayersStatus();

        this.etapaAtual = await PartidaDAO.getPartida(this.guildId).then(p => p!.etapaAtual);
        this.etapaAtual++;
        await PartidaDAO.updatePartida(this.guildId, { etapaAtual: this.etapaAtual });

        if (this.etapaAtual % 2 === 0) {
            await this.iniciarDia();
        } else {
            await this.iniciarNoite();
        }
    }
    
    public async sendMensagemPlayer(userId: string, mensagem: string): Promise<void> {
        try {
            const userChat = await this.playerManager.loadPlayer(userId).then(player => player?.getUserChat());
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
    
    public async getPartida(): Promise<Partida | null> {
        const partida = await PartidaDAO.getPartida(this.guildId);
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
    
    public async processarMortePlayer(jogadorMortoId: string): Promise<void> {
        const jogadorMorto = await PlayerDAO.getPlayerById(jogadorMortoId, this.guildId);
        
        await PlayerDAO.updatePlayer(jogadorMortoId, this.guildId, { estaVivo: false });
        this.skillManager.criarAlerta(jogadorMortoId, "Você morreu!");
        
        if (jogadorMorto?.cargo === "Evangelista") {
            const todosJogadores = await PlayerDAO.getPlayers(this.guildId);
            if (!todosJogadores || todosJogadores.length === 0) {
                console.error("Players não encontrados");
                return;
            }
            
            for (const player of todosJogadores) {
                let dadosExtra = JSON.parse(player.dadosExtra || "[]");

                if (!Array.isArray(dadosExtra)) {
                    console.warn(`[Aviso] dadosExtra de ${jogadorMortoId} não era um array. Resetando para [].`);
                    dadosExtra = [];
                }
                
                const dadosExtraMaldiçao = dadosExtra.find((m: any) => m.tipo === "IMPEDIDA_EVANGELHO" && m.evangelistaId === jogadorMortoId);
                
                if (dadosExtraMaldiçao) {
                    await HabilidadeDAO.updateHabilidade(dadosExtraMaldiçao.habilidadeId, { status: "ATIVA" });
                    
                    const novasMarcas = dadosExtra.filter((m: any) => m !== dadosExtraMaldiçao);
                    await PlayerDAO.updatePlayer(player.userId, this.guildId, { marcas: JSON.stringify(novasMarcas) });
                    
                    // await this.sendMensagemPlayer(player.userId, "🔔 O Evangelista faleceu! Sua habilidade perdida foi restaurada e pode ser usada novamente.");
                    // checar se devo realmente avisar o player que ele possui sua habilidade denovo, provavel que não
                }
            }
        }
    }
    
    public getPlayerManager(): PlayerManager {
        return this.playerManager;
    }

    public getSkillManager(): SkillManager {
        return this.skillManager;
    }
    
    public getGuildId(): string {
        return this.guildId;
    }
    
    public async getEtapaAtual(): Promise<number> {
        this.etapaAtual = await PartidaDAO.getPartida(this.guildId).then(p => p!.etapaAtual);
        return this.etapaAtual;
    }

    public getCargos() {
        const cargos = [];
        for (const cargo of this.cargoList) {
            cargos.push(this.skillManager.getCargoInstance(cargo))
        }
        return cargos;
    }

    // ==========================================
    // REGRAS DE NEGÓCIO (O Jogo em Si)
    // ==========================================

    public async iniciarNoite(): Promise<void> {
        await this.sendAnuncio(`Noite [${Math.floor(this.etapaAtual / 2)}]. O sol se põe... A cidade vai dormir. Nenhuma mensagem a mais será ouvida aqui.`);
        // await trancarCanal();
    }

    public async iniciarDia(): Promise<void> {
        await this.sendAnuncio(`Dia amanhece [${Math.floor(this.etapaAtual / 2)}]`);
        // await destrancarCanal();
    }

}