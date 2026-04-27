import { prisma } from "../prisma/prisma.js"; // Ajuste o path para a sua instância do Prisma

export const EventoDAO = {
    async registrar(
        partidaId: string,
        etapa: number,
        tipo: string,
        fonteId: string | null,
        alvosIds: string[],
        payload: any,
        origemEventoId?: string
    ) {
        try {
            return await prisma.evento.create({
                data: {
                    tipo,
                    partidaId,
                    etapa,
                    fonteId,
                    payload: JSON.stringify(payload),
                    origemEventoId: origemEventoId || null,
                    alvos: {
                        create: alvosIds.map(id => ({ alvoId: id }))
                    }
                }
            });
        } catch (error) {
            console.error(`[EventoDAO] Erro ao registrar evento ${tipo}:`, error);
            return null;
        }
    }
}