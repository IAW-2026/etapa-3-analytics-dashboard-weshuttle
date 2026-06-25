# WeShuttle - Analytics Dashboard

## 1. Link al deploy de producción
**🔗 https://etapa-3-analytics-dashboard-weshuttle.vercel.app** *(o la URL de producción correspondiente a su despliegue)*

---

## 2. Listado de usuarios disponibles

| Perfil | Email | Contraseña | Vistas Accesibles |
| :--- | :--- | :--- | :--- |
| **Administrador** | admin+clerk_test@iaw.com | iawuser# | Acceso Completo (Dashboard, Ratings, Riders, Drivers, Settings) |

*Nota: La aplicación está restringida exclusivamente para administradores. Cualquier otro rol (como Pasajero o Conductor) que intente ingresar será rechazado y redireccionado automáticamente a la pantalla de `/unauthorized`.*

---

## 3. Instrucciones para utilizar la aplicación

1. Ingrese al enlace del dashboard.
2. Inicie sesión mediante la ventana de autenticación corporativa provista por **Clerk**.
3. Utilice las credenciales de **Administrador** provistas anteriormente. Si ingresa con otra cuenta sin privilegios de administrador, el sistema lo redireccionará a una pantalla informativa de acceso no autorizado (`/unauthorized`).
4. Una vez dentro, explore las distintas secciones navegando a través del menú lateral:
   * **Dashboard:** Vista consolidada de reservas totales, usuarios activos, finanzas y gráficos integrados de demanda y estado.
   * **Ratings:** Auditoría en tiempo real de calificaciones, comentarios críticos (de 1 y 2 estrellas) y rankings de usuarios.
   * **Riders:** Métricas operativas de pasajeros, destinos más elegidos y segmentación de usuarios (VIP, en riesgo).
   * **Drivers:** Análisis de reputación y calidad del servicio del plantel de choferes.
   * **Settings:** Configuración visual para alternar cómodamente entre el modo claro y modo oscuro.

---

## 4. Descripción de la Aplicación y Detalles Estéticos

El **WeShuttle Analytics Dashboard** es una central inteligente de monitoreo consolidado diseñada para brindar visibilidad en tiempo real a los administradores de la plataforma. La aplicación recopila y unifica datos clave de reputación, demanda y finanzas provenientes directamente de las aplicaciones satélites del ecosistema (*Rider App* y *Feedback App*).

### Aspectos Destacados y Detalles Estéticos:
* **Control de Tema Visual (Light / Dark Mode):** Soporte completo para modo oscuro y modo claro desde la sección de configuración, adaptando los contrastes de textos y gráficos para asegurar la legibilidad del operador.
* **Micro-animaciones y Visualizaciones Dinámicas:** Gráficos adaptativos y fluidos utilizando la librería **Recharts** (con aceleración por hardware en tooltips y cursores SVG) para visualizar tendencias sin interrupciones.
* **Resiliencia ante Caídas (Tolerance Failover):** Cuenta con un sistema de estado de red. Si algún microservicio está temporalmente caído o incomunicado, el dashboard lo detecta y muestra indicadores visuales de `Offline` en la cabecera, continuando su funcionamiento con los datos disponibles en lugar de colapsar la aplicación.

---

## 5. Captura de Datos y Funcionamiento en Tiempo Real

A diferencia de las demás aplicaciones del ecosistema, esta app no utiliza una base de datos propia. Toda la información se recopila y consolida en tiempo real mediante peticiones directas (API endpoints) a los microservicios externos (Rider App y Feedback App), cruzando datos de reservas, transacciones e historial de feedback.

### Seguridad en la Integración:
* Todas las llamadas a las APIs externas se protegen mediante el envío de cabeceras de autorización en servidor (`Authorization: Bearer <Key>`), garantizando que la extracción de datos sensibles esté restringida al dashboard autorizado.

---

## 6. Limitaciones de la Aplicación y Decisiones de Diseño

* **Decisión de Diseño de Arquitectura Sin Base de Datos:** Por motivos de diseño práctico, optimización de costos y consistencia de datos, se decidió prescindir de una base de datos independiente para el dashboard. En su lugar, se optó por un modelo de agregación en tiempo real. Esto elimina la necesidad de sincronización de datos redundantes (evitando problemas de inconsistencia o desfajes de información entre bases de datos) y reduce drásticamente el costo de infraestructura y desarrollo del proyecto.

