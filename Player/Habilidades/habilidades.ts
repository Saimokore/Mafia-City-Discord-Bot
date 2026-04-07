import type { DefinicaoHabilidade } from "../ECA.js";
import {
    TipoSujeito, TipoGatilho, TipoInput,
    TipoAcao, TipoAtributo, TipoOperador,
    Alinhamento,
} from "../ECA.js";
import { PoderAtaqueProtecao } from "./HabilidadeDinamica.js";

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
                    parametros: { poderAtaque: PoderAtaqueProtecao.AtaquePoderoso },
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Alinhamento,
                            operador: TipoOperador.IgualA,
                            valorEsperado: "VARIAVEL.palpite_classe_alinhamento"
                        }
                    ],
                    aoSuceder: [
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
                            ]
                        }
                    ]
                },
                {
                    acao: TipoAcao.Atacar,
                    alvo: TipoSujeito.Alvo,
                    parametros: { poderAtaque: PoderAtaqueProtecao.AtaqueBasico },
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Alinhamento,
                            operador: TipoOperador.DiferenteDe,
                            valorEsperado: "VARIAVEL.palpite_classe_alinhamento"
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
                    acao: TipoAcao.AdicionarMarca,
                    alvo: TipoSujeito.Emissor,
                    parametros: { nome: "ALVOS_RECUSADOS" }
                },
                {
                    acao: TipoAcao.CriarAlerta,
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
                    acao: TipoAcao.RemoverMarca,
                    alvo: TipoSujeito.Emissor,
                    parametros: { nome: "ALVOS_RECUSADOS" }
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
                        salvarDados: "IMPEDIDA_EVANGELHO"
                    }
                },
                {
                    acao: TipoAcao.CriarAlerta,
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

export const regraMassacre: DefinicaoHabilidade = {
    nome: "Massacre",
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
                    acao: TipoAcao.Atacar,
                    alvo: TipoSujeito.Alvo,
                    parametros: { poderAtaque: PoderAtaqueProtecao.AtaquePoderoso }
                }
            ]
        
        }
    ]
}

export const regraExecucaoPublica: DefinicaoHabilidade = {
    nome: "Execução Pública",
    tipo: "Instantanea",
    etapa: "Dia",
    usosMaximos: 1,
    modificadores: ["Astral", "Instantânea", "Especial"],

    inputs: [
        {
            idVariavel: "alvo_principal",
            tipoInput: TipoInput.SelecionarJogador,
            texto: "Escolha um alvo para executar publicamente"
        },
        {
            idVariavel: "adivinhar_classe",
            tipoInput: TipoInput.SelecionarClasse,
            texto: "Adivinhe a classe do alvo"
        }
    ],

    gatilhos: [
        {
            evento: TipoGatilho.AoUsar,
            efeitos: [
                {
                    acao: TipoAcao.Atacar,
                    alvo: TipoSujeito.Alvo,
                    parametros: { poderAtaque: PoderAtaqueProtecao.Obliteracao },
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Classe,
                            operador: TipoOperador.IgualA,
                            valorEsperado: "VARIAVEL.adivinhar_classe"
                        }
                    ],
                    aoSuceder: [
                        {
                            acao: TipoAcao.EnviarAnuncio,
                            alvo: TipoSujeito.TodosJogadores,
                            parametros: { texto: "O ${alvo_principal} foi executado publicamente!" }
                        }
                    ]
                },
                {
                    acao: TipoAcao.Atacar,
                    alvo: TipoSujeito.Alvo,
                    parametros: { poderAtaque: PoderAtaqueProtecao.AtaquePoderoso },
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Classe,
                            operador: TipoOperador.DiferenteDe,
                            valorEsperado: "VARIAVEL.adivinhar_classe_nome"
                        }
                    ],
                    aoSuceder: [
                        {
                            acao: TipoAcao.EnviarAnuncio,
                            alvo: TipoSujeito.TodosJogadores,
                            parametros: { texto: "O ${alvo_principal} foi executado publicamente!" }
                        }
                    ]
                },
                {
                    acao: TipoAcao.Atacar,
                    alvo: TipoSujeito.Emissor,
                    parametros: { poderAtaque: PoderAtaqueProtecao.Obliteracao },
                    condicoes: [
                        {
                            sujeito: TipoSujeito.Alvo,
                            atributo: TipoAtributo.Alinhamento,
                            operador: TipoOperador.DiferenteDe,
                            valorEsperado: "VARIAVEL.adivinhar_classe_alinhamento"
                        }
                    ]
                }
            ]
        }
    ]
}

