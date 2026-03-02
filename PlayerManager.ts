import { Game } from "./Game.js";
import { Client, TextChannel } from "discord.js";
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

    public async useHabilidade(userId: string, habilidade: Hab.Habilidade[]): Promise<void> {
        // const player = await this.loadPlayer(userId, this.guildId);
        // const action = new Action(userId, habilidade);

        const partida = await db.getPartida(this.guildId);
        if (!partida) {
            console.error(`Partida não encontrada para guildId ${this.guildId}`);
            return;
        }
        
        let habilidadeStr = [];
        for (const hab of habilidade) {
            habilidadeStr.push(hab.getNome());
        }

        await db.registrarAction(userId, this.guildId, partida.etapaAtual, habilidadeStr );

        console.log(`Jogador ${userId} usou a habilidade: ${habilidade}`);
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
    
}