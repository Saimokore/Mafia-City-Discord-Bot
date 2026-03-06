import { Game } from "../Game.js";
import type { Cargo } from "./Cargo.js";
import type { Habilidade } from "./Habilidade.js";

export class Player {
    protected game: Game;
    private id: string;
    private username: string;

    private isAlive: boolean;
    private distrito: number;

    private cartas: Carta[];
    private quantCartas: number;
    
    private cargo: Cargo;
    private status: string[];
    private marcas: string[];
    private items: Habilidade[];
    
    private acao?: Habilidade | Habilidade[] | null;
    private protecao: number; // Prot Invencibilidade(5) > Obliteracao(4) > Prot Poderosa (3) > Ataque Poderoso(2) > Prot Basica (1) > Ataque Basico (0)

    constructor(game: Game, id: string, username: string, isAlive: boolean, distrito: number, 
                cartas: Carta[], quantCartas: number, cargo: Cargo, status: string[], marcas: string[], 
                items: Habilidade[], protecao: number, acao?: Habilidade | Habilidade[] | null) 
                {
        this.id = id;
        this.game = game;
        this.username = username;

        this.cargo = cargo;
        this.protecao = protecao;
        this.isAlive = isAlive;
        this.quantCartas = quantCartas;
        this.distrito = distrito;
        
        this.cartas = cartas;
        this.status = status;
        this.marcas = marcas;
        this.items = items;

        this.acao = null;
    }

    protected setAcao(acao: Habilidade | Habilidade[] | null): void {
        this.acao = acao;
    }

    public getAcao(): Habilidade | Habilidade[] | null {
        if (!this.acao) {
            throw new Error("Nenhuma ação definida para este jogador.");
        }
        return this.acao;
    }

    public sendCarta(alvo: Player, mensagem: string): boolean {
        if (this.quantCartas > 0) {
            this.cartas.push(new Carta(alvo.id, mensagem));
            this.quantCartas--;
            return true;
        }
        return false;
    }

    public getAlinhamento(): string {
        return this.cargo.getAlinhamento();
    }

    public getStatus(): string {
        return `Nome: ${this.username}\nCargo: ${this.cargo.getNome()}\nVivo: ${this.isAlive} \nCartas: ${this.quantCartas}\nDistrito: ${this.distrito} \nProteção: ${this.protecao || "Nenhuma"} \nStatus: ${this.status.join(", ") || "Nenhum"} \nMarcas: ${this.marcas.join(", ") || "Nenhuma"} \nItens: ${this.items.map(i => i.getNome()).join(", ") || "Nenhum"} \nHabilidades: ${this.cargo.getHabilidades().map(h => h.getNome()).join(", ") || "Nenhuma"}\nAlertas: `;
    }

    public getId(): string {
        return this.id;
    }

    public estaVivo(): boolean {
        return this.isAlive;
    }

    public getUsername(): string {
        return this.username;
    }

    public getCargo(): Cargo {
        return this.cargo;
    }

    public isPlayerAlive(): boolean {
        return this.isAlive;
    }

    public getDistrito(): number {
        return this.distrito;
    }
    
}

export class Carta {
    private destinatario: string;
    private mensagem: string;

    constructor(destinatario: string, mensagem: string) {
        this.destinatario = destinatario;
        this.mensagem = mensagem;
    }
}