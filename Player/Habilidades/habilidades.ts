import type { DefinicaoHabilidade } from "../ECA.js";
import {
    TipoSujeito, TipoGatilho, TipoInput,
    TipoAcao, TipoAtributo, TipoOperador,
} from "../ECA.js";

// ============================================================
//  Snipe
// ============================================================
//
//  Lógica:
//    1. Ataque poderoso (2) se o alinhamento do palpite bater → FOI_SUCEDIDA = (morreu)
//    2. Ataque básico   (0) se o alinhamento errar
//    3. Restaura 1 uso se acertou a CLASSE em cheio E o alvo morreu (FOI_SUCEDIDA)
//
//  Convenções usadas:
//    - alvo              → TipoSujeito.Alvo   ("ALVO")
//    - emissor           → TipoSujeito.Emissor ("EMISSOR")
//    - acao anterior     → TipoSujeito.AcaoAnterior ("ACAO_ANTERIOR")
//    - variavel do modal → "VARIAVEL.<idVariavel>"
//    - ALTERAR_USO usa   → parametros.quantidade (positivo = restaura)

export const regraSnipe: DefinicaoHabilidade = {
    nome: "Snipe",
    tipo: "Ofensiva",
    etapa: "Noite",
    usosMaximos: 2,
    modificadores: ["Dormente"],

    inputs: [
        {
            idVariavel: "alvo_principal",
            tipoInput: TipoInput.SelecionarJogador,
            texto: "Quem é o alvo do seu tiro?"
        },
        {
            idVariavel: "palpite_classe",
            tipoInput: TipoInput.SelecionarClasse,
            texto: "Qual a classe do alvo?"
        }
    ],

    gatilhos: [
        {
            evento: TipoGatilho.AoAvancarEtapa,
            efeitos: [
                // Efeito 1: Ataque poderoso se acertou o alinhamento do palpite
                {
                    acao: TipoAcao.Atacar,
                    alvo: TipoSujeito.Alvo,
                    parametros: { poderAtaque: 2 },
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Alinhamento,
                            operador: TipoOperador.IgualA,
                            // O motor resolve "VARIAVEL.palpite_classe_alinhamento"
                            // buscando variaveis["palpite_classe_alinhamento"]
                            // Esse campo deve ser populado no pré-processamento do modal
                            // a partir do valor de "palpite_classe" (ex: "Cidade_Justiceiro" → "Cidade")
                            valorEsperado: "VARIAVEL.palpite_classe_alinhamento"
                        }
                    ]
                },
                // Efeito 2: Ataque básico se errou o alinhamento
                {
                    acao: TipoAcao.Atacar,
                    alvo: TipoSujeito.Alvo,
                    parametros: { poderAtaque: 0 },
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Alinhamento,
                            operador: TipoOperador.DiferenteDe,
                            valorEsperado: "VARIAVEL.palpite_classe_alinhamento"
                        }
                    ]
                },
                // Efeito 3: Devolve a bala se acertou a classe E o alvo morreu
                {
                    acao: TipoAcao.AlterarUso,
                    alvo: TipoSujeito.Emissor,
                    parametros: { quantidade: 1 },
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Classe,
                            operador: TipoOperador.IgualA,
                            // "VARIAVEL.palpite_classe_nome" → ex: "Justiceiro"
                            valorEsperado: "VARIAVEL.palpite_classe_nome"
                        },
                        {
                            sujeito: TipoSujeito.AcaoAnterior,
                            atributo: TipoAtributo.FoiSucedida,
                            operador: TipoOperador.IgualA,
                            valorEsperado: true
                        }
                    ]
                }
            ]
        }
    ]
};

// ============================================================
//  Evangelho
// ============================================================
//
//  Lógica:
//    Dia → oferece "Arrependimento" ao alvo
//    Recusa → registra alvo em dadosExtra do emissor
//    Aceita → se Cidade: bloqueia; se não-Cidade: impede habilidade
//    Morte do emissor → restaura todas as habilidades impedidas por ele
//
//  Nota: SELECIONAR_PROPRIA_HABILIDADE não existe no TipoInput.
//        Substituído por TEXTO — o jogador digita o nome da habilidade.
//        Quando esse TipoInput for adicionado ao sistema, basta trocar aqui.

