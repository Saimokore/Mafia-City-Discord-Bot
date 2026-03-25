import { HabilidadeDAO } from "../DAOs/HabilidadeDAO.js";
import type { Game } from "../Managers/GameManager.js";
import { Habilidade } from "./Habilidade.js";
import { Prisma } from '@prisma/client';
import { Player } from "./Player.js";

export type PrismaOferta = Prisma.OfertaGetPayload<{
    include: {
        player: {
            include: {
                cartas: true,
                alertas: true,
                habilidades: true,
                itens: true
            }
        }
    }
}>;

export class Action {
    private id: string;
    private nome: string;

    private emissor: Player;
    private alvo: Player

    private etapa: number;
    private item: string; // por enquanto

    private parametros: string;

    constructor(game: Game, action: PrismaOferta) {
        this.id = action.id;
        this.nome = action.nomeOferta;
        this.emissor = new Player(game, action.player);
        this.etapa = action.etapa;
        this.alvo = new Player(game, action.player);
        this.parametros = action.parametros || "{}";
    }

    public getId(): string {
        return this.id;
    }

    public getUserId(): string {
        return this.userId;
    }
    
    public getTipo(): string {
        return this.tipo;
    }

    public getSucesso(): string {
        return this.sucesso;
    }

    public getEtapa(): number {
        return this.etapa;
    }

    public getHabilidade(): Habilidade | null {
        return this.habilidade;
    }

    public getAlvos(): Player[] {
        return this.alvos;
    }

    public getParametros(): string {
        // estao stringified
        return this.parametros;
    }
}