import { ChannelType, Client, PermissionFlagsBits, TextChannel, User } from "discord.js";
import { PlayerManager, PlayerService } from "./PlayerService.js";
import { Partida } from "../Player/Partida.js";
import { PartidaDAO } from "../daos/PartidaDAO.js";
import { PlayerDAO } from "../daos/PlayerDAO.js";
import { HabilidadeDAO } from "../daos/HabilidadeDAO.js";
import { GuildConfigDAO } from "../daos/GuildConfigDAO.js";
import { SkillManager, SkillService } from "./SkillService.js";
import { Player } from "../Player/Player.js";
import { ConditionEvaluator } from "../Player/Habilidades/ConditionEvaluator.js";
import { DiscordChannelService } from "../infrastructure/discord/DiscordChannelService.js";
import { PlayerEmbeds } from "../views/embeds/PlayerEmbeds.js";

export class Game {
    private guildId: string;
    private client: Client;
    private cargoList: string[];
    private etapaAtual: number;

    private playerService: PlayerService;
    private skillService: SkillService;
    private channelService: DiscordChannelService;

    private transicaoEtapa: boolean;
    private isTeste: boolean = false;

    constructor(guildId: string, client: Client) {
        this.guildId = guildId;
        this.client = client;
        this.etapaAtual = 1;

        this.playerService = new PlayerService(this.guildId, this);
        this.skillService = new SkillService(this.guildId, this);
        this.channelService = new DiscordChannelService(this.client.guilds.cache.get(this.guildId)!, this.client);
        
        this.cargoList = ["EVANGELISTA", "ATIRADOR_DE_ELITE", "DETETIVE", "BIGODE", "DOIDAO"];
        this.transicaoEtapa = false;
    }

    public async iniciarJogo(): Promise<void> {
        await PartidaDAO.updatePartida(this.guildId, { status: "ATIVA" });
        await this.channelService.enviarAnuncio("A partida começou! O lobby está fechado. Que a cidade esteja com vocês! 🌆");

        try {
            await this.giveCargoPlayers();
        } catch (error) {
            console.error("Erro ao iniciar o jogo:", error);
            await this.channelService.enviarAnuncio("Ocorreu um erro ao iniciar o jogo. Por favor, tente novamente mais tarde.");
            return;
        }

        this.avancarEtapa();
    }

    public async giveCargoPlayers() {
        // const cargosDistribuidos = [...this.cargoList].sort(() => Math.random() - 0.5);
        
        const players = await this.playerService.getAllPlayers();
        if (!players || players.length === 0) {
            throw new Error("Players não encontrados");
        } 

        for (const player of players) {
            try {
                const canal = await this.channelService.criarChatPrivado(player);
                player.setUserChat(canal.id);
                await PlayerDAO.updatePlayer(player.getId(), { userChat: canal.id });

                const cargoNome = "ATIRADOR_DE_ELITE";
                const cargoObj = this.skillService.getCargoInstance(cargoNome);
                if (!cargoObj) throw new Error(`Cargo ${cargoNome} não encontrado.`);

                await PlayerDAO.updatePlayer(player.getId(), { cargo: cargoNome });
                await Promise.all(
                    cargoObj.getHabilidades().map(hab =>
                        HabilidadeDAO.createHabilidade(
                            hab.getNome(),
                            player.getUserId(),
                            this.guildId,
                            hab.getUso(),
                            hab.getTipo(),
                            hab.getEtapa()
                        )
                    )
                );

                await this.channelService.enviarMensagemPrivada(
                    player,
                    { embeds: [PlayerEmbeds.boasVindasPlayer(cargoObj)] }
                );

            } catch (error) {
                console.error(`Erro ao distribuir cargo para ${player.getUsername()}:`, error);
            }
        }
    }

    public async terminarJogo(): Promise<void> {
        await PartidaDAO.updatePartida(this.guildId, { status: "FINALIZADA" });
        await this.sendAnuncio("A partida terminou! Obrigado por jogar! 🎉");
    }

