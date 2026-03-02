import { Game } from "../Game.js";
import type { Cargo } from "./Cargo.js";
import type { Habilidade } from "./Habilidade.js";

export class Player {
    protected game: Game;
    private id: string;
    private username: string;

    private isAlive: boolean;
    private distrito: number;

    private cartas: string[];
    private quantCartas: number;
    
    private cargo: Cargo;
    private status: string[];
    private marcas: string[];
    private items: Habilidade[];
    
    private acao?: Habilidade | Habilidade[] | null;
    private protecao?: string | null; // invencibilidade > prot poderosa > prot basica

    constructor(game: Game, id: string, username: string, isAlive: boolean, distrito: number, 
                cartas: string[], quantCartas: number, cargo: Cargo, status: string[], marcas: string[], 
                items: Habilidade[], acao?: Habilidade | Habilidade[] | null, protecao?: string | null) 
                {
        this.id = id;
        this.game = game;
        this.username = username;

        this.cargo = cargo;
        this.protecao = protecao || null;
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
            this.cartas.push(mensagem);
            this.quantCartas--;
            return true;
        }
        return false;
    }

    public getAlinhamento(): string {
        return this.cargo.getAlinhamento();
    }

    public getStatus(): string {
        return `Nome: ${this.username} \n Cargo: ${this.cargo.getNome()} \n Vivo: ${this.isAlive} \n Cartas: ${this.quantCartas} \n Distrito: ${this.distrito} \n Proteção: ${this.protecao || "Nenhuma"} \n Status: ${this.status.join(", ") || "Nenhum"} \n Marcas: ${this.marcas.join(", ") || "Nenhuma"} \n Itens: ${this.items.map(i => i.getNome()).join(", ") || "Nenhum"} \n Habilidades: ${this.cargo.getHabilidades().map(h => h.getNome()).join(", ") || "Nenhuma"}, Alertas: `;
    }
}