export const regraEvangelho: DefinicaoHabilidade = {
    nome: "Evangelho",
    tipo: "Comunicacao",
    etapa: "Dia",
    usosMaximos: 10000,
    modificadores: [],

    inputs: [
        {
            idVariavel: "alvo_principal",
            tipoInput: TipoInput.SelecionarJogador,
            texto: "A quem você deseja pregar o Evangelho?"
        }
    ],

    gatilhos: [
        // Gatilho 1: Criar oferta ao avançar a etapa
        {
            evento: TipoGatilho.AoAvancarEtapa,
            efeitos: [
                {
                    acao: TipoAcao.CriarOferta,
                    alvo: TipoSujeito.Alvo,
                    parametros: { nomeOferta: "Arrependimento" }
                }
            ]
        },

        // Gatilho 2: Alvo recusou
        {
            evento: TipoGatilho.AoOfertaRecusada,
            efeitos: [
                {
                    acao: TipoAcao.AdicionarParametro,
                    alvo: TipoSujeito.Emissor,
                    parametros: { tipo: "ALVOS_RECUSADOS", alvoId: "VARIAVEL.alvo_principal" }
                },
                {
                    acao: TipoAcao.EnviarAlerta,
                    alvo: TipoSujeito.Alvo,
                    parametros: { texto: "Você recusou a palavra e seus pecados pesam sobre você..." }
                }
            ]
        },

        // Gatilho 3: Alvo aceitou
        {
            evento: TipoGatilho.AoOfertaAceita,
            efeitos: [
                // Remove o registro de recusa caso existisse
                {
                    acao: TipoAcao.RemoverParametro,
                    alvo: TipoSujeito.Emissor,
                    parametros: { tipo: "ALVOS_RECUSADOS" }
                },
                // Se for Cidade: bloqueia
                {
                    acao: TipoAcao.Bloquear,
                    alvo: TipoSujeito.Alvo,
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Alinhamento,
                            operador: TipoOperador.IgualA,
                            valorEsperado: "Cidade"
                        }
                    ]
                },
                // Se não for Cidade: impede habilidade
                {
                    acao: TipoAcao.ImpedirHabilidade,
                    alvo: TipoSujeito.Alvo,
                    parametros: {
                        // TODO: quando TipoInput.SelecionarPropriaHabilidade existir,
                        // trocar por: nomeHabilidade: "VARIAVEL.habilidade_sacrificada"
                        nomeHabilidade: "VARIAVEL.habilidade_sacrificada",
                        salvarEmExtra: "IMPEDIDA_EVANGELHO"
                    },
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Alinhamento,
                            operador: TipoOperador.DiferenteDe,
                            valorEsperado: "Cidade"
                        }
                    ]
                },
                {
                    acao: TipoAcao.EnviarAlerta,
                    alvo: TipoSujeito.Alvo,
                    parametros: { texto: "🚫 Sua habilidade ficará bloqueada até o Evangelista morrer." },
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Alinhamento,
                            operador: TipoOperador.DiferenteDe,
                            valorEsperado: "Cidade"
                        }
                    ]
                }
            ]
        },

        // Gatilho 4: Evangelista morreu → restaura todas as habilidades que ele impediu
        {
            evento: TipoGatilho.AoMorrer,
            efeitos: [
                {
                    acao: TipoAcao.RestaurarHabilidadeImpedida,
                    alvo: TipoSujeito.TodosJogadores,
                    parametros: { tipoDadoExtra: "IMPEDIDA_EVANGELHO" }
                }
            ]
        }
    ]
};

// ============================================================
//  Registro central
// ============================================================

export const RegrasHabilidades: Record<string, DefinicaoHabilidade> = {
    "Evangelho": regraEvangelho,
    "Snipe":     regraSnipe,
};