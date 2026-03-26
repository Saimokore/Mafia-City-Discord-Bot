import { HabilidadeDAO } from "../DAOs/HabilidadeDAO.js";
import type { Game } from "../Managers/GameManager.js";
import { Habilidade } from "./Habilidade.js";
import { Prisma } from '@prisma/client';
import { Player } from "./Player.js";
import { ActionDAO } from "../DAOs/ActionDAO.js";

export type PrismaAction = Prisma.ActionGetPayload<{
    include: {
        alvos: true
    }
}>;

export class Action {
    private id: string;
    private emissorId: string;

    private tipo: string;
    private sucesso: string;

    private etapa: number;
    private habilidadeId: string;
    private alvosIds: string[];

    private parametros: string;
    
    // alvosIds puxa o ID mesmo e não o userID
    constructor(action: PrismaAction) {
        this.id = action.id;
        this.emissorId = action.userId;
        this.habilidadeId = action.habilidadeId;
        this.tipo = action.tipo;
        this.sucesso = action.sucesso;
        this.etapa = action.etapa;
        this.alvosIds = action.alvos.map(a => a.alvoId);
        this.parametros = action.parametrosAcao || "{}";
    }

    public getId(): string {
        return this.id;
    }

    public getEmissorUserId(): string {
        return this.emissorId;
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

    public getHabilidadeId(): string {
        return this.habilidadeId;
    }

    public getAlvos(): string[] {
        return this.alvosIds;
    }

    public getParametros(): string {
        // estao stringified
        return this.parametros;
    }
}