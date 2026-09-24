import type { StringSelectMenuBuilder } from "discord.js";
import { use } from "react";

export class Alerta {
    private id: string;
    private userId: string;
    private etapa: number;
    private alerta: string;

    constructor(id: string, userId: string, etapa: number, alerta: string) {
        this.id = id;
        this.userId = userId;
        this.etapa = etapa;
        this.alerta = alerta;
    }

    public getId(): string {
        return this.id;
    }

    public getEtapa(): number {
        return this.etapa;
    }

    public getAlerta(): string {
        return this.alerta;
    }
}