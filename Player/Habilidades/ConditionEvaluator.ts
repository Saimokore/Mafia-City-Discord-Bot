import { TipoAtributo, TipoSujeito, type Condicao, TipoOperador } from "../ECA.js";
import { Player } from "../Player.js";

export class ConditionEvaluator {

    public async avaliar(condicoes: Condicao[] | undefined, emissor: Player, alvo: Player, variaveis: Record<string, unknown>): Promise<boolean> {
        if (!condicoes || condicoes.length === 0) return true;

        for (const condicao of condicoes) {
            const passou = this.avaliarUma(condicao, emissor, alvo, variaveis);
            if (!passou) return false;
        }

        return true;
    }

    private avaliarUma(condicao: Condicao, emissor: Player, alvo: Player, variaveis: Record<string, unknown>): boolean {
        const sujeito   = condicao.sujeito === TipoSujeito.Emissor ? emissor : alvo;
        const valorReal = this.resolverAtributo(sujeito, condicao.atributo as TipoAtributo);
        const valorEsperado = this.resolverValorEsperado(condicao.valorEsperado, emissor, variaveis);

        return this.comparar(condicao.operador as TipoOperador, valorReal, valorEsperado);
    }

    private resolverAtributo(jogador: Player, atributo: TipoAtributo): unknown {
        switch (atributo) {
            case TipoAtributo.Alinhamento: return jogador.getAlinhamento();
            case TipoAtributo.EstaVivo:    return jogador.estaVivo();
            case TipoAtributo.Protecao:    return jogador.getProtecao();
            case TipoAtributo.Classe:      return jogador.getClasse();
            case TipoAtributo.Cargo:       return jogador.getCargo()?.getNome();
            default:
                console.warn(`[ConditionEvaluator] Atributo desconhecido: ${atributo}`);
                return undefined;
        }
    }

    private resolverValorEsperado(raw: unknown, emissor: Player, variaveis: Record<string, unknown>): unknown {
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

        return raw;
    }

    private comparar(operador: TipoOperador, real: unknown, esperado: unknown): boolean {
        switch (operador) {
            case TipoOperador.IgualA:
                return real === esperado;

            case TipoOperador.DiferenteDe:
                return real !== esperado;

            case TipoOperador.MaiorQue:
                if (typeof real !== "number" || typeof esperado !== "number") {
                    console.warn(`[ConditionEvaluator] MAIOR_QUE usado com valores não-numéricos:`, { real, esperado });
                    return false;
                }
                return real > esperado;

            default:
                console.warn(`[ConditionEvaluator] Operador desconhecido: ${operador}`);
                return false;
        }
    }
}