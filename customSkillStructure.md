Habilidade {
  Metadados:
    -> Nome: string
    -> Tipo: [Ofensiva, Descoberta, Proteção, Comunicação, Utilitária]
    -> Etapa: [Dia, Noite, Atemporal]
    -> UsosMaximos: numero
    -> Modificadores: [Imparavel, Astral, Dormente, Rapida, etc]

  Gatilhos (Quando essa habilidade desperta?):
    -> [Ao Usar] (Quando o Modal é preenchido)
    -> [Ao Morrer]
    -> [Ao Ser Atacado]
    -> [Ao Avancar Etapa]
    {
      
      Efeitos (O que ela vai fazer? Pode ter mais de um):
        -> Efeito_1 {
            Ação: [Atacar, Proteger, Bloquear, CriarOferta, MudarStatus, EnviarMensagem, AlterarUso]
            QuemSofreAAção: [Emissor, AlvoSelecionado, Atacante, Todos, JogadoresDaFaccaoX]
            ParametrosExtras: { PoderAtaque: numero, Texto: string, Quantidade: numero }

            Condições (Se vazio, executa direto. Se preenchido, precisa passar no teste):
            -> Se (Sujeito) [Operador] (Valor)
            -> E Se (Sujeito) [Operador] (Valor)
        }
    }
}

Dicionário para montar as Condições:
  -> Sujeitos: [Emissor, AlvoSelecionado, Atacante, AcaoDestaHabilidade]
  -> Atributos do Sujeito: [Alinhamento, Classe, EstaVivo, Protecao, Status(Bloqueado, etc), Marcas, Distrito]
  -> Operadores: [IgualA, DiferenteDe, MaiorQue, MenorQue, Contem(para listas), FoiSucedida(para ações)]


EXEMPLO

Criar Habilidade "Snipe" {
  Metadados:
    -> Nome: "Snipe"
    -> Tipo: Ofensiva
    -> Etapa: Noite
    -> UsosMaximos: 2
    -> Modificadores: [Dormente]

  Gatilhos:
    -> [Ao Usar] {

        // Tiro Certeiro (Se atirou num inimigo)
        Efeito_1 {
        Ação: Atacar
        QuemSofreAAção: AlvoSelecionado
        ParametrosExtras: { PoderAtaque: 2 }

        Condições:
            -> Se (AlvoSelecionado.Alinhamento) [DiferenteDe] (Emissor.Alinhamento)
        }

        // Tiro Fraco (Se atirou num aliado por engano)
        Efeito_2 {
        Ação: Atacar
        QuemSofreAAção: AlvoSelecionado
        ParametrosExtras: { PoderAtaque: 0 }

        Condições:
            -> Se (AlvoSelecionado.Alinhamento) [IgualA] (Emissor.Alinhamento)
        }

        // Reembolso de Bala (A mecânica bônus do Snipe)
        Efeito_3 {
        Ação: AlterarUso
        QuemSofreAAção: Emissor
        ParametrosExtras: { Quantidade: +1 }

        Condições:
            -> Se (AlvoSelecionado.Classe) [IgualA] (Classe_Selecionada_No_Modal)
            -> E Se (Efeito_1) [FoiSucedida] (Verdadeiro) // Só devolve se o tiro realmente matou
        }
    }
}

EXEMPLO PASSIVA

Criar Habilidade "Armadura Corporal" {
  Metadados:
    -> Nome: "Armadura Corporal"
    -> Tipo: Passiva
    -> Etapa: Atemporal
    -> UsosMaximos: 1
    -> Modificadores: []

  Gatilhos:
    -> [Ao Ser Atacado] {

        Efeito_1 {
        Ação: Proteger
        QuemSofreAAção: Emissor
        ParametrosExtras: { ProtecaoOferecida: 1 }

        Condições:
            -> Nenhuma (Sempre protege na primeira vez)
        }
        
        Efeito_2 {
        Ação: EnviarMensagem
        QuemSofreAAção: Emissor
        ParametrosExtras: { Texto: "Seu colete salvou sua vida, mas foi destruído!" }
        
        Condições:
            -> Nenhuma
        }
    }
}