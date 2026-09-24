import type { Condicao, DefinicaoCargo } from './ECA.js';
import { ClassesDoJogo } from './Habilidades/classes.js';
import type { HabilidadeDinamica } from '../domain/skills/HabilidadeDinamica.js';

export class Cargo {
    private definicao: DefinicaoCargo;
    private habilidades: HabilidadeDinamica[];

    constructor(definicao: DefinicaoCargo, habilidades: HabilidadeDinamica[]) {
        this.definicao = definicao;
        this.habilidades = habilidades;
    }

    public getNome(): string {
        return this.definicao.nome;
    }

    public getAlinhamento(): string {
        const classeDef = ClassesDoJogo[this.definicao.classe];
        return classeDef ? classeDef.alinhamento : "Desconhecido";
    }

    public getNomeClasse(): string {
        const classeDef = ClassesDoJogo[this.definicao.classe];
        return classeDef ? classeDef.nome : "Desconhecida";
    }

    public getProtecaoInata(): number {
        return this.definicao.protecaoInata;
    }

    public getHabilidades(): HabilidadeDinamica[] {
        return this.habilidades;
    }
    
    public getCondicoesVitoria() {
        return this.definicao.condicoesVitoria || {condicoes: [], vitoriaContinua: false};
    }

    public getDescricao(): string {
        return this.definicao.descricao || "Sem descrição.";
    }
}
