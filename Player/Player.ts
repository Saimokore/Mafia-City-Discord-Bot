import { Game } from '../Managers/GameManager.js';
import { Cargo } from "./Cargo.js";
import { Habilidade } from "./Habilidade.js";
import { Carta } from "./Carta.js";
import { Alerta } from "./Alerta.js";
import { Prisma } from '@prisma/client';
import type { DadoExtra } from "./Tipos.js";
import type { HabilidadeDinamica } from './Habilidades/HabilidadeDinamica.js';
import type { MapaParametrosAcao, TipoGatilho } from './ECA.js';
import type { Action } from './Action.js';

export type PrismaPlayer = Prisma.PlayerGetPayload<{
    include: {
        cartas: true,
        alertas: true,
        habilidades: true,
        itens: true
    }
}>;

export class Player {
    private id: string;
    private userId: string;
    private username: string;

    private isAlive: boolean;
    private distrito: number;

    private cartas: Carta[];
    private quantCartas: number;
    
    private cargo: Cargo | null;

    private status: any[];
    private marcas: any[];
    private items: HabilidadeDinamica[];
    private alertas: Alerta[];

    private userChat: string;

    private dadosExtra: any[];

    private protecao: number;

    constructor(game: Game, player: PrismaPlayer) {
        this.id = player.id;
        this.userId = player.userId;
        this.username = player.username;


        if (player.cargo) {
            const habilidades = player.habilidades
                .map(h => {
                    return game.getSkillManager().getHabilidadeInstance(h.nome, h.id, h.uso, h.status);
                })
                .filter((h): h is HabilidadeDinamica => !!h);
            this.cargo = game.getSkillManager().getCargoInstance(player.cargo, habilidades) || null;
        } else {
            this.cargo = null;
        }
        
        this.protecao = player.protecao;
        this.isAlive = player.estaVivo;
        this.quantCartas = player.quantCartas;
        this.distrito = player.distrito;
        
        this.userChat = player.userChat || "";
        
        // this.items = player.itens?.map(i => new Habilidade(i.nome, i.tipo, i.uso, i.etapa)) || [];
        this.items = [];
        this.cartas = player.cartas?.map(c => new Carta(c.id, c.userId, c.destinatario, c.mensagem)) || [];
        this.alertas = player.alertas?.map(a => new Alerta(a.id, a.userId, a.etapa, a.alerta)) || [];

        this.status = JSON.parse(player.status || "[]");
        this.marcas = JSON.parse(player.marcas || "[]");
        this.dadosExtra = JSON.parse(player.dadosExtra || "[]");
    }

    public async triggerGatilho(game: Game, gatilho: TipoGatilho, emissor?: Player, action?: Action) {
        this.getHabilidades()?.forEach(h => h.ativar(game, action || null, gatilho, emissor));
    }

    public getAlinhamento(): string | undefined {
        if (!this.cargo) return;
        return this.cargo.getAlinhamento();
    }

    public getStatus(): any[] {
        return this.status;
    }

    public getInfo(): string {
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

    public getMarcas(): any[] {
        return this.marcas;
    }

    public getProtecaoInata(): number {
        return this.cargo ? this.cargo.getProtecaoInata() : 0;
    }

    public getHabilidade(nomeOuId: string): HabilidadeDinamica | undefined {
        return this.getHabilidades()?.find(h => h.getNome() === nomeOuId || h.getId() === nomeOuId);
    }

    public getHabilidades(): HabilidadeDinamica[] | undefined {
        return this.cargo?.getHabilidades();
    }

    public getClasse() {
        return `${this.getAlinhamento()}_${this.cargo?.getNomeClasse()}`;
    }

    public getDadosExtra(): any {
        return this.dadosExtra;
    }

    public getId(): string {
        return this.id;
    }

    public getUserId(): string {
        return this.userId;
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

    public getCargo(): Cargo | null {
        return this.cargo;
    }

    public getDistrito(): number {
        return this.distrito;
    }
    
    public getProtecao(): number {
        return this.protecao;
    }

    public setEstaVivo(vivo: boolean) {
        this.isAlive = vivo;
    }

    public setProtecao(valor: number) {
        this.protecao = valor;
    }

    public setDadosExtra(dados: any) {
        this.dadosExtra = typeof dados === "string" ? JSON.parse(dados) : dados;
    }

    public setStatus(novoStatus: any) {
        this.status = typeof novoStatus === "string" ? JSON.parse(novoStatus) : novoStatus;
    }

    public setMarcas(novasMarcas: any) {
        this.marcas = typeof novasMarcas === "string" ? JSON.parse(novasMarcas) : novasMarcas;
    }
}