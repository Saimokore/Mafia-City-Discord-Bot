import {
    ActionRowBuilder,
    UserSelectMenuBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    LabelBuilder,
    TextInputBuilder,
    StringSelectMenuInteraction,
} from "discord.js";

import { type DefinicaoHabilidade, type Input, TipoInput } from "../ECA.js";
import { ClassesDoJogo } from "./classes.js";
import { CargosDoJogo } from "./cargos.js";

export class SkillModalBuilder {

    public build(
        regras: DefinicaoHabilidade,
        _interaction: StringSelectMenuInteraction,
    ): ModalBuilder | null {
        if (!regras.inputs || regras.inputs.length === 0) return null;

        const modal = new ModalBuilder()
            .setCustomId(`skill_modal_${regras.nome}`)
            .setTitle(`Usando habilidade: ${regras.nome}`);

        for (const input of regras.inputs) {
            const component = this.buildComponent(regras.nome, input);
            if (component) modal.addLabelComponents(component);
        }

        return modal;
    }

    private buildComponent(nomeHabilidade: string, input: Input): LabelBuilder | null {
        const customId = `input_${nomeHabilidade}_${input.idVariavel}`;

        switch (input.tipoInput as TipoInput) {

            case TipoInput.SelecionarJogador:
                return new LabelBuilder()
                    .setLabel(input.texto)
                    .setUserSelectMenuComponent(
                        new UserSelectMenuBuilder()
                            .setCustomId(customId)
                            .setPlaceholder(input.texto)
                            .setMinValues(1)
                            .setMaxValues(1),
                    );

            case TipoInput.SelecionarClasse:
                return new LabelBuilder()
                    .setLabel(input.texto)
                    .setStringSelectMenuComponent(
                        new StringSelectMenuBuilder()
                            .setCustomId(customId)
                            .setPlaceholder(input.texto)
                            .addOptions(this.opcoesClasse()),
                    );

            case TipoInput.SelecionarCargo:
                return new LabelBuilder()
                    .setLabel(input.texto)
                    .setStringSelectMenuComponent(
                        new StringSelectMenuBuilder()
                            .setCustomId(customId)
                            .setPlaceholder(input.texto)
                            .addOptions(this.opcoesCargo()),
                    );

            case TipoInput.Numero:
            case TipoInput.Texto:
                return new LabelBuilder()
                    .setLabel(input.texto)
                    .setTextInputComponent(
                        new TextInputBuilder()
                            .setCustomId(customId),
                    );

            default:
                console.warn(`[SkillModalBuilder] Tipo de input desconhecido: "${input.tipoInput}"`);
                return null;
        }
    }

    private opcoesClasse() {
        return Object.entries(ClassesDoJogo).map(([key, { alinhamento, nome }]) => ({
            label: `${alinhamento} ${nome}`,
            value: key
        }));
    }

    private opcoesCargo() {
        return Object.entries(CargosDoJogo).map(([key, { nome }]) => ({
            label: nome,
            value: key
        }));
    }
}