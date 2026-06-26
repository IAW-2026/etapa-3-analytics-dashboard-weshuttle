web application/stitch/projects/18305270878125694891/screens/1bba2c7b0c524c6fa8333f34eb70d7ee
# Guía de Estilo Maestra: WeShuttle (Professional Corporate Identity)

Este documento centraliza la identidad visual de WeShuttle para asegurar la consistencia en todas las aplicaciones y plataformas del ecosistema.

---

## 1. Fundamentos de Marca
- **Nombre:** WeShuttle
- **Personalidad:** Profesional, confiable, eficiente y moderna.
- **Voz:** Directa y orientada al servicio corporativo.

---

## 2. Paleta de Colores (Design Tokens)

### Colores Primarios (Jerarquía y Énfasis)
- **Midnight Blue (#0A192F):** Usado para el logo, botones principales, encabezados y estados activos. Es el color que proyecta autoridad y confianza.
- **Slate Gray (#4B5563):** Usado para texto secundario, iconos inactivos y subtítulos.

### Colores de Superficie y Fondo
- **Surface (#F7F9FB):** Fondo principal de las aplicaciones (gris muy claro azulado).
- **Surface Container Lowest (#FFFFFF):** Fondo de tarjetas (cards), campos de entrada y la barra de navegación superior.
- **Outline (#D8DADC):** Color para bordes sutiles y separadores.

### Colores Funcionales (Estados)
- **Success (Confirmado/Completado):** Verde esmeralda (#10B981) con fondos suaves (#ECFDF5).
- **Warning (Retrasado/Pendiente):** Ámbar (#F59E0B) con fondos suaves (#FFFBEB).
- **Error (Cancelado):** Rojo funcional (#EF4444) con fondos suaves (#FEF2F2).
- **Info:** Azul suave (#EFF6FF).

---

## 3. Tipografía y Escala
La fuente principal es **Inter**.

- **Display Large (32px, Bold):** Títulos de pantallas y secciones principales.
- **Headline Medium (24px, Extra-Bold):** Marca/Logo (en cursiva).
- **Body Medium (16px, Regular):** Párrafos y descripciones.
- **Label Bold (14px, Bold):** Enlaces de navegación, etiquetas de botones y encabezados de tabla.
- **Label Small (12px, Bold/Semi-Bold):** Micro-copy, badges y texto de apoyo.

---

## 4. Sistema de Iconos y Emojis

### Iconografía Lineal (Material Symbols/Icons)
Se prefieren iconos limpios y minimalistas:
- `local_shipping` / `directions_bus`: Para unidades y logística.
- `map` / `location_on`: Para destinos y rutas.
- `calendar_today` / `schedule`: Para fechas y horarios.
- `notifications`: Para alertas.
- `person`: Para perfiles de usuario.

### Uso de Emojis (Contexto Visual)
Usar con moderación para humanizar la interfaz sin perder el tono profesional:
- 🚐 **Unidades:** Para referirse a la flota.
- 📍 **Ubicación:** En campos de dirección o mapas.
- ✅ **Confirmación:** En estados positivos.
- 🕒 **Tiempo:** Para estimaciones de llegada.
- ⭐ **Calificación:** Para reputación de conductores.

---

## 5. Componentes y Estilo Visual

### Radio de Borde (Rounding)
- **Cards y Contenedores grandes:** `12px`.
- **Botones e Inputs:** `8px`.
- **Badges y Avatares:** Circular (`full`).

### Sombras (Elevation)
- **Shadow-SM:** Aplicada en la TopNavBar y tarjetas para dar una leve profundidad sobre el fondo gris claro.

---

## 6. Ejemplo de Aplicación (Quick Reference)

| Elemento | Estilo Aplicado |
| :--- | :--- |
| **Botón Primario** | Fondo `Midnight Blue`, Texto Blanco, Radio `8px`, Bold. |
| **Tarjeta (Card)** | Fondo `White`, Borde `Outline`, Sombra `SM`, Radio `12px`. |
| **Navegación Activa** | Texto `Midnight Blue`, Borde Inferior `2px`. |
| **Input Field** | Altura `56px`, Icono a la izquierda, Borde `Outline`. |

---
*Este documento es dinámico y debe ser consultado antes de implementar nuevas pantallas en el ecosistema WeShuttle.*