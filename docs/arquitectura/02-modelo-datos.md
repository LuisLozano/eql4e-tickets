# 02 · Modelo de datos

Los nombres de tablas y columnas van en español y en `snake_case`. Todas las fechas y horas son `timestamptz`.

## Diagrama

```mermaid
erDiagram
    usuario ||--o{ sesion : tiene
    usuario ||--o{ codigo_acceso : recibe
    usuario ||--o{ ticket : "presenta (socio)"
    usuario ||--o{ pago : "recibe (socio)"
    concepto |o--o{ ticket : clasifica
    ticket ||--|{ ticket_fichero : adjunta
    ticket ||--o{ historial : registra
    pago |o--o{ ticket : "abona"
    usuario ||--o{ historial : "actúa"

    usuario {
        uuid id PK
        text nombre
        text telefono UK "E.164 +34..."
        text email UK "en minúsculas"
        text password_hash "null hasta activar"
        bool es_socio
        bool es_tesorero
        enum estado "invitado | activo | baja"
        int intentos_fallidos
        timestamptz bloqueado_hasta
        timestamptz creado_en
    }
    sesion {
        text id PK "SHA-256 del token"
        uuid usuario_id FK
        timestamptz caduca_en
        timestamptz creado_en
    }
    codigo_acceso {
        uuid id PK
        uuid usuario_id FK
        text codigo_hash UK "SHA-256"
        enum tipo "activacion | restablecer"
        timestamptz caduca_en
        timestamptz usado_en
        uuid creado_por FK
    }
    concepto {
        int id PK
        text nombre UK
        int orden
        bool activo
    }
    ticket {
        uuid id PK
        int numero UK "secuencial, visible: T-000123"
        uuid socio_id FK
        int importe_centimos "> 0"
        date fecha_compra
        int concepto_id FK "null si Otro"
        text concepto_otro "null si predefinido"
        text observaciones
        enum estado
        text motivo_rechazo
        uuid pago_id FK "null hasta pagar"
        int version "concurrencia optimista"
        timestamptz creado_en
        timestamptz actualizado_en
    }
    ticket_fichero {
        uuid id PK
        uuid ticket_id FK
        text ruta "relativa al volumen"
        text nombre_original
        text tipo_mime
        int tamano_bytes
        int orden
        timestamptz sustituido_en "null = vigente"
        uuid sustituido_por FK "usuario"
    }
    pago {
        uuid id PK
        uuid socio_id FK
        date fecha_pago
        enum metodo "bizum | transferencia | efectivo | otro"
        int importe_total_centimos
        text justificante_ruta
        text justificante_mime
        uuid registrado_por FK
        timestamptz creado_en
        timestamptz anulado_en
        uuid anulado_por FK
        text motivo_anulacion
    }
    historial {
        bigint id PK
        uuid ticket_id FK "ON DELETE CASCADE"
        uuid usuario_id FK
        enum accion
        enum estado_origen
        enum estado_destino
        text motivo
        jsonb cambios "campo: [antes, después]"
        uuid pago_id FK
        timestamptz creado_en
    }
```

## Enumerados

- `estado_ticket`: `pendiente_autorizar`, `rechazado`, `pendiente_pago`, `pagado`, `anulado`.
- `accion_historial`:
  - Del socio: `crear`, `editar`, `anular`, `reenviar`.
  - Del tesorero: `autorizar`, `rechazar`, `pagar`.
  - Deshacer: `deshacer_autorizacion`, `deshacer_rechazo`, `deshacer_pago`.

## Restricciones e índices relevantes

| Regla | Implementación |
|---|---|
| Concepto obligatorio: predefinido **u** "Otro" | `CHECK ((concepto_id IS NULL) <> (concepto_otro IS NULL))` |
| Importe positivo | `CHECK (importe_centimos > 0)` |
| Un ticket pagado tiene pago, y solo él | `CHECK ((estado = 'pagado') = (pago_id IS NOT NULL))` |
| Rechazado ⇒ motivo | `CHECK (estado <> 'rechazado' OR motivo_rechazo IS NOT NULL)` |
| Un pago agrupa tickets de **su** socio (E-02) | Validado en el servicio dentro de la transacción (no se puede expresar con un `CHECK` simple) |
| Historial inmutable | El código solo hace `INSERT`. *Opcional:* un `TRIGGER` que rechace `UPDATE` y `DELETE` salvo el borrado en cascada de la purga |
| Listado del tesorero rápido (RNF-41) | Índices en `ticket(estado, creado_en)`, `ticket(socio_id)`, `ticket(fecha_compra)` |
| Purga (HU-G05) | Índice en `ticket(fecha_compra)`; borra el `ticket` y por cascada `ticket_fichero` e `historial`; borra el `pago` sin tickets; borra los ficheros del disco después del `COMMIT` |

## Notas de diseño

- **Implementación** (2026-11-05): [esquema.ts](../../src/lib/server/infra/db/esquema.ts) y las migraciones de [drizzle/](../../drizzle). En TypeScript los nombres van en camelCase; Drizzle los traduce a snake_case (`casing`).
- **Restricciones añadidas al implementar**: email en minúsculas; un usuario *activo* tiene contraseña; al menos un rol; longitudes de `concepto_otro` (1–100) y `observaciones` (≤ 500); `sustituido_en` y `sustituido_por` van juntos; la anulación del pago (`anulado_en`, `anulado_por`, `motivo_anulacion`) va completa; el justificante lleva ruta y tipo juntos.
- **Historial inmutable**: un *trigger* rechaza cualquier `UPDATE`. El `DELETE` se permite para la purga en cascada.
- **`codigo_acceso.creado_por`** es nulo cuando lo genera el sistema (tesorero inicial, R-06).

- **Ordenar por concepto**: `COALESCE(concepto.nombre, ticket.concepto_otro)`.
- **El motivo de rechazo** está en `ticket` (el último, para mostrarlo con facilidad) y en `historial` (todos).
- **El pago anulado no se borra** (E-03): sus tickets vuelven a `pendiente_pago` con `pago_id = NULL`. El pago queda con `anulado_en` y el historial de cada ticket apunta a él.
- **Ficheros sustituidos al editar o reenviar**: **no se borran**. La fila se marca con `sustituido_en` y `sustituido_por`, y el fichero sigue en el disco. El ticket muestra solo los vigentes (`sustituido_en IS NULL`); el historial enlaza los sustituidos, así que el tesorero puede ver la foto que motivó un rechazo. Solo la purga (HU-G05) los elimina.
- **Al menos un fichero vigente por ticket**: se valida en el servicio, porque no se puede expresar con un `CHECK`.
- **`numero` visible** (`T-000123`): se genera con una secuencia. Es lo que se usa para hablar de un ticket ("el T-123"); nunca se expone el UUID en la interfaz.
- **Un socio dado de baja** conserva sus tickets y aparece como "(baja)" en los listados.
