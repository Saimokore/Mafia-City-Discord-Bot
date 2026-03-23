import { HabilidadeDAO } from "../DAOs/HabilidadeDAO.js";
import type { Game } from "../Managers/GameManager.js";
import { Habilidade } from "./Habilidade.js";
import { Prisma } from '@prisma/client';

export type PrismaAction = Prisma.ActionGetPayload<{
    include: {
        alvos: true,
        habilidade: true
    }
}>;

export class Action {
    private id: string;
    private userId: string;

    private tipo: string;
    private sucesso: string;

    private etapa: number;
    private habilidade: Habilidade | null;
    private alvos: string[];

    private parametros: string;

    constructor(game: Game, action: PrismaAction) {
        const h = action.habilidade;
        this.id = action.id;
        this.userId = action.userId;
        this.habilidade = game.getSkillManager().getHabilidadeInstance(h.nome, h.id, h.uso, h.status);
        this.tipo = action.tipo;
        this.sucesso = action.sucesso;
        this.etapa = action.etapa;
        this.alvos = action.alvos.map(a => a.alvoId);
        this.parametros = action.parametrosAcao || "{}";
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

    public getAlvos(): string[] {
        return this.alvos;
    }

    public getParametros(): string {
        // estao stringified
        return this.parametros;
    }
}