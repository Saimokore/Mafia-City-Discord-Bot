import type { Game } from "../../Managers/GameManager.js";
import { TipoAtributo, TipoSujeito, type Condicao, TipoOperador } from "../ECA.js";
import { Player } from "../Player.js";
import type { ResultadoAcaoAnterior } from "./EffectHandler.js";

export class ConditionEvaluator {

    public async avaliar(game: Game, condicoes: Condicao[] | undefined, emissor: Player, alvo: Player, variaveis: Record<string, unknown>, resultadoAnterior?: ResultadoAcaoAnterior): Promise<boolean> {
        if (!condicoes || condicoes.length === 0) return true;

        for (const condicao of condicoes) {
            const passou = await this.avaliarUma(game, condicao, emissor, alvo, variaveis, resultadoAnterior);
            if (!passou) return false;
        }

        return true;
    }

    private async avaliarUma(game: Game, condicao: Condicao, emissor: Player, alvo: Player, variaveis: Record<string, unknown>, resultadoAnterior?: ResultadoAcaoAnterior): Promise<boolean> {
        if ((condicao.atributo as string) === "QUANT_VIVOS" || (condicao.atributo as string) === "QuantVivos") {
            let valorReal: unknown;
            
            if (condicao.sujeito === TipoSujeito.TodosJogadores) {
                valorReal = variaveis["vivos_todos"];
            } else if ((condicao.sujeito as string) === "AlinhamentoInimigo") {
                valorReal = variaveis["vivos_inimigos"];
            }
            
            const valorEsperado = this.resolverValorEsperado(condicao.valorEsperado, emissor, variaveis);
            return this.comparar(condicao.operador as TipoOperador, valorReal, valorEsperado);
        }

        if (condicao.sujeito === TipoSujeito.TodosJogadores) {
            const players = await game.getPlayerManager().getAllPlayers();
            if (!players) return false;

            for (const p of players) {
                const valorReal = this.resolverAtributo(p, condicao.atributo as TipoAtributo);
                const valorEsperado = this.resolverValorEsperado(condicao.valorEsperado, emissor, variaveis);

                if (!this.comparar(condicao.operador as TipoOperador, valorReal, valorEsperado)) {
                    return false;
                }
            }
            return true;
        } 
        
        if (condicao.sujeito === TipoSujeito.AcaoAnterior) {
            const valorReal = condicao.atributo === TipoAtributo.FoiSucedida ? (resultadoAnterior?.foiSucedida ?? false) : false;
            const valorEsperado = this.resolverValorEsperado(condicao.valorEsperado, emissor, variaveis);
            
            return this.comparar(condicao.operador as TipoOperador, valorReal, valorEsperado);
        }

        if (condicao.sujeito === TipoSujeito.Input) {
            let valorReal: unknown;
            
            if (condicao.atributo === TipoAtributo.CustomId) {
                valorReal = variaveis["customId"]; 
            }

            const valorEsperado = this.resolverValorEsperado(condicao.valorEsperado, emissor, variaveis);
            return this.comparar(condicao.operador as TipoOperador, valorReal, valorEsperado);
        }

        const sujeito = condicao.sujeito === TipoSujeito.Emissor ? emissor : alvo;
        const valorReal = this.resolverAtributo(sujeito, condicao.atributo as TipoAtributo);
        const valorEsperado = this.resolverValorEsperado(condicao.valorEsperado, emissor, variaveis);

        console.log(`[ConditionEvaluator] Avaliando condição para jogador ${sujeito.getUserId()}: atributo ${condicao.atributo} com valor real "${valorReal}" contra valor esperado "${valorEsperado}" usando operador ${condicao.operador}`);

        return this.comparar(condicao.operador as TipoOperador, valorReal, valorEsperado);
    }

    private resolverAtributo(jogador: Player, atributo: TipoAtributo): unknown {
        console.log(`[ConditionEvaluator] Resolvendo atributo ${atributo} para jogador ${jogador.getUserId()}`);
        switch (atributo) {
            case TipoAtributo.Alinhamento: return jogador.getAlinhamento();
            case TipoAtributo.EstaVivo:    return jogador.estaVivo();
            case TipoAtributo.Protecao:    return jogador.getProtecao();
            case TipoAtributo.Classe:      return jogador.getClasse();
            case TipoAtributo.Cargo:       return jogador.getCargo()?.getNome();
            case TipoAtributo.Marcas:      return jogador.getMarcas();
            default:
                console.warn(`[ConditionEvaluator] Atributo desconhecido: ${atributo}`);
                return undefined;
        }
    }

    private resolverValorEsperado(raw: unknown, emissor: Player, variaveis: Record<string, unknown>): unknown {
        console.log(`[ConditionEvaluator] Resolvendo valor esperado a partir de "${raw}"`);
        if (typeof raw !== "string") return raw;

        if (raw === "EMISSOR.ALINHAMENTO") return emissor.getAlinhamento();

        if (raw.startsWith("TEXTO.")) {
            const nomeDaVariavel = raw.slice("TEXTO.".length);
            return variaveis[nomeDaVariavel];
        }

        if (raw.startsWith("NUMERO.")) {
            const nomeDaVariavel = raw.slice("NUMERO.".length);
            const valor = variaveis[nomeDaVariavel];
            const numero = Number(valor);
            if (isNaN(numero)) {
                console.warn(`[ConditionEvaluator] Variável "${nomeDaVariavel}" não é um número válido:`, valor);
                return undefined;
            }
            return numero;
        }

        if (raw.startsWith("VARIAVEL.")) {
            const nomeDaVariavel = raw.slice("VARIAVEL.".length);
            return variaveis[nomeDaVariavel];
        }

        return raw;
    }

    private comparar(operador: TipoOperador, real: unknown, esperado: unknown): boolean {
        const valorReal = typeof real === "string" ? real.toLowerCase() : real;
        const valorEsperado = typeof esperado === "string" ? esperado.toLowerCase() : esperado;

        switch (operador) {
            case TipoOperador.IgualA:
                return valorReal === valorEsperado;

            case TipoOperador.DiferenteDe:
                return valorReal !== valorEsperado;

            case TipoOperador.MaiorQue:
                if (typeof real !== "number" || typeof esperado !== "number") {
                    console.warn(`[ConditionEvaluator] MAIOR_QUE usado com valores não-numéricos:`, { real, esperado });
                    return false;
                }
                return real > esperado;
            case TipoOperador.MenorQue:
                if (typeof real !== "number" || typeof esperado !== "number") {
                    console.warn(`[ConditionEvaluator] MENOR_QUE usado com valores não-numéricos:`, { real, esperado });
                    return false;
                }
                return real < esperado;
            case TipoOperador.Contem:
                // talvez exista um erro aqui pelo fato de vir objetos
                if (Array.isArray(real)) {
                    return real.some(v => String(v).toLowerCase() === String(esperado).toLowerCase());
                }
                return false;
            case TipoOperador.NaoContem:
                if (Array.isArray(real)) {
                    return !real.some(v => String(v).toLowerCase() === String(esperado).toLowerCase());
                }
                return false;
            default:
                console.warn(`[ConditionEvaluator] Operador desconhecido: ${operador}`);
                return false;
        }
    }
}