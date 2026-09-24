import type { StringMappedInteractionTypes } from "discord.js";

export class Carta {
    private id: string;
    private userId: string;
    private destinatarioId: string;
    private mensagem: string;

    constructor(id: string, userId: string, destinatarioId: string, mensagem: string) {
        this.id = id;
        this.userId = userId;
        this.destinatarioId = destinatarioId;
        this.mensagem = mensagem;
    }

    public getId(): string {
        return this.id;
    }

    public getUserId(): string {
        return this.userId;
    }

    public getDestinatarioId(): string {
        return this.destinatarioId;
    }
}