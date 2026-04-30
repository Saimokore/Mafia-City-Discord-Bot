import { Prisma } from '@prisma/client';

export type PrismaAction = Prisma.ActionGetPayload<{}>;

export class Action {
    private id: string;
    private partidaId: string;
    private donoId: string;

    private etapa: number;
    private prioridade: number;
    private status: string;
    private tipo: string;
    
    private habilidadeId: string | null;
    private origemEventoId: string | null;
    
    private payload: Record<string, unknown>;

    constructor(gatilho: PrismaAction) {
        this.id = gatilho.id;
        this.partidaId = gatilho.partidaId;
        this.donoId = gatilho.donoId;
        this.etapa = gatilho.etapa;
        this.prioridade = gatilho.prioridade;
        this.status = gatilho.status;
        this.tipo = gatilho.tipo;
        this.habilidadeId = gatilho.habilidadeId;
        this.origemEventoId = gatilho.origemEventoId;

        try {
            this.payload = typeof gatilho.payload === "string" ? JSON.parse(gatilho.payload) : gatilho.payload;
        } catch {
            this.payload = {};
        }
    }

    public getId(): string { 
        return this.id; 
    }

    public getDonoId(): string { 
        return this.donoId; 
    }

    public getTipo(): string {
        return this.tipo;
    }

    public getEtapa(): number { 
        return this.etapa; 
    }

    public getHabilidadeId(): string | null { 
        return this.habilidadeId; 
    }

    public getOrigemEventoId(): string | undefined { 
        return this.origemEventoId || undefined;
    }
    
    public getPayload(): Record<string, unknown> {
        return this.payload;
    }
}