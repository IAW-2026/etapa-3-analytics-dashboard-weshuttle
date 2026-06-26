# Documentación de API para Analytics Dashboard

Esta documentación detalla el endpoint expuesto por **Payments App** para que **Analytics App** pueda consultar de forma segura y en tiempo real las métricas financieras preprocesadas y señales de decisión de WeShuttle.

---

## 1. Detalles del Endpoint

### `GET /api/analytics/metrics`

Obtiene métricas agregadas del negocio, estadísticas transaccionales, tendencias de ingresos diarios y alertas financieras estructuradas.

### Seguridad y Autenticación
El endpoint se consume de forma **backend-to-backend**. 
* **Header requerido:** `Authorization: Bearer <ANALYTICS_API_KEY>`
* **Clerk Session:** No se requiere sesión de usuario de Clerk. De hecho, llamadas con tokens de Clerk normales sin la API Key correspondiente recibirán `403 Forbidden`.
* **Permisos:** La API Key de analítica es estrictamente de **lectura**. Intentar usar métodos de escritura (`POST`, `PUT`, `DELETE`, `PATCH`) retornará `403 Forbidden`.

### Parámetros de Consulta (Query Params)
Ambos parámetros son opcionales:
* `start_date` (formato: `YYYY-MM-DD`): Fecha de inicio del período a consultar.
* `end_date` (formato: `YYYY-MM-DD`): Fecha de fin del período a consultar.

> **Fallback:** Si no se especifican las fechas, el sistema calcula automáticamente el rango de los **últimos 15 días** inclusive, tomando la fecha actual en la zona horaria de Argentina.

### Zona Horaria (UTC-3)
El procesamiento se realiza considerando la hora local de Argentina:
* `start_date=2026-06-20` representa desde las `2026-06-20 00:00:00.000` locales (UTC: `2026-06-20T03:00:00.000Z`).
* `end_date=2026-06-25` representa hasta las `2026-06-25 23:59:59.999` locales (UTC: `2026-06-26T02:59:59.999Z`).
* Las agrupaciones diarias en las tendencias coinciden con el día local del huso horario de Argentina.

---

## 2. Estructura de Respuesta JSON (200 OK)

```json
{
  "range": {
    "startDate": "2026-06-20",
    "endDate": "2026-06-25",
    "timezone": "America/Argentina/Buenos_Aires"
  },
  "generatedAt": "2026-06-26T01:30:44.264Z",
  "metrics": {
    "totalRevenue": 572500,
    "successfulPaymentsCount": 52,
    "rejectedPaymentsCount": 2,
    "pendingPaymentsCount": 0,
    "paymentRejectionRate": 3.7,
    "averageTicket": 11009.62,
    "totalCreditsApplied": 13850,
    "totalCreditsGranted": 24464,
    "creditsGrantedRate": 4.3,
    "netRevenueAfterCredits": 548036,
    "transactionStats": {
      "PAID": 52,
      "DENIED": 2,
      "PENDING": 0,
      "CANCELED": 0,
      "EXPIRED": 0,
      "FAILED": 0
    },
    "settlementStats": {
      "PENDING": 0,
      "COMPLETED": 2,
      "FAILED": 0
    },
    "settlementsPendingAmount": 0,
    "settlementsPaidAmount": 14474,
    "financialTrends": [
      {
        "date": "2026-06-20",
        "revenue": 52050.00,
        "creditsGranted": 10800.00,
        "successfulPayments": 7,
        "rejectedPayments": 2
      },
      ...
    ],
    "decisionSignals": [
      {
        "type": "REVENUE_DROP",
        "severity": "warning",
        "title": "Caída de ingresos detectada",
        "message": "Los ingresos de la segunda mitad del período disminuyeron un 83.9% comparados con la primera mitad.",
        "value": 83.9,
        "threshold": 20
      }
    ]
  }
}
```