export const regraProcessoDeEliminacao: DefinicaoHabilidade = {
    nome: "Processo de Eliminação",
    tipo: "Investigação",
    etapa: "Noite",
    usosMaximos: 10000,
    modificadores: [],

    inputs: [
        {
            idVariavel: "alvo_principal",
            tipoInput: TipoInput.SelecionarJogador,
            texto: "Escolha um jogador para visitar"
        }
    ],

    gatilhos: [
        {
            evento: TipoGatilho.AoAvancarEtapa,
            efeitos: [
                {
                    acao: TipoAcao.DescobrirSetor,
                    alvo: TipoSujeito.Alvo,
                    parametros: { texto: "O ${alvo_principal} está no setor ${setor}" }
                },
                {
                    acao: TipoAcao.AdicionarMarca,
                    alvo: TipoSujeito.Alvo,
                    parametros: { nome: "Suspeito" }
                }
            ]
        }
    ]
}

export const regraInvestigacaoProfunda: DefinicaoHabilidade = {
    nome: "Investigação Profunda",
    tipo: "Investigação",
    etapa: "Dia",
    usosMaximos: 1,
    modificadores: ["Instantânea"],

    inputs: [
        {
            idVariavel: "alvo_principal",
            tipoInput: TipoInput.SelecionarJogador,
            texto: "Escolha um jogador suspeito para investigar",
            validacao: [
                {
                    sujeito: TipoSujeito.Alvo,
                    atributo: TipoAtributo.Marcas,
                    operador: TipoOperador.Contem,
                    valorEsperado: "Suspeito"
                }
            ]
        },
        {
            idVariavel: "cargo_alvo",
            tipoInput: TipoInput.SelecionarCargo,
            texto: "Escolha o cargo desse jogador"
        }
    ],

    gatilhos: [
        {
            evento: TipoGatilho.AoAvancarEtapa,
            efeitos: [
                {
                    acao: TipoAcao.DescobrirCargo,
                    alvo: TipoSujeito.Alvo,
                    parametros: { texto: "O cargo do ${alvo_principal} é ${cargo_alvo}" }
                }
            ]
        
        }
    ]
}

export const regraArmaduraCorporal: DefinicaoHabilidade = {
    nome: "Armadura Corporal",
    tipo: "Passiva",
    etapa: "Atemporal",
    usosMaximos: 10000,
    modificadores: ["Passiva"],

    gatilhos: [
        {
            evento: TipoGatilho.AoSerAtacado,
            efeitos: [
                // nao sei como fazer isso por agora, nem se quero
            ]
        
        }
    ]
}

export const regraEscolta: DefinicaoHabilidade = {
    nome: "Escolta",
    tipo: "Rápida",
    etapa: "Noite",
    usosMaximos: 10000,
    modificadores: ["Imparavel"],

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
                    acao: TipoAcao.Atacar,
                    alvo: TipoSujeito.Alvo,
                    parametros: { poderAtaque: PoderAtaqueProtecao.AtaquePoderoso }
                }
            ]
        
        }
    ]
}


export const regraExemplo: DefinicaoHabilidade = {
    nome: "Massacre",
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
                    acao: TipoAcao.Atacar,
                    alvo: TipoSujeito.Alvo,
                    parametros: { poderAtaque: PoderAtaqueProtecao.AtaquePoderoso }
                }
            ]
        
        }
    ]
}

export const RegrasHabilidades: Record<string, DefinicaoHabilidade> = {
    "EVANGELHO": regraEvangelho,
    "SNIPE":     regraSnipe,
    "MASSACRE":  regraMassacre,
    "EXECUCAO_PUBLICA": regraExecucaoPublica,
    "PROCESSO_DE_ELIMINACAO": regraProcessoDeEliminacao,
    "INVESTIGACAO_PROFUNDA": regraInvestigacaoProfunda
};