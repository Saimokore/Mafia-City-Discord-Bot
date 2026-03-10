import { Game } from "../Game.js";
import { Cargo } from "./Cargo.js";
import { db } from '../database.js';
import { Habilidade } from "./Habilidade.js";
import { Carta } from "./Carta.js";
import { Alerta } from "./Alerta.js";
import { Prisma } from '@prisma/client';

export type PrismaPlayer = Prisma.PlayerGetPayload<{
    include: {
        cartas: true,
        alertas: true,
        habilidades: true,
        itens: true
    }
}>;

export class Player {
    protected game: Game;
    private id: string;
    private username: string;

    private isAlive: boolean;
    private distrito: number;

    private cartas: Carta[];
    private quantCartas: number;
    
    private cargo: Cargo | null;
    private status: string[];
    private marcas: string[];
    private items: Habilidade[];
    private alertas: Alerta[];

    private userChat: string;
    
    private protecao: number; // Prot Invencibilidade(5) > Obliteracao(4) > Prot Poderosa (3) > Ataque Poderoso(2) > Prot Basica (1) > Ataque Basico (0)

    constructor(game: Game, player: PrismaPlayer) {
        this.game = game;
        this.id = player.id;
        this.username = player.username;

        this.cargo = player.cargo ? game.getPlayerManager().getCargoInstance(player.cargo) : null;
        
        this.protecao = player.protecao;
        this.isAlive = player.estaVivo;
        this.quantCartas = player.quantCartas;
        this.distrito = player.distrito;
        
        this.userChat = player.userChat || "";
        
        this.items = player.itens?.map(i => new Habilidade(i.nome, i.tipo, i.uso, i.etapa)) || [];
        this.cartas = player.cartas?.map(c => new Carta(c.id, c.userId, c.destinatario, c.mensagem)) || [];
        this.alertas = player.alertas?.map(a => new Alerta(a.id, a.userId, a.etapa, a.alerta)) || [];

        this.status = JSON.parse(player.status || "[]");
        this.marcas = JSON.parse(player.marcas || "[]");

    }

    public sendCarta(alvo: Player, mensagem: string): boolean {
        // if (this.quantCartas > 0) {
        //     this.cartas.push(new Carta(alvo.id, mensagem));
        //     this.quantCartas--;
        //     return true;
        // }
        return false;
    }

    public getAlinhamento(): string | undefined {
        if (!this.cargo) return;
        return this.cargo.getAlinhamento();
    }

    public getStatus(): string {
        return `Nome: ${this.username}
        Cargo: ${this.cargo ? this.cargo.getNome() : "Sem cargo"}
        Vivo: ${this.isAlive}
        Cartas: ${this.quantCartas}
        Distrito: ${this.distrito}
        Proteção: ${this.protecao || "Nenhuma"}
        Status: ${JSON.stringify(this.status) || "Nenhum"}
        Marcas: ${JSON.stringify(this.marcas) || "Nenhuma"}
        Itens: ${this.items.map(i => i.getNome()).join(", ") || "Nenhum"}
        Habilidades: ${this.cargo ? this.cargo.getHabilidades().map(h => h.getNome()).join(", ") : "Nenhuma"}
        Alertas: ${this.alertas.map(a => a.getAlerta()).join(", ") || "Nenhum"}`;
    }

    public getId(): string {
        return this.id;
    }

    public estaVivo(): boolean {
        return this.isAlive;
    }

    public getUserChat(): string {
        return this.userChat;
    }

    public getUsername(): string {
        return this.username;
    }

    public getCargo(): Cargo | undefined {
        if (!this.cargo) return;
        return this.cargo;
    }

    public isPlayerAlive(): boolean {
        return this.isAlive;
    }

    public getDistrito(): number {
        return this.distrito;
    }
    
}