### Glosario del Objeto `metrics`

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `totalRevenue` | `number` | Ingresos cobrados exitosamente (`amountCharged` donde status es `PAID`). |
| `successfulPaymentsCount` | `number` | Cantidad de transacciones en estado `PAID` dentro del rango. |
| `rejectedPaymentsCount` | `number` | Cantidad de transacciones en estado `DENIED` o `FAILED`. |
| `pendingPaymentsCount` | `number` | Cantidad de transacciones en estado `PENDING` en el rango. |
| `paymentRejectionRate` | `number` | Porcentaje de pagos fallidos sobre el total (`(rechazados / total) * 100`). |
| `averageTicket` | `number` | Ticket promedio de cobros aprobados (`totalRevenue / exitosos`). |
| `totalCreditsApplied` | `number` | Saldo a favor usado por usuarios para abonar viajes (`CREDIT_APPLIED`). |
| `totalCreditsGranted` | `number` | Saldo a favor devuelto/otorgado por cancelaciones o ajustes de tarifa (`CREDIT_GRANTED`). |
| `creditsGrantedRate` | `number` | Porcentaje que representan los créditos otorgados sobre la recaudación. |
| `netRevenueAfterCredits` | `number` | Ingresos netos estimados restando los créditos generados (`totalRevenue - totalCreditsGranted`). |
| `transactionStats` | `object` | Mapa con el desglose exacto de transacciones por estado. |
| `settlementStats` | `object` | Mapa con el desglose exacto de liquidaciones a choferes por estado. |
| `settlementsPendingAmount` | `number` | Monto global acumulado pendiente de transferir a choferes (no filtrado por fecha, es deuda viva). |
| `settlementsPaidAmount` | `number` | Monto ya liquidado/transferido con éxito en el período. |
| `financialTrends` | `array` | Serie de tiempo diaria ordenada cronológicamente de ingresos y créditos otorgados. |
| `decisionSignals` | `array` | Alertas precalculadas y estructuradas listas para ser procesadas o renderizadas en paneles. |

---

## 3. Respuestas de Error Comunes

* **`400 Bad Request`**:
  * Formato de fecha inválido o fechas imposibles.
  * `start_date` posterior a `end_date`.
* **`401 Unauthorized`**:
  * Falta el header `Authorization` o la API Key no es válida.
* **`403 Forbidden`**:
  * Se intentó consumir el endpoint desde una sesión de Clerk estándar de pasajero o chofer sin clave.
  * Se intentó realizar una llamada de escritura (`POST`, `PUT`, `DELETE`).
* **`500 Internal Server Error`**:
  * Error en la conexión o consulta a la base de datos PostgreSQL.

---

## 4. Prompt para el Agente de la Analytics App

A continuación se presenta el prompt optimizado para que el desarrollador o agente de **Analytics App** pueda implementar la integración y cruzar los datos.

```markdown
# Contexto de Integración: Analytics Dashboard y Payments App

Estamos en la Etapa 3 del ecosistema de WeShuttle, conectando las aplicaciones reales.
Tu objetivo es integrar el Analytics Dashboard con el nuevo endpoint financiero expuesto por Payments App para construir tableros y disparar conclusiones de negocio más amplias.

## El Endpoint de Payments App

*   **URL:** `GET http://localhost:3000/api/analytics/metrics` (en producción se consume a la URL del microservicio de pagos).
*   **Seguridad:** Requiere header `Authorization: Bearer <ANALYTICS_API_KEY>`. La clave en desarrollo está configurada como: `clave_exclusiva_analisis_dashboard_read_only` (no la expongas en el cliente Web frontend).
*   **Parámetros:** Acepta de forma opcional `start_date` y `end_date` en formato `YYYY-MM-DD` (zona horaria local Argentina UTC-3). Fallback: últimos 15 días.

## Tareas Esperadas en Analytics App

1.  **Consumo Seguro Backend-to-Backend:**
    *   Crea una ruta interna o servicio en Analytics App para consultar `GET /api/analytics/metrics` del Payments App utilizando la clave `ANALYTICS_API_KEY` guardada de forma segura en las variables de entorno de tu servidor backend.
    *   **Nunca** hagas la llamada directamente desde el navegador de Clerk para no exponer la API Key.
2.  **Renderizado del Dashboard Financiero:**
    *   Muestra los KPI clave: Ingresos Totales (`totalRevenue`), Ticket Promedio (`averageTicket`), Tasa de Rechazo (`paymentRejectionRate`), Créditos Otorgados (`totalCreditsGranted`) y Deuda Pendiente de Liquidar (`settlementsPendingAmount`).
    *   Dibuja un gráfico de líneas para la serie temporal de `financialTrends` mostrando la evolución de la recaudación versus los créditos devueltos.
3.  **Señales de Decisión (`decisionSignals`):**
    *   Muestra de forma prominente las alertas financieras estructuradas devueltas en la respuesta (por ejemplo, caídas del ingreso detectadas como `REVENUE_DROP` o tasas altas de rechazo `PAYMENT_REJECTION_RATE_HIGH`).
4.  **Cruzar con Otros Módulos (Lógica Core de Analytics):**
    *   Utiliza los datos financieros obtenidos de Payments App y crúzalos con la información de los otros servicios:
        *   **Rider App:** Cruza los montos cobrados con la demanda horaria y la ocupación de pools para calcular el valor de ingreso por kilómetro/asiento.
        *   **Driver App:** Compara `settlementsPendingAmount` con los viajes finalizados para alertar si hay conductores completando viajes pero con transferencias retenidas.
        *   **Feedback App:** Correlaciona la tasa de rechazo de cobros con malas calificaciones de usuarios en las reservas correspondientes.

Usa esta información para diseñar e implementar la conexión de forma segura y robusta.
```