    public async verificarVitoria(): Promise<boolean> {
        const players = await this.playerManager.getAllPlayers();
        if (!players || players.length === 0) return false;

        let mafiaVivos = 0;
        let cidadeVivos = 0;
        let neutrosVivos = 0;

        for (const p of players) {
            if (!p.estaVivo()) continue;

            const alinhamento = p.getAlinhamento?.() || "Neutro"; 
            
            if (alinhamento === "Mafia") mafiaVivos++;
            else if (alinhamento === "Cidade") cidadeVivos++;
            else if (alinhamento === "Neutro") neutrosVivos++;
        }

        const panoramaDoJogo: Record<string, unknown> = {
            "vivos_mafia": mafiaVivos,
            "vivos_cidade": cidadeVivos,
            "vivos_neutros": neutrosVivos,
            "vivos_todos": mafiaVivos + cidadeVivos + neutrosVivos,
            "vivos_inimigos": mafiaVivos + cidadeVivos
        };

        const avaliador = new ConditionEvaluator();

        for (const p of players) {
            const cargo = p.getCargo();
            if (cargo && p.getAlinhamento?.() === "Neutro") {
                const condicoesVitoria = cargo.getCondicoesVitoria();
                const condicoes = condicoesVitoria.condicoes || [];

                const passou = await avaliador.avaliar(this, condicoes, p, p, panoramaDoJogo);
                
                if (passou) {
                    return await this.processarVitoria(`🃏 **FIM DE JOGO!** O **${cargo.getNome()}** (${p.getUsername()}) atingiu seu objetivo e venceu o jogo sozinho!`, condicoesVitoria.vitoriaContinua);
                }
            }
        }

        if (mafiaVivos > 0 && mafiaVivos >= (cidadeVivos + neutrosVivos)) {
            return await this.processarVitoria("🔪 **FIM DE JOGO!** A Máfia subjugou os últimos resistentes e tomou controle da cidade!", false);
        }

        if (mafiaVivos === 0 && cidadeVivos > 0) {
            return await this.processarVitoria("🕊️ **FIM DE JOGO!** A Cidade eliminou todas a mafia!", false);
        }

        return false;
    }

    public async processarVitoria(mensagem: string, vitoriaContinua?: boolean): Promise<boolean> {
        await this.sendAnuncio(mensagem);
        if (vitoriaContinua) {
            await this.sendAnuncio("O jogo continua, mas o vencedor já é conhecido! 🎉");
            return true;
        } else await this.terminarJogo();

        return true;
    }

    public async deletarJogo() {
        // deleto os chats privados
        try {
            const players = await this.playerManager.getAllPlayers();
            if (!players) throw new Error("Players não encontrados");
            for (const player of players) {
                const userChat = player.getUserChat();
                
                await this.discordChannelService.deletarCanal(userChat);                
                await PlayerDAO.deletePlayer(player.getId());
            }
        } catch (error) {
            console.error("Players não encontrados: " + error);
        }

        //deleto a partida em si
        await PartidaDAO.deletePartida(this.guildId);
    }

    public async avancarEtapa(): Promise<void> {
        
        this.setTransicaoEtapa(true);
        await this.playerManager.carregarCache();

        await this.skillManager.executarGatilhos();

        await this.playerManager.commitBatch();
        await this.skillManager.commitBatch();

        // await this.verificarVitoria();

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
        await this.playerManager.updatePlayer(jogadorMorto, { estaVivo: false });

        const habilidadesDoMorto = jogadorMorto.getHabilidades() || [];
        for (const hab of habilidadesDoMorto) {
            await hab.ativar(this, null, "AO_MORRER"); 
        }

        await this.getSkillManager().criarAlerta(jogadorMorto, "Você morreu!");

        return true;
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

    public getClient(): Client {
        return this.client;
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

    public setTeste(isTeste: boolean) {
        this.isTeste = isTeste;
    }

    public getIsTeste(): boolean {
        return this.isTeste;
    }

}