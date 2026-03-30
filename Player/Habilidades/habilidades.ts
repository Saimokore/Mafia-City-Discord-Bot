import type { DefinicaoHabilidade } from "../ECA.js";
import {
    TipoSujeito, TipoGatilho, TipoInput,
    TipoAcao, TipoAtributo, TipoOperador,
    Alinhamento,
} from "../ECA.js";

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
                {
                    acao: TipoAcao.Atacar,
                    alvo: TipoSujeito.Alvo,
                    parametros: { poderAtaque: 2 },
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Alinhamento,
                            operador: TipoOperador.IgualA,
                            valorEsperado: "VARIAVEL.palpite_classe_alinhamento"
                        }
                    ]
                },
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
                {
                    acao: TipoAcao.AlterarUso,
                    alvo: TipoSujeito.Emissor,
                    parametros: { quantidade: 1 },
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Classe,
                            operador: TipoOperador.IgualA,
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
                },
                {
                    acao: TipoAcao.AtualizarOferta,
                    alvo: TipoSujeito.Alvo,
                    parametros: { nomeOferta: "Arrependimento", valorOferta: false }
                }
            ]
        },

        {
            evento: TipoGatilho.AoOfertaAceita,
            efeitos: [
                {
                    acao: TipoAcao.RemoverParametro,
                    alvo: TipoSujeito.Emissor,
                    parametros: { tipo: "ALVOS_RECUSADOS" }
                },
                {
                    acao: TipoAcao.Bloquear,
                    alvo: TipoSujeito.Alvo,
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Alinhamento,
                            operador: TipoOperador.IgualA,
                            valorEsperado: Alinhamento.Cidade
                        }
                    ]
                },
                {
                    acao: TipoAcao.CriarInput,
                    alvo: TipoSujeito.Alvo,
                    parametros: {
                        idVariavel: "habilidade_sacrificada", 
                        tipoInput: TipoInput.SelecionarPropriaHabilidade, 
                        texto: "Qual habilidade você sacrifica?"
                    },
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Alinhamento,
                            operador: TipoOperador.DiferenteDe,
                            valorEsperado: Alinhamento.Cidade
                        }
                    ]
                },
                { // aqui ele RECUSA a oferta para não deixa-la pendente, porém ela é aceita caso o jogador preencha o input
                    acao: TipoAcao.AtualizarOferta,
                    alvo: TipoSujeito.Alvo,
                    parametros: { nomeOferta: "Arrependimento", valorOferta: false }
                }
            ],
        },

        {
            evento: TipoGatilho.AoResolverInput,
            efeitos: [
                {
                    acao: TipoAcao.ImpedirHabilidade,
                    alvo: TipoSujeito.Alvo,
                    parametros: {
                        nomeHabilidade: "VARIAVEL.habilidade_sacrificada",
                        salvarEmExtra: "IMPEDIDA_EVANGELHO"
                    },
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Input,
                            atributo: TipoAtributo.CustomId,
                            operador: TipoOperador.IgualA,
                            valorEsperado: "habilidade_sacrificada"
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
                            valorEsperado: Alinhamento.Cidade
                        }
                    ]
                },
                {
                    acao: TipoAcao.AtualizarOferta,
                    alvo: TipoSujeito.Alvo,
                    parametros: { nomeOferta: "Arrependimento", valorOferta: false }
                }
            ]
        },

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


export const RegrasHabilidades: Record<string, DefinicaoHabilidade> = {
    "Evangelho": regraEvangelho,
    "Snipe":     regraSnipe,
};