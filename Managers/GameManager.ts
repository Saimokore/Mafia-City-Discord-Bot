import { ChannelType, Client, PermissionFlagsBits, TextChannel, User } from "discord.js";
import { PlayerManager } from "./PlayerManager.js";
import { Partida } from "../Player/Partida.js";
import { PartidaDAO } from "../DAOs/PartidaDAO.js";
import { PlayerDAO } from "../DAOs/PlayerDAO.js";
import { HabilidadeDAO } from "../DAOs/HabilidadeDAO.js";
import { GuildConfigDAO } from "../DAOs/GuildConfigDAO.js";
import { SkillManager } from "./SkillManager.js";
import { Player } from "../Player/Player.js";
import { OfertaDAO } from "../DAOs/OfertaDAO.js";

export class Game {
    private guildId: string;
    private client: Client;
    private cargoList: string[];
    private etapaAtual: number;

    private playerManager: PlayerManager;
    private skillManager: SkillManager;

    private transicaoEtapa: boolean;

    constructor(guildId: string, client: Client) {
        this.guildId = guildId;
        this.client = client;
        this.etapaAtual = 1;

        this.playerManager = new PlayerManager(this.guildId, this);
        this.skillManager = new SkillManager(this.guildId, this);
        
        this.cargoList = ["Evangelista", "Atirador_de_elite", "Xerife", "Bigode"];
        this.transicaoEtapa = false;
    }

    public async iniciarJogo(): Promise<void> {
        await PartidaDAO.updatePartida(this.guildId, { status: "ATIVA" });
        await this.sendAnuncio("A partida começou! O lobby está fechado. Que a cidade esteja com vocês! 🌆");

        const cargosDistribuidos = [...this.cargoList].sort(() => Math.random() - 0.5);

        const players = await this.playerManager.getAllPlayers();
        if (!players || players.length === 0) {
            console.error("Players não encontrados");
            return;
        } 
        for (const p of players) {
            await this.criarChatPlayer(p);
            
            // const cargo = cargosDistribuidos.pop();
            const cargo = "Atirador_de_elite";
            if (!cargo) {
                console.error("Cargo não encontrado (IniciarJogo)")
                return;
            }
            const cargoObj = await this.skillManager.getCargoInstance(cargo);
            const habilidades = cargoObj!.getHabilidades();

            await PlayerDAO.updatePlayer(p.getId(), { cargo: `${cargo}` });
            
            for (const hab of habilidades) {
                await HabilidadeDAO.createHabilidade(hab.getNome(), p.getUserId(), this.guildId, hab.getUso(), hab.getTipo(), hab.getEtapa());
            }
            
            await this.sendMensagemPlayer(p, "Bem-vindo à cidade! Sua jornada começa agora. Prepare-se para enfrentar os desafios que virão! 🏙️");
        }

        this.avancarEtapa();
    }

    public async terminarJogo(): Promise<void> {
        await PartidaDAO.updatePartida(this.guildId, { status: "FINALIZADA" });
        await this.sendAnuncio("A partida terminou! Obrigado por jogar! 🎉");
    }

    public async deletarJogo() {
        // deleto os chats privados
        const players = await this.playerManager.getAllPlayers();
        if (!players) {
            console.error("Players não encontrados");
            return;
        } 
        for (const player of players) {
            const userChat = player.getUserChat();
            if (userChat) {
                try {
                    const channel = await this.client.channels.fetch(userChat) as TextChannel;
                    await channel.delete("Partida finalizada, limpando canais privados.");
                } catch (error) {
                    console.warn(`Não consegui deletar o canal do jogador ${player.getUsername()}:`, error);
                    await PlayerDAO.updatePlayer(player.getId(), { userChat: null })
                }
            }
            await PlayerDAO.deletePlayer(player.getId());
        }

        //deleto a partida em si
        await PartidaDAO.deletePartida(this.guildId);
    }

    public async criarChatPlayer(player: Player): Promise<void> {
        const nome = `chat-${player.getUsername()}`;
        const userId = player.getUserId(); 
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
        await PlayerDAO.updatePlayer(player.getId(), { userChat: canalId });

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
        
        this.setTransicaoEtapa(true);
        await this.playerManager.carregarCache();

        await this.skillManager.executarActions();

        await this.playerManager.commitBatch();
        await this.skillManager.commitBatch();

        this.setTransicaoEtapa(false);
        this.playerManager.limparCache();
        
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
    
    public async sendMensagemPlayer(user: Player, mensagem: string): Promise<void> {
        try {
            const userChat = user.getUserChat();
            if (userChat) {
                const channel = await this.client.channels.fetch(userChat) as TextChannel;
                await channel.send(mensagem);
            } else {
                console.warn(`O jogador ${user.getUsername()} não tem um canal de chat registrado.`);
            }
        } catch (error) {
            console.log(`Não consegui mandar mensagem para o user ${user.getUsername()}`);
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
    
    public async processarMortePlayer(jogadorMorto: Player, jogadorAssassino: Player): Promise<boolean> {
        const cargo = jogadorMorto.getCargo();
        if (cargo) {
            return await cargo?.processarMorte(this, jogadorMorto, jogadorAssassino) || false;
        }

        return false;
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

    public isTransicaoEtapa(): boolean {
        return this.transicaoEtapa;
    }

    public setTransicaoEtapa(status: boolean) {
        this.transicaoEtapa = status;
    }

    public async iniciarNoite(): Promise<void> {
        await this.sendAnuncio(`Noite [${Math.floor(this.etapaAtual / 2)}]. O sol se põe... A cidade vai dormir. Nenhuma mensagem a mais será ouvida aqui.`);
        // await trancarCanal();
    }

    public async iniciarDia(): Promise<void> {
        await this.sendAnuncio(`Dia amanhece [${Math.floor(this.etapaAtual / 2)}]`);
        // await destrancarCanal();
    }

}