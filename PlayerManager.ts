import { ButtonStyle, Client, TextChannel, ActionRowBuilder, ButtonBuilder, EmbedBuilder } from "discord.js";
import { Game } from "./Game.js";
import { db } from "./database.js";
import { Carta, Player } from "./Player/Player.js";
import * as Cargo from "./Player/Cargo.js";
import * as Hab from "./Player/Habilidade.js";
import { Action } from "./Player/Actions.js";

export class PlayerManager {
    private guildId: string;
    private game: Game;
    
    constructor(guildId: string, game: Game) {
        this.game = game;
        this.guildId = guildId;
    }

    public async useHabilidade(userId: string, habilidade: Hab.Habilidade): Promise<void> {
        // const player = await this.loadPlayer(userId, this.guildId);
        // const action = new Action(userId, habilidade);

        const partida = await db.getPartida(this.guildId);
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${this.guildId}`);
            return;
        }
        await this.criarAction(userId, habilidade);

        console.log(`Jogador ${userId} usou a habilidade: ${habilidade.getNome() || "Desconhecida"}`);
    }

    public async criarAction(userId: string, habilidade: Hab.Habilidade, alvos?: string[]): Promise<void> {
        const partida = await db.getPartida(this.guildId);
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${this.guildId}`);
            return;
        }
        await db.createAction(userId, this.guildId, partida.etapaAtual, habilidade.getNome(), alvos);
    }

    public async criarOferta(emissorId: string, alvoId: string, habilidadeNome: string, nomeOferta: string, item?: string, parametros?: string): Promise<void> {
        const partida = await db.getPartida(this.guildId);
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${this.guildId}`);
            return;
        }
        const oferta = await db.criarOferta(this.guildId, emissorId, alvoId, habilidadeNome, partida.etapaAtual, nomeOferta, item, parametros);
    }

    public sendOferta(oferta: any) {
        const embed = new EmbedBuilder()
            .setTitle(`Uma Oferta foi feita para você!`)
            .setDescription(`**${oferta.emissorNome}** está te oferecendo **${oferta.nomeOferta}**.`)
            .setColor('#2b2d31')
            // .addFields(
            //     { name: '⚠️ O que acontece se aceitar?', value: this.getEfeitoAceitar(oferta.habilidadeNome) },
            //     { name: '🚫 O que acontece se recusar?', value: this.getEfeitoRecusar(oferta.habilidadeNome) }
            // )
            .setFooter({ text: 'Escolha com sabedoria. Esta decisão é permanente para esta etapa.' });

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            new ButtonBuilder()
                .setCustomId(`offer_accept_${oferta.habilidadeNome}_${oferta.alvoId}`)
                .setLabel('Aceitar')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`offer_deny_${oferta.habilidadeNome}_${oferta.alvoId}`)
                .setLabel('Recusar')
                .setStyle(ButtonStyle.Danger)
        );

        return {
            embeds: [embed],
            components: [row]
        };
    }

    // ==========================================
    // FACTORY
    // ==========================================

    public async loadPlayer(userId: string, guildId: string): Promise<Player | null> {
        const data = await db.getPlayerById(userId, guildId);

        if (!data) return null;

        const cargoInstance = this.getCargoInstance(data.cargo || "");
        if (!cargoInstance) throw new Error("Cargo inválido no banco de dados.");

        const cartasInstanciadas = data.cartas.map(c => new Carta(c.destinatario, c.mensagem));
        const itensInstanciados = data.habilidades.map(h => this.getHabilidadeInstance(h.nome)).filter(h => h !== null) as Hab.Habilidade[];

        return new Player(
            this.game,
            data.userId,
            data.username,
            data.estaVivo,
            data.distrito,
            cartasInstanciadas,
            data.quantCartas,
            cargoInstance,
            data.status.split(",").filter(s => s !== ""),
            data.marcas.split(",").filter(m => m !== ""),
            itensInstanciados,
            data.protecao || 0,
            data.userChat || "",
            [] // Itens/Habilidades extras
        );
    }

    public getCargoInstance(nomeDoCargo: string | null): Cargo.Cargo | null {
        if (!nomeDoCargo) return null;
        switch (nomeDoCargo) {
            case "Evangelista": return new Cargo.Evangelista();
            case "Atirador de Elite": return new Cargo.AtiradorDeElite();
            case "Xerife": return new Cargo.Xerife();
            case "Bigode": return new Cargo.Bigode();
            default: return null;
        }
    }

    public getHabilidadeInstance(nomeDaHabilidade: string | null): Hab.Habilidade | null {
        if (!nomeDaHabilidade) return null;
        switch (nomeDaHabilidade) {
            case "Evangelho": return new Hab.Evangelho();
            case "Palavra de Deus": return new Hab.PalavraDeDeus();

            case "Snipe": return new Hab.Snipe();
            case "Execucao Publica": return new Hab.ExecucaoPublica();

            case "Reputacao": return new Hab.Reputacao();
            case "Prender": return new Hab.Prender();
            case "Pacificacao": return new Hab.Pacificacao();
            
            case "Punho de Ferro": return new Hab.PunhoDeFerro();
            case "Matar": return new Hab.Matar();
            case "Massacre": return new Hab.Massacre();
            
            default: return null;
        }
    }
    
}