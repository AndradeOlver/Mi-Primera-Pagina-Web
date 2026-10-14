/**
 * CAPA DE DOMINIO: Entidad Cobranza
 * Representa un pago realizado sobre un Pedido existente.
 */

/**
 * 'type' (Union Type de TypeScript):
 * En lugar de aceptar cualquier 'string' en el método de pago (lo que permitiría 
 * errores tipográficos como "efetivo" o "yape"), restringimos estrictamente 
 * las opciones válidas en tiempo de compilación.
 */
export type MetodoPagoPermitido = 'EFECTIVO' | 'TRANSFERENCIA' | 'YAPE_PLIN' | 'TARJETA';

export class Cobranza {
  constructor(
    public readonly idPedido: number,
    public readonly monto: number,
    public readonly metodoPago: MetodoPagoPermitido,
    public readonly idUsuarioCobrador: number,
    public readonly fechaCobro: Date = new Date(),
    public readonly idCobranza?: number // El signo '?' indica que es opcional (SQL Server lo genera al insertar)
  ) {
    this.validarCobranza();
  }

  /**
   * Encapsulamos las invariantes de negocio de una cobranza:
   * - No existen cobros de monto cero o negativo en una transacción real.
   * - Todo cobro debe apuntar a un ID de pedido válido.
   */
  public validarCobranza(): void {
    if (this.idPedido <= 0) {
      throw new Error('Error de Dominio: La cobranza debe estar asociada a un ID de pedido válido.');
    }

    if (this.monto <= 0) {
      throw new Error(
        `Error de Dominio: El monto a cobrar debe ser mayor a 0. Monto intentado: ${this.monto}`
      );
    }
  }
}